# Render every frame of the reel to JPEG, split across parallel headless pages.
import asyncio, base64, os, sys, time
from playwright.async_api import async_playwright
FPS = int(os.environ.get("FPS", 60)); DUR = 30.0
N = int(DUR * FPS)
START = int(os.environ.get("START", 0)); END = int(os.environ.get("END", N))
WORKERS = int(os.environ.get("WORKERS", 2)); Q = float(os.environ.get("Q", 0.95))
OUT = os.environ.get("OUTDIR", "frames")
os.makedirs(OUT, exist_ok=True)
async def worker(b, k, done):
    pg = await b.new_page(viewport={"width": 1920, "height": 1080})
    pg.on("pageerror", lambda e: print("pageerror:", e, flush=True))
    await pg.goto("file://" + os.path.abspath("render.html") + os.environ.get("HASH", ""))
    await pg.evaluate("window.ready")
    for i in range(START + k, END, WORKERS):
        d = await pg.evaluate(f"(() => {{ REEL.render({i / FPS}); return document.getElementById('c').toDataURL('image/jpeg', {Q}); }})()")
        with open(f"{OUT}/f_{i:05d}.jpg", "wb") as f:
            f.write(base64.b64decode(d.split(",", 1)[1]))
        done[0] += 1
async def main():
    t0 = time.time(); done = [0]
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--disable-gpu"])
        tasks = [asyncio.create_task(worker(b, k, done)) for k in range(WORKERS)]
        total = END - START
        while not all(t.done() for t in tasks):
            await asyncio.sleep(10)
            el = time.time() - t0
            print(f"{done[0]}/{total} frames, {el:.0f}s elapsed, {el / max(1, done[0]) * 1000:.0f} ms/frame", flush=True)
        for t in tasks: t.result()
        await b.close()
    print(f"done {done[0]} frames in {time.time() - t0:.0f}s", flush=True)
asyncio.run(main())
