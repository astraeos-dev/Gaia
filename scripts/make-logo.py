"""
scripts/make-logo.py — le logo de Gaïa, d'après sa géométrie
============================================================
Le G de Gaïa et son étoile, selon la charte Astræos (celle du logo de Céleste,
dont le C devient ici un G) : un arc épais à l'encre, ouvert en haut à droite,
fermé par la barre du G, et une étoile à quatre branches dorée dans
l'ouverture. Ni ombre, ni contour, ni dégradé, ni déformation ; l'interface
remplace l'encre (#e8ecf2) et l'or (#f2b84b) par ceux du thème.

Écrit public/favicon.svg (le symbole sur sa tuile Nuit), public/gaia.svg (le
symbole seul), src/components/gaia-mark.json (ses éléments, pour le
composant Logo), et les logos des projets dans public/projets/, dessinés de la
même façon. Lancer : python scripts/make-logo.py
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
# le point d'or des logos de projets, à la place de l'étoile du G et du C de Céleste, DOT de rayon
DOT = 7.0


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


# Les logos des projets, dans la même grammaire : la lettre de chacun en traits épais à l'encre (STROKE, bouts et
# angles arrondis), un point d'or, la tuile Nuit. Céleste garde le sien, dessiné dans son dépôt.
#   letters : les tracés de la lettre (chemins SVG, en traits) ; dot : le centre du point d'or
PROJECT_LOGOS = {
    # Ganymède : le gamma de Γανυμήδης (le G latin est celui de Gaïa), le point sous sa barre
    "ganymede": {"letters": ["M36 78 L36 24 L70 24"], "dot": (64, 54)},
    # Céleste pour Home Assistant : le C de Céleste et son point sous le toit de la maison, assez loin des bouts
    # du C pour que les deux respirent
    "celeste-ha": {"letters": ["M20 44 L50 18 L80 44", "M60.4 51.6 A17 17 0 1 0 60.4 72.4"], "dot": (72, 62)},
    # Helios : le H, et le Soleil en point d'or levé à sa droite
    "helios": {"letters": ["M26 26 L26 76", "M58 26 L58 76", "M26 51 L58 51"], "dot": (78, 30)},
    # Météo & Confort : le M, le point à sa droite
    "meteo-confort": {"letters": ["M20 76 L20 28 L41 58 L62 28 L62 76"], "dot": (80, 30)},
    # astraeos-astro : le A ouvert en haut, son point à la pointe
    "astraeos-astro": {"letters": ["M24 80 L42.5 36", "M57.5 36 L76 80", "M33 62 L67 62"], "dot": (50, 22)},
}


def project_svg(name, logo):
    body = "".join(f'<path fill="none" stroke="{INK}" stroke-width="{_n(STROKE)}" stroke-linecap="round" '
                   f'stroke-linejoin="round" d="{d}"/>' for d in logo["letters"])
    x, y = logo["dot"]
    body += f'<circle cx="{_n(x)}" cy="{_n(y)}" r="{_n(DOT)}" fill="{GOLD}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="{name}">'
            f'<title>{name}</title><rect width="100" height="100" rx="22" fill="{NIGHT}"/>{body}</svg>\n')


def main():
    os.makedirs(os.path.join(ROOT, "public", "projets"), exist_ok=True)
    for slug, logo in PROJECT_LOGOS.items():
        with open(os.path.join(ROOT, "public", "projets", f"{slug}.svg"), "w", encoding="utf-8", newline="\n") as f:
            f.write(project_svg(slug, logo))
    for name, tile in (("favicon.svg", True), ("gaia.svg", False)):
        with open(os.path.join(ROOT, "public", name), "w", encoding="utf-8", newline="\n") as f:
            f.write(svg(tile))
    with open(os.path.join(ROOT, "src", "components", "gaia-mark.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(mark(), f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("écrit : public/favicon.svg, public/gaia.svg, src/components/gaia-mark.json et "
          + ", ".join(f"public/projets/{slug}.svg" for slug in PROJECT_LOGOS))


if __name__ == "__main__":
    main()
