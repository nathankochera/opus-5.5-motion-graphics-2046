# python3 preview.py out.png t1 t2 ...   -> contact sheet (4 per row) of frames at those times
import sys, asyncio, base64, io, os, time
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont
async def main():
    os.makedirs("out", exist_ok=True)
    out = sys.argv[1]; times = [float(x) for x in sys.argv[2:]]
    full = os.environ.get("FULL")  # save full-size frames too
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--disable-gpu"])
        pg = await b.new_page(viewport={"width": 1920, "height": 1080})
        errs = []
        pg.on("console", lambda m: print("console:", m.text) if m.type in ("error","warning") else None)
        pg.on("pageerror", lambda e: (errs.append(str(e)), print("pageerror:", e)))
        await pg.goto("file://" + os.path.abspath("render.html"))
        await pg.evaluate("window.ready")
        ims = []
        for t in times:
            t0 = time.time()
            d = await pg.evaluate(f"(() => {{ REEL.render({t}); return document.getElementById('c').toDataURL('image/png'); }})()")
            im = Image.open(io.BytesIO(base64.b64decode(d.split(",")[1]))).convert("RGB")
            print(f"t={t:6.2f}  {1000*(time.time()-t0):6.0f} ms")
            if full: im.save(f"out/f_{t:05.2f}.png")
            ims.append((t, im))
        await b.close()
    tw, th = 640, 360
    cols = 3 if len(ims) > 4 else len(ims)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * 6, rows * th + (rows + 1) * 6), (40, 40, 40))
    dr = ImageDraw.Draw(sheet)
    for k, (t, im) in enumerate(ims):
        x = 6 + (k % cols) * (tw + 6); y = 6 + (k // cols) * (th + 6)
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
        dr.rectangle([x, y, x + 62, y + 18], fill=(0, 0, 0)); dr.text((x + 4, y + 3), f"{t:.2f}s", fill=(255, 255, 0))
    sheet.save(out)
asyncio.run(main())
