import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

BASE = os.environ.get('SITE_URL', 'http://127.0.0.1:4780')
OUT = Path(__file__).resolve().parents[2] / 'swarm/work/DULCEA_FINAL/qa'
OUT.mkdir(parents=True, exist_ok=True)
ROUTES = ['/', '/tartas/', '/sobre/', '/como-encargar/', '/contacto/', '/faq/']
results = []
failures = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in [1440, 768, 390, 320]:
        context = browser.new_context(viewport={'width': width, 'height': 900}, device_scale_factor=1)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for route in ROUTES:
            response = page.goto(BASE + route, wait_until='networkidle')
            page.evaluate('document.fonts.ready')
            for y in range(0, page.evaluate('document.body.scrollHeight'), 600):
                page.evaluate('(y) => window.scrollTo({top: y, behavior: "instant"})', y)
                page.wait_for_timeout(60)
            page.wait_for_timeout(200)
            broken = page.locator('img').evaluate_all('(imgs) => imgs.filter(i => i.getClientRects().length && getComputedStyle(i).visibility !== "hidden" && (!i.complete || !i.naturalWidth)).map(i => ({src: i.currentSrc, alt: i.alt}))')
            for src in set(page.locator('img').evaluate_all('(imgs) => imgs.map(i => i.src)')):
                assert page.request.get(src).status == 200, src
            overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
            invisible = page.locator('[data-reveal]').evaluate_all('(els) => els.filter(e => getComputedStyle(e).opacity === "0").length')
            image_sources = page.locator('img').evaluate_all('(imgs) => imgs.map(i => i.currentSrc)')
            page.evaluate('window.scrollTo({top:0, behavior:"instant"})')
            name = route.strip('/') or 'inicio'
            if width in [1440, 390]:
                page.screenshot(path=str(OUT / f'{name}-{width}.png'), full_page=True)
                if route == '/':
                    page.screenshot(path=str(OUT / f'hero-{width}.png'))
            item = {'route': route, 'width': width, 'status': response.status, 'broken': broken, 'overflow': overflow, 'invisible': invisible}
            results.append(item)
            if response.status != 200 or broken or overflow or invisible or page.locator('h1').count() != 1:
                failures.append(item)
            if any('/cut/' in src or 'hero-card' in src or 'https://' in src for src in image_sources):
                failures.append({'generated_or_remote_image': route})
            links = page.locator('a[href]').evaluate_all('(links) => links.map(a => a.getAttribute("href"))')
            for href in links:
                if href.startswith('/') and urlsplit(href).path not in ROUTES:
                    failures.append({'unknown_route': href})
        page.goto(BASE + '/faq/', wait_until='networkidle')
        page.locator('summary').first.click()
        assert page.locator('details').first.get_attribute('open') is not None
        if width < 1024:
            page.locator('[data-menu-btn]').click()
            assert page.locator('#nav-menu').is_visible()
            page.keyboard.press('Escape')
            assert not page.locator('#nav-menu').is_visible()
        if errors:
            failures.extend(errors)
        context.close()
    context = browser.new_context(permissions=['clipboard-read', 'clipboard-write'])
    page = context.new_page()
    for route, prefix in [('/contacto/', 'dm'), ('/como-encargar/', 'rd')]:
        page.goto(BASE + route + '?tarta=queso', wait_until='networkidle')
        assert page.locator(f'[data-{prefix}-cake]').input_value() == 'queso'
        page.locator(f'[data-{prefix}-name]').fill('Marta')
        page.locator(f'[data-{prefix}-date]').fill('2027-05-20')
        preview = page.locator(f'[data-{prefix}-preview]').inner_text()
        assert 'Marta' in preview and '20/05/2027' in preview and 'queso' in preview
        page.locator(f'[data-{prefix}-copy]').click()
        page.wait_for_timeout(100)
        assert page.evaluate('navigator.clipboard.readText()') == preview
    context.close()
    context = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844})
    page = context.new_page()
    page.goto(BASE, wait_until='networkidle')
    assert page.locator('h1').is_visible()
    assert page.locator('video').get_attribute('controls') is not None
    context.close()
    context = browser.new_context(reduced_motion='reduce')
    page = context.new_page()
    page.goto(BASE, wait_until='networkidle')
    assert page.locator('.hero').evaluate('(el) => getComputedStyle(el).position') != 'sticky'
    assert page.locator('video').evaluate('(el) => el.paused')
    context.close()
    browser.close()
(OUT / 'checks.json').write_text(json.dumps({'pages': results, 'failures': failures}, indent=2))
assert not failures, json.dumps(failures, indent=2)
print(f'PASS: {len(results)} route/viewport checks; images, overflow, visible content, FAQ, mobile menu, both order composers, clipboard, no-JS and reduced motion.')
