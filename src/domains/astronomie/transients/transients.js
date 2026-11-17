/**
 * LES NOVAE ET LES SUPERNOVAE DU MOMENT
 * ------------------------------------
 * Comme transients.py de Céleste (4.21). Des étoiles nouvelles vont et viennent dans le ciel : une nova de notre
 * galaxie se suit à la jumelle quelques semaines, et chaque année quelques supernovae de galaxies proches deviennent
 * assez brillantes pour un télescope d'amateur. Deux listes tenues à la main les donnent :
 *
 *  - les supernovae actives de « Latest Supernovae », de David Bishop (rochesterastronomy.org), une page faite pour
 *    être lue par des programmes et triée par éclat : dernière magnitude, type, galaxie hôte, maximum, découverte.
 *    Les novae d'autres galaxies (Nuages de Magellan, M31) y sont aussi. Quand cette page est vide (elle l'a été un
 *    matin de novembre 2026), la page principale du site, plus longue, donne les mêmes objets autrement ;
 *  - les novae de notre galaxie confirmées par leur spectre, de la « List of Recent Galactic Novae » de Koji Mukai
 *    (NASA Goddard) : position, date de découverte, éclat maximal.
 *
 * scripts/fetch-transients.mjs les lit à chaque construction du site ; une nova présente dans les deux listes est
 * montrée une fois, sous son nom d'étoile variable. Leur éclat change d'une nuit à l'autre : une nova s'éteint en
 * quelques semaines, une supernova en quelques mois.
 *
 * Aucune dépendance : le script se sert de ce module. Les dates sont des jours « AAAA-MM-JJ ».
 */
export const SUPERNOVAE_URL = 'https://www.rochesterastronomy.org/snimages/snactive.html'
export const SUPERNOVAE_PAGE = 'https://www.rochesterastronomy.org/supernova.html'
export const NOVAE_URL = 'https://asd.gsfc.nasa.gov/Koji.Mukai/novae/novae.html'
export const KEEP_MAG = 17.5 // les supernovae gardées : plus brillantes que ceci
export const NOVA_DAYS = 730 // les novae de notre galaxie gardées : découvertes ces deux dernières années
export const SAME_ARCSEC = 10 // une nova des deux listes : à moins de ceci d'elle-même
export const RECENT_DAYS = 60 // une magnitude plus ancienne n'est plus celle de l'objet
export const VISIBLE_ALT = 20
export const DARK_SUN = -12
const KM_S = 299_792.458 // la vitesse de la lumière
const HUBBLE = 70 // km/s par mégaparsec
const LY_PER_PC = 3.26156

const ROW = /<tr[^>]*>(.*?)<\/tr>/gis
const CELL = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis
const SUPERNOVA_TYPE = /^(?:SN|SLSN|I[abc]|II)/ // Ia, Iax, Ib/c, Ic-BL, II, IIP, IIn, SLSN-I… (pas ILRT)
const NOVA_TYPES = ['Nova', 'EGN'] // une nova, ici ou dans une autre galaxie

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', deg: '°', ndash: '–', mdash: '—' }

/** Le texte d'un morceau de HTML : les entités remplacées (&amp;, &deg;, &#233;…). */
export const unescapeHtml = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1))
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole
    }
    return ENTITIES[code.toLowerCase()] ?? whole
  })

const words = (text) => text.split(/\s+/).filter(Boolean).join(' ')

/** Les textes des cellules d'une ligne de tableau (les retours à la ligne gardés si on le demande). */
function cells(row, keepBreaks = false) {
  return [...row.matchAll(CELL)].map(([, cell]) => {
    const html = keepBreaks ? cell.replace(/<br\s*\/?>/gi, '\n') : cell
    const text = unescapeHtml(html.replace(/<[^>]+>/g, ' '))
    if (!keepBreaks) return words(text)
    return text.split('\n').map(words).filter(Boolean).join('\n')
  })
}

/** Les degrés (ou les heures) de « 03:41:55.511 », « -47 13 39.4 » ; une erreur quand c'est illisible. */
export function sexagesimal(text, hours) {
  const parts = text.trim().split(/[:\s]+/)
  if (parts.length !== 3 || parts.some((p) => !/^[+-]?\d+(?:\.\d+)?$/.test(p))) throw new Error(text)
  const sign = parts[0].startsWith('-') ? -1 : 1
  const [a, b, c] = parts.map((p) => Math.abs(Number(p)))
  const value = sign * (a + b / 60 + c / 3600)
  if (hours ? !(value >= 0 && value < 24) : !(value >= -90 && value <= 90)) throw new Error(text)
  return value
}

const pad = (n) => String(n).padStart(2, '0')

/** Le jour de « 2026/11/10 » ou « 2026-11-10 » (« 2026-11-10 ») ; null quand c'est illisible. */
export function dayOf(text) {
  const m = /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec(text ?? '')
  if (!m) return null
  const [y, mo, d] = m.slice(1).map(Number)
  const date = new Date(Date.UTC(y, mo - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null
  return `${y}-${pad(mo)}-${pad(d)}`
}

/** Un jour décalé de `days` jours. */
export const addDaysIso = (day, days) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

/** La forme habituelle d'un nom : « AT 2026lck », « SN 2026sqf ». */
export function tidy(name) {
  const m = /^(AT|SN)\s?(\d{4}[a-z]+)$/.exec(name.trim())
  return m ? `${m[1]} ${m[2]}` : name.trim()
}

/** Le premier nombre d'un texte (« 9.3 (V) », « G=12.26 ») ; null sans nombre. */
function firstNumber(text) {
  const m = /-?\d+(?:\.\d+)?/.exec(text ?? '')
  return m ? Number(m[0]) : null
}

/** « supernova », « nova » ou null (non classé, variable cataclysmique : laissé de côté). */
function kindOf(type) {
  if (NOVA_TYPES.some((t) => type.startsWith(t))) return 'nova'
  if (SUPERNOVA_TYPE.test(type)) return 'supernova'
  return null
}

const hostOf = (host) => (['none', '', 'n/a'].includes(host.trim().toLowerCase()) ? null : host.trim())

/**
 * Les supernovae et les novae d'autres galaxies de la page des objets actifs, plus brillantes que `keepMag` : name
 * (« SN 2026sqf », « AT 2026aina »), kind (« supernova » ou « nova »), type (« Ia », « IIP », « Nova »…), host
 * (galaxie, null pour la nôtre), ra (h), dec (°), mag (la dernière), magDate, stale (dernière mesure de plus d'un
 * mois), peak, peakDate, discovered, discoverer, aka (autres noms), z (décalage vers le rouge ou null). Par éclat.
 */
export function parseSupernovae(text, keepMag = KEEP_MAG) {
  const found = []
  for (const [, row] of text.matchAll(ROW)) {
    const c = cells(row)
    if (c.length < 14 || c[0] === 'SN') continue
    const kind = kindOf(c[7])
    const mag = firstNumber(c[5])
    if (kind == null || mag == null || mag > keepMag) continue
    let ra
    let dec
    try {
      ra = sexagesimal(c[2], true)
      dec = sexagesimal(c[3], false)
    } catch {
      continue
    }
    const code = c[0].trim()
    const z = firstNumber(c[8])
    found.push({
      name: /^\d{4}[a-z]+$/.test(code) ? `SN ${code}` : tidy(code), // « 2026sqf » : une supernova
      kind,
      type: c[7].trim(),
      host: hostOf(c[1]),
      ra,
      dec,
      mag,
      magDate: dayOf(c[6]),
      stale: c[5].includes('*'),
      peak: firstNumber(c[9]),
      peakDate: dayOf(c[10]),
      discovered: dayOf(c[11]),
      discoverer: c[12].trim(),
      aka: c[13]
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      z: z && z > 0 ? z : null,
    })
  }
  return found.sort((a, b) => a.mag - b.mag)
}

/**
 * Les mêmes objets d'après la page principale de « Latest Supernovae » (une fiche par objet, sans tableau), quand
 * la page des objets actifs est vide : la dernière magnitude y est datée du mois et du jour, le maximum entre
 * parenthèses. Les novae d'autres galaxies n'y sont pas. `today` : le jour de la lecture, pour l'année des mesures.
 */
export function parseSupernovaPage(text, today, keepMag = KEEP_MAG) {
  const found = []
  const anchors = [...text.matchAll(/<(?:a|li) id="(\d{4}[a-z]+)">/g)]
  anchors.forEach((anchor, i) => {
    const html = text.slice(anchor.index, anchors[i + 1]?.index ?? anchor.index + 6000)
    const plain = words(unescapeHtml(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')))
    const measure = /Mag (\d+(?:\.\d+)?)(\*?):(\d{1,2})\/(\d{1,2})(?: \((\d+(?:\.\d+)?):(\d{1,2})\/(\d{1,2})\))?, Type ([^\s(]+)/.exec(plain)
    const where = /R\.A\. = (\d+)h(\d+)m(\d+)s\.(\d+), Decl\. = ([+-]?\d+)°(\d+)'(\d+)"\.(\d+)/.exec(plain)
    if (!measure || !where) return
    const kind = kindOf(measure[8])
    const mag = Number(measure[1])
    if (kind == null || mag > keepMag) return
    const discovered = dayOf(/discovered (\d{4}\/\d{2}\/\d{2})/.exec(plain)?.[1])
    // « 11/10 » : le dernier 10 novembre passé
    const dated = (month, day) => {
      if (month == null) return null
      const year = Number(today.slice(0, 4))
      const guess = dayOf(`${year}/${month}/${day}`)
      return guess && guess > today ? dayOf(`${year - 1}/${month}/${day}`) : guess
    }
    const [h, m, s, sf, d, dm, ds, dsf] = where.slice(1)
    const decSign = d.startsWith('-') ? -1 : 1
    const z = firstNumber(/\(z(?:host)?=([\d.]+)\)/.exec(plain)?.[1])
    found.push({
      name: `${kind === 'nova' ? 'AT' : 'SN'} ${anchor[1]}`,
      kind,
      type: measure[8],
      host: (/Found in (.+?) at R\.A\./.exec(plain) ?? /\(host (.+?)\)/.exec(plain))?.[1]?.trim() ?? null,
      ra: Number(h) + Number(m) / 60 + Number(`${s}.${sf}`) / 3600,
      dec: decSign * (Math.abs(Number(d)) + Number(dm) / 60 + Number(`${ds}.${dsf}`) / 3600),
      mag,
      magDate: dated(measure[3], measure[4]),
      stale: measure[2] === '*',
      peak: measure[5] != null ? Number(measure[5]) : null,
      peakDate: dated(measure[6], measure[7]),
      discovered,
      discoverer: /discovered \S+ by (.+?)(?: Found in| at R\.A\.| \(host|$)/.exec(plain)?.[1]?.trim() ?? '',
      aka: [...plain.slice(0, 200).matchAll(/\(= ([^)]+)\)/g)].map((x) => tidy(x[1])),
      z: z && z > 0 ? z : null,
    })
  })
  return found.sort((a, b) => a.mag - b.mag)
}

/**
 * Les novae de notre galaxie de la liste de Koji Mukai, découvertes depuis `since` (un jour, ou null) : name (son nom
 * d'étoile variable, « V8056 Sgr », sinon son premier nom), kind « nova », type « Nova », host null, ra, dec, mag null
 * (la liste donne le maximum), peak, discovered, aka.
 */
export function parseNovae(text, since = null) {
  const found = []
  for (const [, row] of text.matchAll(ROW)) {
    const c = cells(row, true)
    if (c.length < 4) continue
    const names = c[0].split('\n').filter(Boolean)
    const position = c[1].split('\n')
    const discovered = dayOf(c[2])
    if (!names.length || position.length !== 2 || discovered == null) continue
    if (since != null && discovered < since) continue
    let ra
    let dec
    try {
      ra = sexagesimal(position[0], true)
      dec = sexagesimal(position[1], false)
    } catch {
      continue
    }
    const tidied = names.map(tidy)
    const variable = tidied.find((n) => /^V\d+ [A-Z][a-z]{2}$/.test(n))
    const name = variable ?? tidied[0]
    found.push({
      name,
      kind: 'nova',
      type: 'Nova',
      host: null,
      ra,
      dec,
      mag: null,
      magDate: null,
      stale: false,
      peak: firstNumber(c[3].split('\n')[0]),
      peakDate: null,
      discovered,
      discoverer: '',
      aka: tidied.filter((n) => n !== name),
      z: null,
    })
  }
  return found
}

/** L'angle entre deux objets (ra en heures, dec en degrés), en secondes d'arc. */
export function separationArcsec(a, b) {
  const DEG = Math.PI / 180
  const [ra1, dec1, ra2, dec2] = [a.ra * 15 * DEG, a.dec * DEG, b.ra * 15 * DEG, b.dec * DEG]
  const cosine = Math.sin(dec1) * Math.sin(dec2) + Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2)
  return (Math.acos(Math.max(-1, Math.min(1, cosine))) / DEG) * 3600
}

/**
 * Une seule liste : une nova de notre galaxie présente dans les deux est montrée une fois, sous son nom d'étoile
 * variable, avec la dernière magnitude de la page des supernovae.
 */
export function merge(supernovae, novae) {
  const merged = novae.map((n) => ({ ...n, aka: [...n.aka] }))
  for (const obj of supernovae) {
    const twin = merged.find((n) => obj.kind === 'nova' && separationArcsec(obj, n) <= SAME_ARCSEC)
    if (!twin) {
      merged.push({ ...obj, aka: [...obj.aka] })
      continue
    }
    Object.assign(twin, {
      mag: obj.mag,
      magDate: obj.magDate,
      stale: obj.stale,
      peakDate: obj.peakDate,
      discoverer: obj.discoverer || twin.discoverer,
    })
    const peaks = [twin.peak, obj.peak].filter((p) => p != null)
    twin.peak = peaks.length ? Math.min(...peaks) : null
    twin.aka = [...new Set([...twin.aka, obj.name, ...obj.aka])].filter((a) => a !== twin.name)
  }
  return merged
}

/**
 * Les objets à montrer, le plus brillant d'abord :
 *  - les supernovae et les novae d'autres galaxies plus brillantes que `magLimit` à une mesure des `recentDays`
 *    derniers jours (les plus anciennes se sont éteintes, ou plus personne ne les suit) ;
 *  - les novae de notre galaxie découvertes ces `novaDays` derniers jours dont le maximum (ou la dernière mesure) a
 *    été plus brillant que `magLimit`.
 */
export function chosen(objects, today, { magLimit = 15, novaDays = 365, recentDays = RECENT_DAYS } = {}) {
  const since = addDaysIso(today, -novaDays)
  const recent = addDaysIso(today, -recentDays)
  const isRecent = (o) => o.mag != null && (o.magDate ?? '0000-01-01') >= recent
  const out = objects.filter((o) => {
    if (o.host != null || o.kind === 'supernova') return o.mag != null && o.mag <= magLimit && (o.magDate ?? '0000-01-01') >= recent
    const known = [o.peak, o.mag].filter((m) => m != null)
    const brightest = known.length ? Math.min(...known) : null
    return o.discovered != null && o.discovered >= since && brightest != null && brightest <= magLimit
  })
  const brightness = (o) => (isRecent(o) ? o.mag : (o.peak ?? 30) + 5) // éteinte depuis son maximum
  return out.sort((a, b) => brightness(a) - brightness(b))
}

/**
 * La distance d'une galaxie de décalage vers le rouge `z` (loi de Hubble, 70 km/s/Mpc), en millions d'années-lumière ;
 * grossière pour les plus proches, que leur propre mouvement déplace.
 */
export const distanceMly = (z) => (!z || z <= 0 ? null : ((KM_S * z) / HUBBLE) * LY_PER_PC)
