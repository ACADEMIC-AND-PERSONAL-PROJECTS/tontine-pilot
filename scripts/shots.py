"""Page-by-page screenshots for the README assets."""
import os
import re
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3101"
OUT = "assets/screenshots"
EMAIL = os.environ["SHOT_USER"]
PASSWORD = os.environ["SHOT_PASSWORD"]

os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(BASE, wait_until="networkidle")
    pg.wait_for_timeout(2500)
    # language gate on fresh profile -> pick French
    try:
        pg.get_by_role("button", name="Français").click(timeout=4000)
        pg.wait_for_timeout(1200)
    except Exception:
        pass

    # landing, section by section (viewport frames, no long strips)
    pg.screenshot(path=f"{OUT}/landing-hero.png")
    for sid in ["features", "film", "demo", "how"]:
        pg.eval_on_selector(f"#{sid}", "e => e.scrollIntoView({block: 'start'})")
        pg.wait_for_timeout(1800)
        pg.screenshot(path=f"{OUT}/landing-{sid}.png")
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(1200)
    pg.screenshot(path=f"{OUT}/landing-footer.png")

    # auth
    pg.goto(f"{BASE}/login", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.screenshot(path=f"{OUT}/app-login.png")

    # app (signed in as demo)
    pg.locator("input[type=email]").first.fill(EMAIL)
    pg.locator("input[type=password]").first.fill(PASSWORD)
    pg.get_by_role("button", name=re.compile("Se connecter|Sign in")).first.click()
    pg.wait_for_url("**/dashboard**", timeout=20000)
    pg.wait_for_timeout(2500)

    for route in ["dashboard", "groups", "declare", "members", "alerts", "export"]:
        pg.goto(f"{BASE}/{route}", wait_until="networkidle")
        pg.wait_for_timeout(2200)
        pg.screenshot(path=f"{OUT}/app-{route}.png")
    pg.goto(f"{BASE}/group/new", wait_until="networkidle")
    pg.wait_for_timeout(1800)
    pg.screenshot(path=f"{OUT}/app-group-new.png")

    b.close()
print("screenshots done")
