"""Comprueba el contraste del modo oscuro con el contrast.py de replica-design.
Uso: python check_dark.py [ruta/a/contrast.py]"""
import json, os, subprocess, sys, tempfile
here = os.path.dirname(os.path.abspath(__file__))
contrast = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "contrast.py")
t = json.load(open(os.path.join(here, "tokens.json"), encoding="utf-8"))
fd, tmp = tempfile.mkstemp(suffix=".json")
with os.fdopen(fd, "w", encoding="utf-8") as fh:
    json.dump({"color": t["color_dark"], "pairs": t["pairs"]}, fh)
try:
    sys.exit(subprocess.call([sys.executable, contrast, tmp]))
finally:
    os.remove(tmp)
