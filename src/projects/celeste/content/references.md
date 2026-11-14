Chaque valeur calculée par Céleste se vérifie contre une référence (JPL Horizons, USNO, NASA) dans ses tests : plus de 1 170 cas, lancés à chaque changement.

## Références scientifiques

- **R. S. Park et al.** (2021), *The JPL Planetary and Lunar Ephemerides DE440 and DE441*, AJ 161, 105 : les positions
- **B. Rhodes**, *Skyfield* : réduction des positions (UAI 2006/2000A), levers, couchers et phases de la Lune, orbites des satellites (SGP4)
- **F. R. Stephenson, L. V. Morrison et C. Y. Hohenkerk** (2016), Proc. R. Soc. A 472 : ΔT historique ; l'IERS ensuite
- **Jean Meeus**, *Astronomical Algorithms*, 2e édition, Willmann-Bell, 1998 : chapitre 54 (règles des éclipses), chapitres 13 et 16 (changements de coordonnées, réfraction), chapitre 44 (satellites galiléens de Jupiter)
- **B. A. Archinal et al.** (2018), rapport du groupe de travail de l'UAI sur les coordonnées cartographiques et les éléments de rotation, Celest. Mech. Dyn. Astron. 130, 22 : le pôle de Saturne, pour l'inclinaison de ses anneaux
- **Explanatory Supplement to the Astronomical Almanac** (1992), chapitre 8 : éléments de Bessel des éclipses de Soleil
- **André Danjon** : l'agrandissement de l'ombre de la Terre par l'atmosphère (1/85 du rayon terrestre), pour les éclipses de Lune
- **Fred Espenak et Jean Meeus**, *Five Millennium Canon of Solar Eclipses* et *of Lunar Eclipses*, NASA : valeurs de référence des tests d'éclipses
- **JPL Horizons** et **USNO** : valeurs de référence des tests de positions, de levers et de couchers
- **D. Hoffleit et W. H. Warren** (1991), *Yale Bright Star Catalogue*, 5e éd. : les étoiles de la carte du ciel (domaine public)
- **Natural Earth**, terres au 1:110 000 000 : fond des cartes d'éclipses (domaine public)
- **International Meteor Organization**, *Meteor Shower Calendar 2026* (J. Rendtel) : les étoiles filantes
- **GeoNames**, villes de plus de 15 000 habitants, licence CC BY 4.0 : la recherche de lieu
- **OpenNGC** (M. Verga, CC BY-SA 4.0) et la base Messier de la **SEDS** : les objets du ciel profond
- **d3-celestial** (O. Frohn, licence BSD 3) : les figures et les noms des 88 constellations, et leurs limites (E. Delporte, *Délimitation scientifique des constellations*, UAI, 1930, ramenées à J2000)
- **CelesTrak** et **AMSAT** : orbites (TLE) des stations spatiales et de Hubble
- **JPL Small-Body Database** : paramètres de magnitude des comètes ; **JPL Horizons** : leurs positions
- **E. Bowell et al.** (1989), *Application of photometric models to asteroids* : magnitudes H, G des planètes mineures
- **Base Lichtenknecker du BAV** : les minima d'Algol auxquels l'éphéméride est ajustée ; **J. M. Kreiner** (2004), Acta Astron. 54, 207, et les éléments du BAV de 2017 : sa vérification
- **CNEOS** (NASA/JPL), *SBDB Close-Approach Data API* : les passages des géocroiseurs ; **JPL Horizons** : leurs positions et magnitudes
- **IOTA**, prédictions de Steve Preston calculées avec **Occult** (David Herald) d'après Gaia DR3 : les occultations par des astéroïdes
- **David Bishop**, *Latest Supernovae*, et **Koji Mukai**, *List of Recent Galactic Novae* (NASA Goddard) : les novae et supernovae
- **A. Chulliat et al.**, *The US/UK World Magnetic Model for 2025–2030*, NOAA NCEI et British Geological Survey : la déclinaison magnétique de la carte qui suit le téléphone

## Dépendances

| Paquet | Rôle |
|---|---|
| [PySide6](https://doc.qt.io/qtforpython-6/) | l'interface (Qt 6) ; PyQt6 fonctionne aussi |
| [matplotlib](https://matplotlib.org/) | les graphiques et les cartes |
| [Skyfield](https://rhodesmill.org/skyfield/) | l'éphéméride JPL DE440, le temps (UT1, ΔT), les levers et couchers, les satellites |
| [timezonefinder](https://github.com/jannikmi/timezonefinder) | le fuseau horaire d'un lieu, hors ligne |
| [tzdata](https://pypi.org/project/tzdata/) | la base des fuseaux horaires IANA |

Les polices (IBM Plex, Astraeos Symboles) et les icônes viennent avec l'application.
