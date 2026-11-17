/**
 * LES PROJETS
 * -----------
 * Chaque projet a sa section du site : #/<id>. L'accueil les présente tous, l'en-tête mène aux projets actifs.
 *
 * id       : adresse de la section (#/celeste…) ; Céleste a ses propres pages (src/projects/celeste)
 * repo     : dépôt GitHub (github.com/astraeos-dev/<repo>) ; private : aucun lien montré aux visiteurs
 * status   : 'actif' | 'en-pause' | 'prototype' | 'termine' | 'archive'
 * logo     : son logo dans public/projets/, dessiné par scripts/make-logo.py selon la charte Astræos
 * domains  : espaces d'outils du site qui viennent du projet (src/domains/<espace>)
 * tools    : identifiants (registry.js) des outils du site issus du projet
 * intro, features, install, links : le contenu de la section
 */
import { TONE } from '../kit/charte'

export const PROJECTS = [
  {
    id: 'celeste',
    repo: 'Celeste_App',
    title: 'Céleste',
    short: 'Céleste',
    kind: 'Application de bureau (Windows), alpha Android',
    tagline: 'Un observatoire astronomique sur votre ordinateur',
    description:
      'Soleil, Lune, planètes et étoiles pour votre lieu : éphémérides, carte du ciel, éclipses, comètes, satellites, nuit d’observation et instruments à fabriquer.',
    tech: ['Python', 'PySide6 (Qt)', 'Skyfield', 'Matplotlib', 'JPL DE440'],
    status: 'actif',
    version: '4.24',
    logo: 'projets/celeste.svg',
    domains: ['astronomie'],
    tools: ['ce-soir', 'que-voir', 'carte-du-ciel', 'constellations', 'cometes'],
    links: [
      { label: 'Télécharger pour Windows', href: 'https://github.com/astraeos-dev/Celeste_App/releases/latest', primary: true },
      { label: 'Code source', href: 'https://github.com/astraeos-dev/Celeste_App' },
    ],
  },
  {
    id: 'ganymede',
    repo: 'Ganymede',
    title: 'Ganymède',
    short: 'Ganymède',
    kind: 'Application Android et outils dans le navigateur',
    tagline: 'Calculatrice scientifique et plus de cent outils',
    description:
      'Calculatrice, convertisseur, traceur de fonctions et plus de cent calculateurs (électronique, maths, physique, chimie, santé) avec leurs fiches de référence ; la plupart fonctionnent aussi ici, dans le navigateur.',
    tech: ['Kotlin', 'Jetpack Compose', 'Hilt', 'Room', 'React (version web)'],
    status: 'actif',
    logo: 'projets/ganymede.svg',
    domains: ['electronique', 'sciences', 'pratique'],
    tools: ['traceur', 'matrices', 'loi-ohm', 'code-couleur', 'timer-555', 'imc', 'masse-molaire', 'calcul-dates'],
    intro: [
      'Ganymède regroupe dans une seule application Android les calculs du quotidien des techniciens, étudiants et curieux : une calculatrice scientifique avec son historique, un convertisseur d’unités, un traceur de courbes et plus de cent outils rangés par domaine, chacun avec sa fiche d’explication.',
      'La version web est née de l’application : ses outils d’électronique, de sciences et du quotidien sont dans cette section, et fonctionnent entièrement dans le navigateur, sans compte ni publicité.',
    ],
    features: [
      { title: 'Calcul', items: ['Calculatrice scientifique avec historique', 'Convertisseur d’unités (75 grandeurs, plus de 600 unités, devises de la BCE dans la version web)', 'Traceur de fonctions : courbes interactives en 2D'] },
      {
        title: 'Électronique',
        items: [
          'Loi d’Ohm et puissance, associations série et parallèle, pont diviseur, résistance de LED, pont de Wheatstone, triangle-étoile',
          'Codes des résistances (anneaux et CMS) et des condensateurs, séries normalisées, tolérances',
          'Temporisateur 555, filtres passifs, réactance, impédance et résonance RLC, constante de temps, ampli-op, polarisation de transistor, diode Zener, transformateur',
          'Chute de tension et section de câble, bobines, batteries, coût de l’énergie',
          'Dans la version web : brochages de composants, de cartes (Arduino, ESP32, Raspberry Pi…) et de connecteurs, capteurs et modules, bus et niveaux logiques',
        ],
      },
      { title: 'Mathématiques', items: ['Second degré, matrices, pourcentages, PGCD et PPCM, nombres complexes, bases numériques', 'Dérivées et intégrales, transformées de Laplace, identités trigonométriques, chiffres romains (application)'] },
      { title: 'Physique et chimie', items: ['Chute libre, projectile, loi de Newton, gaz parfaits, Bernoulli, ondes', 'Masse molaire, tableau périodique, potentiels redox (application)', 'Air humide, confort thermique, ressenti, pression et altitude (version web)'] },
      { title: 'Santé et dates', items: ['IMC, métabolisme de base, masse grasse', 'Écart entre deux dates, date de Pâques, jours fériés, fuseaux horaires'] },
      {
        title: 'Fiches de référence (application)',
        items: [
          'Unités, préfixes et constantes SI, brochages, boîtiers, symboles électroniques, portes logiques, calibres de fils',
          'Tables ASCII, codes HTTP, ports TCP/UDP, alphabets grec et OTAN, code Morse, aide-mémoire Git, regex, LaTeX et Markdown',
          'Spectre électromagnétique, propriétés des matériaux, perçage avant taraudage, roulements',
        ],
      },
    ],
    install: [
      'Application Android : Android 6.0 (API 23) à Android 15 (API 35).',
      'Pour développer : cloner le dépôt, l’ouvrir dans Android Studio et laisser Gradle se synchroniser, puis lancer sur un émulateur ou un appareil.',
      'Version web : rien à installer, les outils sont dans cette section.',
    ],
    links: [{ label: 'Code source de l’application', href: 'https://github.com/astraeos-dev/Ganymede', primary: true }],
  },
  {
    id: 'celeste-ha',
    repo: 'Celeste_HA',
    title: 'Céleste pour Home Assistant',
    short: 'Céleste HA',
    kind: 'Intégration Home Assistant (HACS)',
    tagline: 'Le ciel en capteurs dans Home Assistant',
    description:
      'Éphémérides du Soleil, de la Lune, des planètes, des astéroïdes et des comètes, et temps astronomique, sous forme de capteurs Home Assistant.',
    tech: ['Python', 'Home Assistant', 'HACS', 'Astronomy Engine', 'IMCCE'],
    status: 'actif',
    logo: 'projets/celeste-ha.svg',
    tools: ['soleil', 'lune', 'temps-astronomique'],
    intro: [
      'Céleste pour Home Assistant met le ciel dans la domotique : chaque astre suivi devient un appareil avec ses capteurs (hauteur, azimut, lever, coucher, magnitude…), utilisables dans les automatisations.',
      'Elle réunit deux intégrations plus anciennes : le service en ligne de l’IMCCE et ha-meeus-astronomy (le jour julien et le calendrier de Jean Meeus).',
    ],
    features: [
      {
        title: 'Trois types de suivi',
        items: [
          'Soleil, Lune ou planète : calcul local avec Astronomy Engine (le même moteur que les outils d’astronomie de ce site), sans réseau, mis à jour chaque minute',
          'Autre objet (astéroïde, comète, satellite naturel) : service Miriade de l’IMCCE (Observatoire de Paris), chaque heure',
          'Temps astronomique : calendrier de Jean Meeus et Astronomy Engine, chaque minute',
        ],
      },
      {
        title: 'Entités créées',
        items: [
          'Hauteur, azimut, constellation ; lever, passage au méridien et coucher du jour',
          'Magnitude, élongation, distance, angle de phase et fraction éclairée ; pour la Lune, le nom de la phase, l’âge et la distance',
          'Capteurs binaires « Au-dessus de l’horizon » (« Jour » pour le Soleil) et « Visibilité »',
          'Temps astronomique : jour julien et jour julien modifié, jours depuis J2000, jour de l’année, temps sidéral local et de Greenwich, équation du temps',
        ],
      },
      { title: 'Services', items: ['celeste.convert_to_julian_day : date grégorienne vers jour julien', 'celeste.convert_to_gregorian : jour julien vers date grégorienne'] },
    ],
    install: [
      'Avec HACS : Dépôts personnalisés → ajouter le dépôt, catégorie Intégration → installer Céleste → redémarrer Home Assistant.',
      'Paramètres → Appareils et services → Ajouter une intégration → Céleste.',
      'À la main : copier custom_components/celeste dans la configuration, puis redémarrer.',
    ],
    links: [{ label: 'Code source et documentation', href: 'https://github.com/astraeos-dev/Celeste_HA', primary: true }],
  },
  {
    id: 'helios',
    repo: 'Helios',
    title: 'Helios',
    short: 'Helios',
    kind: 'Intégration Home Assistant (HACS)',
    tagline: 'La position du Soleil et ses heures, en Python pur',
    description:
      'Intégration Home Assistant légère qui calcule la position du Soleil et les heures solaires du jour à partir d’équations astronomiques éprouvées, avec la précision de PyEphem.',
    tech: ['Python', 'Home Assistant', 'HACS', 'astraeos-astro'],
    status: 'actif',
    version: '0.3.2',
    logo: 'projets/helios.svg',
    intro: [
      'Helios et sa seule dépendance, astraeos-astro, n’utilisent que la bibliothèque standard de Python : aucun code compilé, et Home Assistant installe tout seul ce qu’il faut.',
      'Le moteur (solar_engine.py) ne dépend pas de Home Assistant : on peut le tester et vérifier ses équations directement en Python.',
    ],
    features: [
      {
        title: 'Données',
        items: [
          'Azimut, élévation apparente (réfraction comprise) et géométrique vraie, déclinaison, ascension droite',
          'Équation du temps, distance Terre-Soleil, constellation où se trouve le Soleil (parmi les 13 qu’il traverse), durée du jour, jour julien',
          'Midi et minuit solaires, lever et coucher, aubes et crépuscules civils, nautiques et astronomiques, heures bleue et dorée, chacun avec l’azimut du Soleil à ce moment',
          'Capteurs binaires : Soleil au-dessus de l’horizon, heure dorée, heure bleue',
        ],
      },
      {
        title: 'Précision',
        items: [
          'La position du Soleil vient d’astraeos-astro, portage de libastro (le cœur de PyEphem) : mêmes valeurs à 0,001″ près',
          'Journée solaire d’un minuit solaire au suivant, juste aussi là où le fuseau horaire est loin de la longitude (Samoa, Kiribati)',
        ],
      },
    ],
    install: [
      'Home Assistant 2025.4 ou plus récent.',
      'Avec HACS : Helios fait partie du catalogue par défaut ; le rechercher dans HACS, le télécharger, puis redémarrer Home Assistant.',
      'Si HACS ne le propose pas encore : l’ajouter en dépôt personnalisé (catégorie Intégration).',
      'Paramètres → Appareils et services → Ajouter une intégration → Helios. L’altitude et l’intervalle de mise à jour se règlent ensuite dans les options.',
    ],
    links: [{ label: 'Code source et documentation', href: 'https://github.com/astraeos-dev/Helios', primary: true }],
  },
  {
    id: 'meteo-confort',
    repo: 'meteo_confort',
    title: 'Météo & Confort',
    short: 'Météo & Confort',
    kind: 'Intégration Home Assistant (HACS)',
    tagline: 'Grandeurs météo dérivées et confort intérieur',
    description:
      'Calcule, à partir de vos capteurs, le point de rosée, l’humidex, le refroidissement éolien, la pression au niveau de la mer et des indicateurs de confort intérieur (PMV/PPD ISO 7730, risque de moisissure, conseil d’aération).',
    tech: ['Python', 'Home Assistant', 'HACS'],
    status: 'prototype',
    logo: 'projets/meteo-confort.svg',
    tools: ['air-humide'],
    intro: [
      'Tout est calculé localement, sans dépendance externe, et recalculé à chaque changement d’un capteur source. Les unités des capteurs (°F, inHg, mph, m/s…) sont converties automatiquement.',
      'Projet en cours de développement (versions 0.x) : les noms d’entités et les options peuvent encore changer.',
    ],
    features: [
      { title: 'Profil extérieur', items: ['Température et humidité ; pression et vitesse du vent en option', 'Point de rosée, humidex, refroidissement éolien, pression au niveau de la mer…'] },
      { title: 'Profil intérieur', items: ['Température et humidité ; CO₂, température radiante (globe), température et humidité extérieures en option', 'Confort PMV/PPD (ISO 7730), risque de moisissure, conseil d’aération'] },
    ],
    install: [
      'Home Assistant 2024.12 ou plus récent.',
      'Avec HACS : dépôt personnalisé, catégorie Intégration, puis installer Météo & Confort et redémarrer.',
      'Paramètres → Appareils et services → Ajouter une intégration → Météo & Confort, puis créer un profil par station ou par pièce.',
    ],
    links: [{ label: 'Code source et documentation', href: 'https://github.com/astraeos-dev/meteo_confort', primary: true }],
  },
  {
    id: 'astraeos-astro',
    repo: 'astraeos-astro',
    title: 'astraeos-astro',
    short: 'astraeos-astro',
    kind: 'Bibliothèque Python (PyPI)',
    tagline: 'La position du Soleil en Python pur',
    description:
      'Portage de libastro, le cœur en C de PyEphem, qui ne demande que la bibliothèque standard de Python : il s’installe partout où Python tourne, sans compilateur, et donne les valeurs de PyEphem à quelques millièmes de seconde d’arc près.',
    tech: ['Python', 'PyPI', 'VSOP87'],
    status: 'actif',
    logo: 'projets/astraeos-astro.svg',
    intro: [
      'astraeos-astro calcule la position apparente du Soleil vue d’un lieu : temps et ΔT, la Terre d’après VSOP87, la nutation et l’obliquité, l’aberration, la parallaxe, puis la hauteur et l’azimut. Il dit aussi dans quelle constellation se trouve un point du ciel.',
      'Helios, l’intégration Home Assistant, calcule le Soleil avec lui.',
    ],
    features: [
      {
        title: 'Ce qu’il calcule',
        items: [
          'Jours juliens, ΔT, temps sidéral moyen de Greenwich (UAI 1982)',
          'La Terre d’après VSOP87D (406 termes, comme libastro), dans le repère FK5',
          'Obliquité moyenne et nutation UAI 1980 (106 termes)',
          'Hauteur et azimut topocentriques (parallaxe comprise, sans réfraction), constellation d’un point du ciel',
        ],
      },
    ],
    install: ['pip install astraeos-astro', 'Python 3.10 ou plus récent.'],
    links: [
      { label: 'Code source et documentation', href: 'https://github.com/astraeos-dev/astraeos-astro', primary: true },
      { label: 'Sur PyPI', href: 'https://pypi.org/project/astraeos-astro/' },
    ],
  },
  {
    id: 'meeus-astronomy',
    repo: 'ha-meeus-astronomy',
    title: 'Meeus Astronomy (HA)',
    description: 'Composant Home Assistant de jour julien d’après Jean Meeus, fusionné dans Céleste pour Home Assistant.',
    tech: ['Python', 'Home Assistant', 'HACS'],
    status: 'archive',
    tools: ['temps-astronomique'],
  },
  {
    id: 'astronomy',
    repo: 'Astronomy',
    title: 'Astronomy',
    description: 'Scripts et carnets Skyfield (Soleil, Lune, planètes) intégrés à Home Assistant via des flux Node-RED.',
    tech: ['Python', 'Skyfield', 'Jupyter', 'Node-RED'],
    status: 'archive',
    tools: [],
  },
  {
    id: 'convertisseur-universel',
    repo: 'convertisseur2',
    private: true,
    title: 'Convertisseur universel',
    description: 'Application PyQt6 : conversions, calculatrice, décodeur de résistances (anneaux et CMS) et historique.',
    tech: ['Python', 'PyQt6'],
    status: 'archive',
    tools: ['convertisseur', 'code-couleur', 'air-humide'],
  },
  {
    id: 'convertisseur',
    repo: 'Convertisseur',
    private: true,
    title: 'Convertisseur (module)',
    description: 'Bibliothèque Python couvrant plus de 80 grandeurs physiques (viscosité, dose, flux lumineux…).',
    tech: ['Python'],
    status: 'archive',
    tools: ['convertisseur'],
  },
  {
    id: 'conversions',
    repo: 'conversions',
    title: 'conversions (PyPI)',
    description: 'Paquet Python de conversion d’unités publié sur PyPI via GitHub Actions.',
    tech: ['Python', 'PyPI'],
    status: 'archive',
    tools: ['bases'],
  },
]

export const PROJECT_STATUS = {
  actif: { label: 'Actif', className: TONE.ok },
  prototype: { label: 'En développement', className: TONE.lune },
  'en-pause': { label: 'En pause', className: 'border-accent-500/40 text-accent-700 dark:text-accent-400' },
  termine: { label: 'Terminé', className: 'border-night-500/40 text-night-500' },
  archive: { label: 'Archivé', className: 'border-night-500/40 text-night-500' },
}

/** Les projets qui ont leur section (les archives n'en ont pas : elles sont listées sur l'accueil et « À propos »). */
export const ACTIVE_PROJECTS = PROJECTS.filter((p) => p.status !== 'archive')

export const getProject = (id) => PROJECTS.find((p) => p.id === id)

/** Le projet dont vient un espace d'outils (Astronomie → Céleste…). */
export const projectOfDomain = (domainId) => PROJECTS.find((p) => p.domains?.includes(domainId))

const PRIVATE = new Set(PROJECTS.filter((p) => p.private).map((p) => p.repo))

/** Un dépôt peut-il être montré aux visiteurs (lien GitHub) ? */
export const isPublicRepo = (repo) => Boolean(repo) && !PRIVATE.has(repo)
