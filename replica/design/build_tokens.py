"""Genera tokens.css y tailwind.css a partir de tokens.json. Solo biblioteca estándar.

Uso: python build_tokens.py   (volver a ejecutar tras cada cambio de tokens.json)

tokens.css define las variables base con prefijo --cms-* (claro, oscuro por
preferencia del sistema y oscuro forzado con data-theme). tailwind.css mapea el
tema de Tailwind v4 a esas variables; así el modo oscuro y el rebrand solo
cambian tokens.json.
"""
import json
import os

here = os.path.dirname(os.path.abspath(__file__))
t = json.load(open(os.path.join(here, "tokens.json"), encoding="utf-8"))
HEAD = "/* Generado por build_tokens.py desde tokens.json. No editar a mano. */\n"


def rem(px):
    return "%grem" % (px / 16)


def color_vars(c, indent):
    return "".join("%s--cms-color-%s: %s;\n" % (indent, k, v) for k, v in c.items())


css = [HEAD, ":root {\n  color-scheme: light;\n", color_vars(t["color"], "  ")]
for k, v in t["font"].items():
    css.append("  --cms-font-%s: %s;\n" % (k, v))
for k, v in t["type"].items():
    css.append("  --cms-text-%s: %s;\n" % (k, rem(v["size"])))
    css.append("  --cms-text-%s-line: %s;\n" % (k, rem(v["line"])))
    css.append("  --cms-text-%s-weight: %s;\n" % (k, v["weight"]))
for i, v in enumerate(t["space"]):
    css.append("  --cms-space-%d: %s;\n" % (i, rem(v)))
for k, v in t["radius"].items():
    css.append("  --cms-radius-%s: %dpx;\n" % (k, v))
for k, v in t["shadow"].items():
    css.append("  --cms-shadow-%s: %s;\n" % (k, v))
css.append("  --cms-duration-fast: %s;\n" % t["motion"]["fast"])
css.append("  --cms-duration-base: %s;\n" % t["motion"]["base"])
css.append("  --cms-ease: %s;\n" % t["motion"]["ease"])
for k, v in t["layout"].items():
    if k != "breakpoints":
        css.append("  --cms-layout-%s: %dpx;\n" % (k, v))
css.append("}\n\n")
css.append("@media (prefers-color-scheme: dark) {\n"
           "  :root:not([data-theme=\"light\"]) {\n    color-scheme: dark;\n"
           + color_vars(t["color_dark"], "    ") + "  }\n}\n\n")
css.append(":root[data-theme=\"dark\"] {\n  color-scheme: dark;\n"
           + color_vars(t["color_dark"], "  ") + "}\n\n")
css.append("@media (prefers-reduced-motion: reduce) {\n"
           "  :root { --cms-duration-fast: 0ms; --cms-duration-base: 0ms; }\n}\n")
open(os.path.join(here, "tokens.css"), "w", encoding="utf-8", newline="\n").write("".join(css))

tw = [HEAD,
      "/* Uso en la app: @import \"tailwindcss\"; @import \"./tokens.css\"; @import \"./tailwind.css\"; */\n",
      "@theme inline {\n  --color-*: initial;\n"]
for k in t["color"]:
    tw.append("  --color-%s: var(--cms-color-%s);\n" % (k, k))
for k in t["font"]:
    tw.append("  --font-%s: var(--cms-font-%s);\n" % (k, k))
for k in t["type"]:
    tw.append("  --text-%s: var(--cms-text-%s);\n" % (k, k))
    tw.append("  --text-%s--line-height: var(--cms-text-%s-line);\n" % (k, k))
    tw.append("  --text-%s--font-weight: var(--cms-text-%s-weight);\n" % (k, k))
for k in t["radius"]:
    tw.append("  --radius-%s: var(--cms-radius-%s);\n" % (k, k))
for k in t["shadow"]:
    tw.append("  --shadow-%s: var(--cms-shadow-%s);\n" % (k, k))
tw.append("  --spacing: 0.25rem;\n")
for k, v in t["layout"]["breakpoints"].items():
    tw.append("  --breakpoint-%s: %s;\n" % (k, rem(v)))
tw.append("}\n")
open(os.path.join(here, "tailwind.css"), "w", encoding="utf-8", newline="\n").write("".join(tw))
print("tokens.css y tailwind.css generados")
