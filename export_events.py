# Pull the timeline (cuts, odometer ticks, robot locks, discovery hits, ...) out of the
# renderer into events.json, so the score is timed from the same clock as the picture.
import asyncio, json, os
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--disable-gpu"])
        pg = await b.new_page()
        await pg.goto("file://" + os.path.abspath("render.html"))
        await pg.evaluate("window.ready")
        ev = await pg.evaluate("REEL.events()")
        await b.close()
    json.dump(ev, open("events.json", "w"))
    print("events.json:", ", ".join(f"{k} ({len(v)})" if isinstance(v, list) else f"{k} ({v})" for k, v in ev.items()))

asyncio.run(main())
