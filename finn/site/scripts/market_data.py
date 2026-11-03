"""FINN local market collector. Standard library only; no AI or credentials.
Fixed public sources, bounded requests, atomic cache, one refresh at a time.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
COMPANIES = json.loads((ROOT / 'data/portfolio.json').read_text(encoding='utf-8'))
SYMBOLS = {p[0] for p in COMPANIES}
IST = timezone(timedelta(hours=5, minutes=30))
NSE = 'https://www.nseindia.com/api/corporate-announcements'
RSS = 'https://nsearchives.nseindia.com/content/RSS/Online_announcements.xml'
CACHE = ROOT / '.sites-runtime/market/snapshot.json'
MAX_BYTES = 12_000_000
REFRESH_SECONDS = 900

def iso(now=None):
    return (now or datetime.now(timezone.utc)).isoformat()

def india_date(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(IST).date().isoformat()

def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        url = urllib.parse.urlsplit(newurl)
        if url.scheme != 'https' or url.hostname != urllib.parse.urlsplit(req.full_url).hostname:
            raise ValueError('Unexpected source redirect rejected')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'FINN-Research-Prototype/0.1', 'Accept': 'application/json, application/xml, text/xml, */*'})
    # No access-control bypass, cookies, or unrestricted user-provided destinations.
    with urllib.request.build_opener(SafeRedirect).open(request, timeout=15) as response:
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError('Source exceeds size limit')
        return data

def safe_attachment(value):
    try:
        url = urllib.parse.urlsplit(str(value))
        if url.scheme == 'https' and url.hostname in {'nsearchives.nseindia.com', 'archives.nseindia.com', 'www.nseindia.com'} and not url.username and not url.password and url.port in (None, 443):
            return urllib.parse.urlunsplit(url)
    except ValueError:
        pass
    return None

def parse_nse_date(value):
    for pattern in ('%d-%b-%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(value, pattern).replace(tzinfo=IST)
        except (ValueError, TypeError):
            pass
    raise ValueError('Invalid exchange publication time')

def filing_event(symbol, title, description, stamp, url, now):
    published = parse_nse_date(stamp)
    if published > now.astimezone(IST) + timedelta(minutes=5):
        raise ValueError('Future exchange timestamp')
    url = safe_attachment(url)
    if not url:
        raise ValueError('Invalid exchange attachment URL')
    # Repeated records for one attachment collapse; corrected attachments retain new IDs.
    identity = hashlib.sha256((symbol + '|' + url).encode()).hexdigest()[:24]
    return {'id': 'nse-' + identity, 'symbol': symbol, 'title': str(title or 'Exchange disclosure')[:300],
            'summary': re.sub('<[^>]+>', ' ', str(description or 'No description supplied by exchange.'))[:5000],
            'publishedAt': published.astimezone(timezone.utc).isoformat(), 'publishedOn': published.date().isoformat(),
            'sourceId': 'nse-' + identity, 'sourceUrl': url, 'provider': 'NSE', 'fetchedAt': iso(now)}

def parse_announcements(data, now):
    rows = json.loads(data)
    if not isinstance(rows, list):
        raise ValueError('NSE response was not an announcement list')
    events, rejected = [], 0
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Invalid NSE announcement record')
        if row.get('symbol') not in SYMBOLS:
            continue
        try:
            events.append(filing_event(row['symbol'], row.get('desc'), row.get('attchmntText'), row.get('exchdisstime') or row.get('an_dt'), row.get('attchmntFile'), now))
        except ValueError:
            rejected += 1
    return events, len(rows), rejected

def normalize_name(value):
    return re.sub(r'[^a-z0-9]', '', re.sub(r'\b(limited|ltd)\.?\b', '', value.lower()))

ALIASES = {normalize_name(name): symbol for symbol, name, _ in COMPANIES}
ALIASES.update({normalize_name(name): symbol for name, symbol in [('Larsen & Toubro Limited', 'LT'), ('Pidilite Industries Limited', 'PIDILITIND'), ('Sun Pharmaceutical Industries Limited', 'SUNPHARMA'), ('Tata Power Company Limited', 'TATAPOWER'), ('Dixon Technologies (India) Limited', 'DIXON'), ('K.P.R. Mill Limited', 'KPRMILL')]})

def parse_rss(data, now):
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('Unsupported XML declaration')
    root = ET.fromstring(data)
    if root.tag != 'rss' or root.find('channel') is None:
        raise ValueError('Invalid NSE RSS feed')
    items = root.findall('./channel/item')
    events, rejected = [], 0
    for item in items:
        symbol = ALIASES.get(normalize_name(item.findtext('title', '')))
        if not symbol:
            continue
        description = item.findtext('description', '')
        title = description.split('|SUBJECT:')[-1].strip() if '|SUBJECT:' in description else 'Exchange disclosure'
        try:
            events.append(filing_event(symbol, title, description.split('|SUBJECT:')[0], item.findtext('pubDate'), item.findtext('link'), now))
        except ValueError:
            rejected += 1
    return events, len(items), rejected

def parse_prices(data, symbol, now):
    payload = json.loads(data)
    result = payload.get('chart', {}).get('result')
    if not result:
        raise ValueError('Yahoo returned no chart data')
    result = result[0]
    meta = result.get('meta', {})
    if meta.get('symbol') != symbol + '.NS' or meta.get('currency') != 'INR' or meta.get('exchangeTimezoneName') != 'Asia/Kolkata':
        raise ValueError('Price identity, currency or exchange timezone mismatch')
    quote = result['indicators']['quote'][0]
    now_ist = now.astimezone(IST)
    bars, rejected = [], 0
    for index, stamp in enumerate(result.get('timestamp', [])):
        day = datetime.fromtimestamp(stamp, IST).date()
        # Conservative finalisation buffer: never use today's session before 17:00 IST.
        if day > now_ist.date() or (day == now_ist.date() and (now_ist.hour, now_ist.minute) < (17, 0)):
            continue
        values = {key: quote.get(key, [])[index] if index < len(quote.get(key, [])) else None for key in ['open', 'high', 'low', 'close', 'volume']}
        if not all(finite(x) for x in values.values()) or min(values[k] for k in ['open','high','low','close']) <= 0 or values['volume'] < 0:
            rejected += 1
            continue
        bars.append({'date': day.isoformat(), **values})
    bars = sorted({b['date']: b for b in bars}.values(), key=lambda b: b['date'])
    if not bars:
        raise ValueError('No completed valid daily sessions')
    latest = bars[-1]
    prior = bars[-2] if len(bars) >= 2 else None
    baseline = bars[-21:-1]
    actions = []
    for kind in ('splits', 'dividends'):
        for action in result.get('events', {}).get(kind, {}).values():
            actions.append({'kind': kind, 'date': datetime.fromtimestamp(action['date'], IST).date().isoformat()})
    # Missing source rows mean adjacency cannot be established reliably; abstain.
    price_blocked = rejected > 0 or not prior or any(prior['date'] < a['date'] <= latest['date'] for a in actions)
    volume_blocked = rejected > 0 or len(baseline) != 20 or any(a['kind'] == 'splits' and baseline[0]['date'] <= a['date'] <= latest['date'] for a in actions)
    average = sum(b['volume'] for b in baseline) / 20 if len(baseline) == 20 else None
    return {'symbol': symbol, 'provider': 'Yahoo Finance', 'currency': 'INR', 'sessionDate': latest['date'],
            'close': latest['close'], 'volume': latest['volume'], 'previousClose': prior['close'] if prior else None,
            'priceChangePct': None if price_blocked else (latest['close'] / prior['close'] - 1) * 100,
            'volumeRatio': None if volume_blocked or not average else latest['volume'] / average,
            'averageVolume20': average, 'baselineSessions': len(baseline), 'baselineDates': [b['date'] for b in baseline],
            'corporateActions': actions, 'priceSuppressed': bool(price_blocked), 'volumeSuppressed': bool(volume_blocked),
            'excludedInvalidRows': rejected, 'bars': bars, 'fetchedAt': iso(now),
            'basis': 'Yahoo daily OHLC close (not dividend-adjusted Adj Close); provider may split-adjust historical bars.',
            'sourceUrl': f'https://finance.yahoo.com/quote/{symbol}.NS/history/'}

def merge_events(old, fresh, now):
    cutoff = (now - timedelta(days=90)).isoformat()[:10]
    merged = {e['id']: e for e in old if e['publishedOn'] >= cutoff}
    merged.update({e['id']: e for e in fresh})
    return sorted(merged.values(), key=lambda e: e['publishedAt'], reverse=True)[:10000]

def error_text(error):
    if isinstance(error, urllib.error.HTTPError):
        return f'Source returned HTTP {error.code}; no access controls bypassed.'
    return str(error)[:240]

class Collector:
    def __init__(self, path=CACHE, fetcher=fetch):
        self.path, self.fetcher = path, fetcher
        self.lock, self.run_lock = threading.Lock(), threading.Lock()
        self.refreshing = False
        self.state = {'schemaVersion': 1, 'filings': [], 'quotes': {}, 'sources': {}, 'lastAttemptAt': None, 'lastCompletedAt': None}
        try:
            saved = json.loads(path.read_text(encoding='utf-8'))
            if saved.get('schemaVersion') == 1:
                self.state = saved
        except (FileNotFoundError, ValueError, OSError):
            pass

    def snapshot(self):
        with self.lock:
            return {**self.state, 'refreshing': self.refreshing, 'serverTime': iso(), 'refreshIntervalSeconds': REFRESH_SECONDS}

    def start(self):
        if not self.run_lock.acquire(blocking=False):
            return False
        with self.lock:
            last = self.state.get('lastAttemptAt')
            if last and (datetime.now(timezone.utc) - datetime.fromisoformat(last)).total_seconds() < 60:
                self.run_lock.release()
                return False
            self.refreshing = True
        threading.Thread(target=self.refresh, kwargs={'acquired': True}, daemon=True).start()
        return True

    def refresh(self, acquired=False):
        if not acquired and not self.run_lock.acquire(blocking=False):
            return
        now = datetime.now(timezone.utc)
        with self.lock:
            self.refreshing = True
            working = json.loads(json.dumps(self.state))
        working['lastAttemptAt'] = iso(now)
        try:
            def prices(symbol):
                url = f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}.NS?range=3mo&interval=1d&events=splits%2Cdiv'
                return parse_prices(self.fetcher(url), symbol, now)
            def announcements():
                start = now.astimezone(IST) - timedelta(days=7)
                url = NSE + '?' + urllib.parse.urlencode({'index': 'equities', 'from_date': start.strftime('%d-%m-%Y'), 'to_date': now.astimezone(IST).strftime('%d-%m-%Y')})
                fallback = None
                try:
                    events, total, rejected = parse_announcements(self.fetcher(url), now)
                    route = 'NSE date-filtered announcement endpoint'
                except Exception as error:
                    fallback = error_text(error)
                    events, total, rejected = parse_rss(self.fetcher(RSS), now)
                    route, url = 'NSE RSS rolling window (backfill unavailable)', RSS
                return events, {'status': 'partial' if fallback or rejected else 'ok', 'lastSuccessAt': iso(now), 'lastAttemptAt': iso(now),
                                'route': route, 'url': url, 'requestedFrom': start.date().isoformat(), 'requestedTo': now.astimezone(IST).date().isoformat(),
                                'receivedCount': total, 'matchedCount': len(events), 'rejectedCount': rejected, 'error': fallback,
                                'coverage': 'Public feed only; completeness is not guaranteed. RSS fallback cannot establish full date-range coverage.'}
            with ThreadPoolExecutor(max_workers=4) as pool:
                futures = {pool.submit(prices, symbol): symbol for symbol in sorted(SYMBOLS)}
                futures[pool.submit(announcements)] = 'NSE'
                for future in as_completed(futures):
                    name = futures[future]
                    previous = working['sources'].get(name, {})
                    try:
                        value = future.result()
                        if name == 'NSE':
                            events, status = value
                            working['filings'] = merge_events(working['filings'], events, now)
                            working['sources'][name] = status
                        else:
                            working['quotes'][name] = value
                            working['sources'][name] = {'status': 'ok', 'lastAttemptAt': iso(now), 'lastSuccessAt': iso(now), 'error': None}
                    except Exception as error:
                        working['sources'][name] = {**previous, 'status': 'error', 'lastAttemptAt': iso(now), 'error': error_text(error)}
            working['lastCompletedAt'] = iso()
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temp = self.path.with_suffix('.tmp')
            temp.write_text(json.dumps(working, ensure_ascii=False, allow_nan=False), encoding='utf-8')
            temp.replace(self.path)
            with self.lock:
                self.state = working
            print(json.dumps({'completedAt': working['lastCompletedAt'], 'quotes': len(working['quotes']), 'filings': len(working['filings']), 'errors': {k: v.get('error') for k,v in working['sources'].items() if v['status'] == 'error'}}), flush=True)
        except Exception as error:
            with self.lock:
                self.state['lastAttemptAt'] = iso(now)
                self.state['collectorError'] = error_text(error)
            print('Refresh failed: ' + error_text(error), flush=True)
        finally:
            with self.lock:
                self.refreshing = False
            self.run_lock.release()


def serve():
    collector = Collector()
    class Handler(BaseHTTPRequestHandler):
        def send_json(self, status, value):
            body = json.dumps(value, ensure_ascii=False, allow_nan=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        def valid_request(self):
            # Loopback only, exact Host, no cross-origin mutation. No arbitrary URL proxy.
            if self.headers.get('Host') not in ('127.0.0.1:8788', 'localhost:8788'):
                return False
            origin = self.headers.get('Origin')
            return origin is None or origin in ('http://127.0.0.1:5173', 'http://localhost:5173')
        def do_GET(self):
            if not self.valid_request():
                return self.send_json(403, {'error': 'Origin or host rejected'})
            if self.path != '/snapshot':
                return self.send_json(404, {'error': 'Not found'})
            return self.send_json(200, collector.snapshot())
        def do_POST(self):
            if not self.valid_request():
                return self.send_json(403, {'error': 'Origin or host rejected'})
            if self.path != '/refresh':
                return self.send_json(404, {'error': 'Not found'})
            return self.send_json(202, {'started': collector.start(), **collector.snapshot()})
        def log_message(self, *_):
            pass
    server = ThreadingHTTPServer(('127.0.0.1', 8788), Handler)
    def schedule():
        while True:
            collector.start()
            time.sleep(REFRESH_SECONDS)
    threading.Thread(target=schedule, daemon=True).start()
    print('FINN market collector: http://127.0.0.1:8788 (refresh every 15 minutes)', flush=True)
    server.serve_forever()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--serve', action='store_true')
    args = parser.parse_args()
    if args.serve:
        serve()
    else:
        Collector().refresh()
