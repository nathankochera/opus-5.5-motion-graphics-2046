# Bundle core.js (the reel's shared toolkit) + a slice of the reel's own source code + hook.js
# into dist/hook.js, which exposes window.HOOK.
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
code = []
for f in ("src/s4_energy.js", "src/s3_robotics.js", "src/s2_discovery.js"):
    for ln in (ROOT / f).read_text().splitlines():
        s = ln.rstrip()
        if s.lstrip().startswith(("/*", "*")) or "=====" in s:
            continue
        code.append(s[:76])
body = (ROOT / "src/core.js").read_text() + "\nconst CODE = " + json.dumps(code[:240]) + ";\n" + (ROOT / "reels/hook.js").read_text()
out = "/* 2046 Reels hook */\n(function(){\n'use strict';\n" + body + "\n})();\n"
(ROOT / "dist/hook.js").write_text(out)
print(f"dist/hook.js ({len(out):,} bytes, {len(code[:240])} code lines)")
