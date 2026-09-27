# Render every frame of the 9:16 Reels cut (hook + letterboxed reel) to JPEG, two pages in parallel.
import asyncio, base64, os, sys, time
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
FPS, DUR = 30, 34.0
N = int(round(DUR * FPS)); WORKERS = 2
OUT = os.path.join(HERE, "..", "out", "reels", "frames"); os.makedirs(OUT, exist_ok=True)
async def worker(b, k, done):
    pg = await b.new_page(viewport={"width": 1080, "height": 1920})
    pg.on("pageerror", lambda e: print("pageerror:", e, flush=True))
    await pg.goto("file://" + os.path.join(HERE, "reels.html"))
    await pg.evaluate("window.ready")
    for i in range(k, N, WORKERS):
        d = await pg.evaluate(f"(() => {{ frame({i / FPS}); return document.getElementById('v').toDataURL('image/jpeg', 0.97); }})()")
        with open(f"{OUT}/f_{i:05d}.jpg", "wb") as f: f.write(base64.b64decode(d.split(",", 1)[1]))
        done[0] += 1
async def main():
    t0 = time.time(); done = [0]
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--disable-gpu"])
        tasks = [asyncio.create_task(worker(b, k, done)) for k in range(WORKERS)]
        while not all(t.done() for t in tasks):
            await asyncio.sleep(15); print(f"{done[0]}/{N} frames, {time.time() - t0:.0f}s", flush=True)
        for t in tasks: t.result()
        await b.close()
    print(f"done {done[0]} frames in {time.time() - t0:.0f}s", flush=True)
asyncio.run(main())
