# Inline the fonts, the renderer bundle and the score into one self-contained HTML player.
import base64, pathlib

FONTS = [
    ("Schibsted Grotesk", 800, "normal", "schibsted-grotesk-latin-800-normal.woff2"),
    ("Schibsted Grotesk", 700, "normal", "schibsted-grotesk-latin-700-normal.woff2"),
    ("Bodoni Moda", 500, "italic", "bodoni-moda-latin-500-italic.woff2"),
    ("Martian Mono", 400, "normal", "martian-mono-latin-400-normal.woff2"),
    ("Martian Mono", 500, "normal", "martian-mono-latin-500-normal.woff2"),
]
b64 = lambda p: base64.b64encode(pathlib.Path(p).read_bytes()).decode()
css = "\n".join(
    f'@font-face{{font-family:"{fam}";src:url(data:font/woff2;base64,{b64("fonts/" + fn)}) format("woff2");'
    f"font-weight:{w};font-style:{st};font-display:block}}"
    for fam, w, st, fn in FONTS
)
page = (pathlib.Path("player_src.html").read_text()
        .replace("/*FONTS*/", css)
        .replace("/*REEL*/", pathlib.Path("dist/reel.js").read_text())
        .replace("__AUDIO__", b64("out/score.mp3")))
pathlib.Path("out/2046-showreel-player.html").write_text(page)
print(f"out/2046-showreel-player.html ({len(page) / 1e6:.1f} MB)")
