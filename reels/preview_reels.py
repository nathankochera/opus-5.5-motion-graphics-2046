# python3 reels/preview_reels.py out/sheet.png t1 t2 ...  -> contact sheet of 9:16 frames (FULL=1 also saves full frames)
import sys, asyncio, base64, io, os
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
async def main():
    out = sys.argv[1]; times = [float(x) for x in sys.argv[2:]]
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--disable-gpu"])
        pg = await b.new_page(viewport={"width": 1080, "height": 1920})
        pg.on("pageerror", lambda e: print("pageerror:", e))
        pg.on("console", lambda m: print("console:", m.text) if m.type == "error" else None)
        await pg.goto("file://" + os.path.join(HERE, "reels.html"))
        await pg.evaluate("window.ready")
        ims = []
        for t in times:
            d = await pg.evaluate(f"(() => {{ frame({t}); return document.getElementById('v').toDataURL('image/png'); }})()")
            im = Image.open(io.BytesIO(base64.b64decode(d.split(",")[1]))).convert("RGB")
            if os.environ.get("FULL"): im.save(os.path.join(os.path.dirname(out), f"v_{t:05.2f}.png"))
            ims.append((t, im))
        await b.close()
    cols = min(6, len(ims)); tw, th = 270, 480; rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + 6) + 6, rows * (th + 6) + 6), (60, 60, 60)); dr = ImageDraw.Draw(sheet)
    for k, (t, im) in enumerate(ims):
        x = 6 + (k % cols) * (tw + 6); y = 6 + (k // cols) * (th + 6)
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y)); dr.rectangle([x, y, x + 50, y + 14], fill=(0, 0, 0)); dr.text((x + 3, y + 2), f"{t:.2f}s", fill=(255, 255, 0))
    sheet.save(out)
asyncio.run(main())
