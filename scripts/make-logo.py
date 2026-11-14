"""
scripts/make-logo.py — le logo de Gaïa, d'après sa géométrie
============================================================
Le G de Gaïa et son étoile, selon la charte Astræos (celle du logo de Céleste,
dont le C devient ici un G) : un arc épais à l'encre, ouvert en haut à droite,
fermé par la barre du G, et une étoile à quatre branches dorée dans
l'ouverture. Ni ombre, ni contour, ni dégradé, ni déformation ; l'interface
remplace l'encre (#e8ecf2) et l'or (#f2b84b) par ceux du thème.

Écrit public/favicon.svg (le symbole sur sa tuile Nuit), public/gaia.svg (le
symbole seul) et src/components/gaia-mark.json (ses éléments, pour le
composant Logo). Lancer : python scripts/make-logo.py
"""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INK, GOLD, NIGHT = "#e8ecf2", "#f2b84b", "#0b0f17"

# le G : un arc autour de (CX, CY), RHO son rayon moyen, STROKE d'épaisseur, de l'angle START (en haut à droite) à
# l'angle END (à droite, au milieu) en passant par le haut, la gauche et le bas (degrés depuis l'est, y vers le bas) ;
# puis sa barre, de la fin de l'arc vers le centre, sur BAR de la largeur du rayon
CX, CY, RHO, STROKE, START, END, BAR = 44.0, 52.0, 29.0, 11.0, -50.0, 8.0, 0.55
# l'étoile : quatre branches, LONG du centre à une pointe, SHORT à un creux, dans l'ouverture du G
LONG, SHORT, STAR_ANGLE, STAR_RADIUS = 13.0, 3.2, -15.0, 38.0


def _n(value):
    return f"{value:.2f}".rstrip("0").rstrip(".")


def _at(angle_deg, radius=RHO):
    a = math.radians(angle_deg)
    return CX + radius * math.cos(a), CY + radius * math.sin(a)


def mark():
    """Les éléments du symbole : l'arc et la barre du G (un chemin), l'étoile (un polygone)."""
    x0, y0 = _at(START)
    x1, y1 = _at(END)
    bx = CX + RHO * (1 - BAR) * math.cos(math.radians(END))
    # l'arc va de START à END dans le sens inverse des aiguilles d'une montre (par le haut et la gauche) : grand arc
    path = (f"M{_n(x0)} {_n(y0)} A{_n(RHO)} {_n(RHO)} 0 1 0 {_n(x1)} {_n(y1)} "
            f"L{_n(bx)} {_n(y1)}")
    sx, sy = _at(STAR_ANGLE, STAR_RADIUS)
    pts = []
    for i in range(8):
        a = math.radians(-90 + 45 * i)
        r = LONG if i % 2 == 0 else SHORT
        pts.append(f"{_n(sx + r * math.cos(a))},{_n(sy + r * math.sin(a))}")
    return {"letter": path, "stroke": STROKE, "star": " ".join(pts)}


def svg(tile):
    m = mark()
    body = (f'<path fill="none" stroke="{INK}" stroke-width="{_n(m["stroke"])}" stroke-linecap="round" '
            f'stroke-linejoin="round" d="{m["letter"]}"/><polygon fill="{GOLD}" points="{m["star"]}"/>')
    back = f'<rect width="100" height="100" rx="22" fill="{NIGHT}"/>' if tile else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Gaïa">'
            f'<title>Gaïa</title>{back}{body}</svg>\n')


def main():
    for name, tile in (("favicon.svg", True), ("gaia.svg", False)):
        with open(os.path.join(ROOT, "public", name), "w", encoding="utf-8", newline="\n") as f:
            f.write(svg(tile))
    with open(os.path.join(ROOT, "src", "components", "gaia-mark.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(mark(), f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("écrit : public/favicon.svg, public/gaia.svg, src/components/gaia-mark.json")


if __name__ == "__main__":
    main()
