import pathlib
src = pathlib.Path("src")
order = ["core.js", "s0_intro.js", "s1_cities.js", "s2_discovery.js", "s3_robotics.js", "s4_energy.js", "s5_access.js", "s6_finale.js", "main.js"]
body = "\n".join((src / f).read_text() for f in order)
out = "/* 2046: A Design Brief - a showreel designed, animated and scored in code by Claude */\n(function(){\n'use strict';\n" + body + "\n})();\n"
pathlib.Path("dist").mkdir(exist_ok=True)
pathlib.Path("dist/reel.js").write_text(out)
print("dist/reel.js", len(out), "bytes")
