// scripts/sync-celeste-sky.mjs — recopie de Céleste les données des cartes de constellations.
// Usage : node scripts/sync-celeste-sky.mjs <dossier du dépôt Celeste_App>
//
// Écrit dans src/domains/astronomie/data/ :
// - constellation-bounds.json : les limites officielles des 88 constellations (E. Delporte pour l'UAI, 1930,
//   ramenées à J2000), recopiées de assets/constellation_bounds.json de Céleste, qui les tient de d3-celestial
//   (Olaf Frohn, BSD-3) : pour chaque constellation ses contours (deux pour le Serpent), en heures et en degrés ;
// - bright-stars.json : les 8 404 étoiles du Yale Bright Star Catalogue jusqu'à la magnitude 6,5 (Hoffleit et
//   Warren 1991, domaine public), lues dans star_catalog.py de Céleste : position J2000 en degrés, magnitude,
//   constellation (d'après les limites de l'UAI, par Astronomy Engine), lettre de Bayer ou numéro de Flamsteed,
//   et le nom des plus brillantes, en français quand le site l'a (data/star-names.json) ;
// - deep-sky.json : les objets de Messier et de Caldwell et les autres objets du ciel profond plus brillants que la
//   magnitude 9, d'OpenNGC (Mattia Verga, CC BY-SA 4.0 : ce fichier est partagé sous la même licence), lus dans
//   assets/deep_sky.csv.gz de Céleste ; les objets de Messier portent leur nom français (locales/fr.json).
//
// Ces données changent rarement : le script se lance à la main, comme sync-celeste.mjs, et ses fichiers sont
// versionnés.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import * as Astronomy from 'astronomy-engine'

const source = process.argv[2]
if (!source) {
  console.error('Usage : node scripts/sync-celeste-sky.mjs <dossier du dépôt Celeste_App>')
  process.exit(1)
}
const DATA = new URL('../src/domains/astronomie/data/', import.meta.url).pathname
const round = (x, digits) => Number(x.toFixed(digits))
const write = (name, value) => {
  writeFileSync(join(DATA, name), `${JSON.stringify(value)}\n`)
  console.log(`${name} : ${Math.round(JSON.stringify(value).length / 1024)} Kio`)
}

// --- Les limites des constellations ---
const bounds = JSON.parse(readFileSync(join(source, 'assets', 'constellation_bounds.json'), 'utf8'))
write('constellation-bounds.json', bounds)

// --- Les étoiles ---
// Une ligne de star_catalog.py : ('α CMa', 6.752472, -16.71611, -1.46, -553, -1205, 'Sirius'),
const LINE = /^\s*\('([^']*)', ([-+\d.]+), ([-+\d.]+), ([-+\d.]+), [-+\d]+, [-+\d]+, '([^']*)'\),$/
const catalog = readFileSync(join(source, 'star_catalog.py'), 'utf8')
  .split('\n')
  .map((line) => line.match(LINE))
  .filter(Boolean)
  .map(([, designation, ra, dec, mag, name]) => ({
    designation,
    ra: Number(ra) * 15,
    dec: Number(dec),
    mag: Number(mag),
    name,
  }))

// Les noms français des étoiles du site, par la position de l'étoile (à 3′ près, même éclat à une demi-magnitude près)
const siteStars = JSON.parse(readFileSync(join(DATA, 'stars.json'), 'utf8'))
const siteNames = JSON.parse(readFileSync(join(DATA, 'star-names.json'), 'utf8'))
const frenchName = (star) => {
  for (const [index, name] of siteNames) {
    const [ra, dec, mag] = siteStars[index]
    const dRa = (((ra - star.ra + 540) % 360) - 180) * Math.cos((dec * Math.PI) / 180)
    if (Math.hypot(dRa, dec - star.dec) < 0.05 && Math.abs(mag - star.mag) < 0.5) return name
  }
  return ''
}

let named = 0
const stars = catalog.map((s) => {
  const constellation = Astronomy.Constellation(s.ra / 15, s.dec).symbol
  // « α¹ CMa » → « α¹ », « 46 LMi » → « 46 », « HR 5958 » → rien : la constellation est dans la colonne d'à côté
  const label = s.designation.startsWith('HR ') ? '' : s.designation.split(' ')[0]
  const name = frenchName(s) || s.name
  if (name) named++
  const row = [round(s.ra, 2), round(s.dec, 2), s.mag, constellation]
  if (label || name) row.push(label)
  if (name) row.push(name)
  return row
})
write('bright-stars.json', {
  source: 'Yale Bright Star Catalogue, 5e éd. (Hoffleit et Warren 1991, domaine public), via Céleste (star_catalog.py)',
  stars,
})
console.log(`  ${stars.length} étoiles, dont ${stars.filter((r) => r[4]).length} lettres ou numéros et ${named} noms`)

// --- Le ciel profond ---
// Les noms usuels d'OpenNGC (en anglais) des objets qui ne sont pas de Messier, en français
const NAMES_FR = {
  'Flaming Star Nebula': 'Nébuleuse de l’Étoile flamboyante',
  'omi Vel Cluster': 'Amas d’ο Velorum',
  'tet Car Cluster': 'Pléiades du Sud',
  'lam Cen Nebula': 'Nébuleuse de λ Centauri',
  'rho Oph Nebula': 'Nébuleuse de ρ Ophiuchi',
  'Eagle Nebula': 'Nébuleuse de l’Aigle',
  'Pelican Nebula': 'Nébuleuse du Pélican',
  'Cocoon Nebula': 'Nébuleuse du Cocon',
  'Bow-Tie nebula': 'Nébuleuse du Nœud papillon',
  '47 Tuc Cluster': '47 Tucanae',
  'Sculptor Filament': 'Galaxie du Sculpteur',
  'Small Magellanic Cloud': 'Petit Nuage de Magellan',
  'Owl Cluster': 'Amas de la Chouette',
  'h Persei Cluster': 'h Persei, du Double amas',
  'chi Persei Cluster': 'χ Persei, du Double amas',
  'Perseus A': 'Persée A',
  'Fornax A': 'Fourneau A',
  'California Nebula': 'Nébuleuse Californie',
  'Lower Sword': 'Bas de l’Épée d’Orion',
  'Upper Sword': 'Haut de l’Épée d’Orion',
  '30 Dor Cluster': 'Nébuleuse de la Tarentule (30 Doradus)',
  'Rosette Nebula': 'Nébuleuse de la Rosette',
  "Hubble's Nebula": 'Nébuleuse variable de Hubble',
  'Christmas Tree Cluster': 'Amas de l’Arbre de Noël',
  'Great Bird Cluster': 'Amas du Grand Oiseau',
  "Caroline's Cluster": 'Amas de Caroline',
  'Eskimo Nebula': 'Nébuleuse de l’Esquimau',
  'Spindle Galaxy': 'Galaxie du Fuseau',
  'Eight-Burst Nebula': 'Nébuleuse des Huit Éclats',
  "Jupiter's Ghost Nebula": 'Fantôme de Jupiter',
  'Carina Nebula': 'Nébuleuse de la Carène',
  'Wishing Well Cluster': 'Amas du Puits aux souhaits',
  'Pearl Cluster': 'Amas de la Perle',
  'Blue Planetary': 'Planétaire bleue',
  'Antennae Galaxies': 'Galaxies des Antennes',
  'Needle Galaxy': 'Galaxie de l’Aiguille',
  'Coalsack Cluster': 'Amas du Sac à charbon',
  'Whale Galaxy': 'Galaxie de la Baleine',
  "Herschel's Jewel Box": 'Boîte à bijoux',
  'S Nor Cluster': 'Amas de S Normae',
  'Bug Nebula': 'Nébuleuse du Papillon',
  "Cat's Eye Nebula": 'Nébuleuse de l’Œil de chat',
  'Foxhead Cluster': 'Amas de la Tête de renard',
  "Barnard's Galaxy": 'Galaxie de Barnard',
  'Blinking Planetary': 'Nébuleuse clignotante',
  'Crescent Nebula': 'Nébuleuse du Croissant',
  'Fireworks Galaxy': 'Galaxie du Feu d’artifice',
  'Veil Nebula': 'Dentelles du Cygne, à l’ouest',
  'Eastern Veil': 'Dentelles du Cygne, à l’est',
  'North America Nebula': 'Nébuleuse de l’Amérique du Nord',
  'Saturn Nebula': 'Nébuleuse de Saturne',
  'Iris Nebula': 'Nébuleuse de l’Iris',
  'Helix Nebula': 'Nébuleuse de l’Hélice',
  'Bubble Nebula': 'Nébuleuse de la Bulle',
  "Copeland's Blue Snowball": 'Boule de neige bleue',
  'Cave Nebula': 'Nébuleuse de la Caverne',
  'Double Cluster': 'Double amas de Persée',
  'Coalsack Nebula': 'Sac à charbon',
  "Brocchi's Cluster": 'Amas de Brocchi (le Cintre)',
  'Large Magellanic Cloud': 'Grand Nuage de Magellan',
  'Sculptor Dwarf Elliptical': 'Galaxie naine du Sculpteur',
  'Fornax Dwarf Spheroidal': 'Galaxie naine du Fourneau',
}
const fr = JSON.parse(readFileSync(join(source, 'locales', 'fr.json'), 'utf8')).messier
const rows = gunzipSync(readFileSync(join(source, 'assets', 'deep_sky.csv.gz')))
  .toString('utf8')
  .trim()
  .split('\n')
const header = rows.shift().split(';')
const objects = rows
  .map((line) => Object.fromEntries(line.split(';').map((value, i) => [header[i], value])))
  .filter((o) => o.M || o.C || (o.mag !== '' && Number(o.mag) <= 9))
  .map((o) => {
    const m = o.M ? Number(o.M) : null
    const c = o.C ? Number(o.C) : null
    return {
      label: m ? `M${m}` : c ? `C${c}` : o.id,
      id: o.id,
      m,
      c,
      type: o.type,
      ra: round(Number(o.ra), 3),
      dec: round(Number(o.dec), 3),
      constellation: o.const,
      mag: o.mag === '' ? null : Number(o.mag),
      size: o.major === '' ? null : Number(o.major),
      name: (m && fr[`name_${m}`]) || NAMES_FR[o.name] || o.name,
    }
  })
write('deep-sky.json', {
  source: 'OpenNGC (Mattia Verga, github.com/mattiaverga/OpenNGC), licence CC BY-SA 4.0, via Céleste (assets/deep_sky.csv.gz)',
  licence: 'CC BY-SA 4.0',
  objects,
})
console.log(`  ${objects.length} objets, dont ${objects.filter((o) => o.m).length} de Messier et ${objects.filter((o) => o.c).length} de Caldwell`)
