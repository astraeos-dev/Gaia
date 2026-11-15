# Gaïa — les projets d'Astraeos

Le site qui réunit les projets d'Astraeos, **un projet par section** : Céleste (l'observatoire astronomique pour
Windows), Ganymède (l'application Android de calcul et ses outils web), les intégrations Home Assistant Céleste,
Helios et Météo & Confort, et la bibliothèque astraeos-astro. Dans la mythologie grecque, Gaïa est la Terre mère,
ancêtre des Titans : Astraeos, le Titan des étoiles, est son petit-fils.

Le site offre aussi plus de quatre-vingts outils qui fonctionnent entièrement dans le navigateur, rangés en quatre
espaces : l'Astronomie vient de Céleste, l'Électronique, les Sciences et le Pratique de Ganymède.

**Site en ligne :** https://astraeos-dev.github.io/personnal-site/

## Les sections

| Adresse | Section |
| --- | --- |
| `#/` | Accueil : les projets, les espaces d'outils, les outils à la une, les archives |
| `#/celeste` | Céleste, en neuf pages : présentation, fonctionnalités, installation, dans le navigateur, versions, documentation (son wiki et ses documents de conception), confidentialité, références, feuille de route |
| `#/ganymede`, `#/celeste-ha`, `#/helios`, `#/meteo-confort`, `#/astraeos-astro` | Les autres projets : présentation, fonctionnalités, installation, liens, et leurs outils sur le site |
| `#/<espace>`, `#/<espace>/<outil>` | Les espaces d'outils et leurs outils |

## La charte Astræos

Les couleurs, les polices et le logo sont ceux de Céleste : trois thèmes (Jour, Nuit, et Observation, rouge pour
garder la vision de nuit), les polices IBM Plex, et un logo fait d'une lettre à l'encre et d'une étoile d'or. Les
couleurs sont des variables CSS (`src/index.css`) que Tailwind lit (`tailwind.config.js`) ; le logo, le G de Gaïa
et son étoile, est dessiné par `scripts/make-logo.py` (`public/favicon.svg`, `public/gaia.svg`), comme les logos
des projets (`public/projets/`) : leur lettre à l'encre et un point d'or.

## Ajouter un projet

Une entrée dans `src/data/projects.js` (identifiant, titre, description, statut, liens, fonctionnalités,
installation) : l'accueil, l'en-tête, le pied de page et la section `#/<identifiant>` la prennent. Un projet aux
pages plus riches a son dossier dans `src/projects/`, comme Céleste.

La section Céleste reprend les documents de son dépôt (le wiki, les documents de conception, l'historique des
versions) : après un changement de Céleste, les recopier avec

```bash
node scripts/sync-celeste.mjs ../Celeste_App
```

## Démarrer

```bash
npm install
npm run dev       # serveur de développement sur http://localhost:5173
npm test          # tests unitaires (Vitest)
npm run lint      # ESLint
npm run build     # version de production dans dist/
npm run check     # lint + tests + build, comme la CI
```

## Structure

```
src/
├── App.jsx                  # routes : accueil, sections des projets, catalogue, #/<espace>, #/<espace>/<outil>, à propos
├── registry.js              # ⭐ REGISTRE DU SITE : rassemble les espaces, adresses, recherche, anciennes adresses
├── config/site.js           # nom du site, description, liens GitHub
├── data/projects.js         # ⭐ LES PROJETS : un projet, une section (accueil, en-tête, #/<projet>)
├── projects/celeste/        # la section Céleste : ses pages (content/), ses documents recopiés (docs/)
├── context/                 # thème clair/sombre et lieu d'observation partagés
├── components/              # en-tête, recherche (Ctrl K), pied de page, cartes, sélecteur de lieu…
├── pages/                   # accueil, catalogue, page d'espace, page d'outil, à propos
├── lib/                     # formatage français (nombres, angles, heures), notation SI
├── kit/                     # calculateur générique piloté par une « spec », graphiques, symboles de schémas électriques
└── domains/                 # un dossier par espace, chacun avec son registry.js (espace, rubriques, outils)
    ├── astronomie/          # lib/ (astro, time, geo), components/ (cartes, graphiques), un dossier par outil
    ├── electronique/
    │   ├── calculs/         # calculateurs (calc/), formules, schémas électriques
    │   ├── materiel/        # cartes (fiche + brochage), modules, câblages, vérification d'un montage
    │   └── references/      # connecteurs, composants, fils, tables et symboles
    ├── sciences/            # maths/ physique/ meteo/ chimie/
    └── pratique/            # converter/ (units/, currency.js), calculator/, dates/, sante/
```

## Ajouter un outil

**Calculateur simple (formulaire → résultats)** : écrire une spec, sans React.

```js
// src/domains/sciences/physique/energie-cinetique.js
export default {
  inputs: [
    { id: 'm', label: 'Masse', unit: 'kg', value: '1000' },
    { id: 'v', label: 'Vitesse', unit: 'm/s', value: '20' },
  ],
  compute: ({ m, v }) => ({ results: [{ label: 'Énergie cinétique', value: 0.5 * m * v * v, unit: 'J', main: true }] }),
  formulas: ['E = ½ m v²'],
}
```

```js
// src/domains/sciences/registry.js
{ id: 'energie-cinetique', rubrique: 'physique', title: 'Énergie cinétique', summary: '…', icon: I.Gauge,
  component: calc(() => import('./physique/energie-cinetique.js')) },
```

Une spec peut aussi renvoyer un tableau (`table`), un graphique (`chart`, ou `chart.component` pour un
graphique sur mesure comme le diagramme de l'air humide) et des notes ; les champs acceptent les préfixes SI
(« 4k7 », « 100n »), des listes de choix et des valeurs prédéfinies. Une liste `references` affiche les
sources, et chaque formule ou note peut y renvoyer (`ref`) par un numéro. Un composant `schematic` dessine le
schéma du montage avec les valeurs saisies (symboles dans `src/kit/schematic.jsx`). Voir `src/kit/Calculator.jsx`.

**Outil avec une interface sur mesure** : un composant React (export default), déclaré avec
`component: lazy(() => import('./dossier/MonOutil.jsx'))` dans le registre de l'espace.

Dans les deux cas, la page `#/<espace>/<id>`, le menu, le catalogue, la recherche et l'accueil se
mettent à jour automatiquement. Chaque outil est chargé à la demande.

Autres points d'extension :

- **Nouvelle rubrique** : ajouter une entrée à `RUBRIQUES` dans le `registry.js` de l'espace.
- **Nouvel espace** : créer `src/domains/<espace>/registry.js` (exports `DOMAIN`, `RUBRIQUES`, `TOOLS`) et
  l'ajouter à `MODULES` dans `src/registry.js`. Les tests (`src/registry.test.js`) vérifient que chaque outil
  est rangé dans une rubrique de son espace et que les liens internes pointent vers une adresse actuelle.
- **Nouvelle grandeur ou unité** : `src/domains/pratique/converter/units/` (un facteur vers l'unité de
  base, ou `toBase`/`fromBase` pour les conversions non linéaires ; `si()` génère les préfixes).
- **Nouveau projet** sur la page À propos : `src/data/projects.js`.
- **Classes CSS communes** (`card`, `btn`, `input`, `label`, `chip`, `table-data`…) : `src/index.css`.
- **Couleurs** : palettes `night` (bleu nuit) et `accent` (ambre) dans `tailwind.config.js`.

## Déploiement

Le workflow `.github/workflows/deploy.yml` vérifie chaque pull request (lint, tests, build) et publie
le site sur GitHub Pages à chaque push sur `main`. Le routage utilise des URL avec `#` (HashRouter),
compatibles avec l'hébergement statique de GitHub Pages sans configuration.
Pour un domaine personnel, remplacer `base` dans `vite.config.js` par `'/'`.

## Crédits et licences des données

- Calculs astronomiques : [Astronomy Engine](https://github.com/cosinekitty/astronomy) — Don Cross, licence MIT
  (le successeur du moteur utilisé par ses pages *Astronomy Calendar*, *Sky View* et *Solar System Calculator*).
- Étoiles (jusqu'à la magnitude 6), tracés et noms des constellations, objets Messier :
  [d3-celestial](https://github.com/ofrohn/d3-celestial) — Olaf Frohn, licence BSD-3.
  Les fichiers compacts de `src/domains/astronomie/data/` en sont extraits.
- Fond de carte du monde : [Natural Earth](https://www.naturalearthdata.com) (domaine public), via
  [world-atlas](https://github.com/topojson/world-atlas), converti en tracé SVG équirectangulaire.
- Satellites : [satellite.js](https://github.com/shashwatak/satellite-js) (MIT), éléments orbitaux
  [CelesTrak](https://celestrak.org).
- Taux de change : taux de référence de la Banque centrale européenne via [Frankfurter](https://frankfurter.dev).
- Secondes intercalaires : IERS. Icônes : [Lucide](https://lucide.dev).

## Licence

Code du site sous licence MIT : voir le fichier `LICENSE`. Les données reprises d'autres projets
gardent leur propre licence (voir la section précédente).
