Ce qui est fait, et ce qui vient. La feuille de route complète du projet, version par version, est dans l'[historique des versions](#/celeste/versions).

## Données et calculs

- [x] Crépuscules nautique (−12°) et astronomique (−18°)
- [x] Système solaire : positions de Vénus, Mars, Jupiter et Saturne, puis de toutes les planètes
- [x] Éclipses de Soleil et de Lune : type, magnitudes, durée des phases, circonstances locales, carte
- [x] Conjonctions et oppositions, à la minute, avec leur carte
- [x] Planètes mineures : Cérès, Pallas, Junon, Vesta, Pluton, Éris, Hauméa, Makémaké, Sedna (JPL Horizons)
- [x] Évènements vus d'ici : visibilité, occultations, Lune, saisons, export .ics
- [x] Étoiles filantes : maximums des grandes pluies, radiant et Lune la nuit du maximum
- [x] Précision : éphéméride JPL DE440 (Skyfield) au lieu des séries de Meeus ; levers et couchers à la seconde
- [x] Comètes, ciel profond (Messier), satellites, lunes de Jupiter et anneaux de Saturne
- [x] Étoiles variables : les minima d'Algol
- [x] Astéroïdes géocroiseurs et occultations d'étoiles par des astéroïdes
- [x] Novae et supernovae du moment

## Interface

- [x] Carte du ciel interactive : 8 404 étoiles, 88 constellations, planètes, recherche, zoom, la nuit qui défile
- [x] Couleurs des crépuscules sous les trajectoires
- [x] Fiche du mois à imprimer
- [x] Cartes des constellations (4.24)
- [x] Design Astræos : thèmes Nuit, Jour et Observation, polices IBM Plex, icônes vectorielles
- [x] Cinq espaces au lieu de neuf onglets (4.13)

## Confort

- [x] Favoris, historique, fuseaux horaires IANA, altitude de l'observateur
- [x] Interface en quatre langues, réglages conservés
- [x] Recherche de lieu hors ligne, carte du lieu, calendrier lunaire du mois
- [x] Mise à jour automatique

## Atelier : instruments à fabriquer

- [x] Atelier 1 (4.11) : planisphère, cadrans solaires équatorial et horizontal
- [x] Atelier 2 (4.12) : astrolabe planisphérique complet et nocturlabe
- [x] Un planisphère comme ceux du commerce (4.23) : la roue des étoiles dans une pochette pliée
- [ ] Atelier 3 : le quadrant horaire, un cadran mural déclinant et une méridienne ([la conception](#/celeste/documentation/instruments), en anglais)

## Version 5 : Android

- [x] PySide6 et une première application Android construite par l'intégration continue (4.14)
- [x] Interface compacte au doigt (4.15, 4.19)
- [x] La position du téléphone et une carte du ciel qui suit le téléphone (4.22)
- [ ] L'application Android (5.0), le même code que sur ordinateur, sur Google Play ([le plan](#/celeste/documentation/android), en anglais)

## Sur le web

- [x] Une section Céleste sur le site Gaïa, avec ses outils d'astronomie dans le navigateur
- [x] Dans le navigateur, d'après Heavens-Above et In-The-Sky : les comètes, les astéroïdes brillants, les étoiles filantes, les satellites de Jupiter, les cartes des 88 constellations et les minima d'Algol
- [x] Dans le navigateur, comme Céleste 4.20 et 4.21 : les astéroïdes qui passent près de la Terre (CNEOS, JPL Horizons), les étoiles qu'ils cachent près du lieu (IOTA), les novae et les supernovae du moment
- [ ] Céleste dans le navigateur : son moteur en Python dans la page, avec Pyodide, en commençant par « Ce soir » ([les pistes](#/celeste/documentation/web), en anglais)
