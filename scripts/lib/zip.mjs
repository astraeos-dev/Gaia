/**
 * scripts/lib/zip.mjs — le premier fichier XML d'une archive ZIP, sans dépendance
 * ==============================================================================
 * Les prédictions de l'IOTA arrivent dans une archive d'un seul fichier (<année>-iota.zip). Le répertoire central de
 * l'archive donne chaque fichier, son mode de compression (0 : stocké, 8 : deflate) et sa place ; zlib le décompresse.
 */
import { inflateRawSync } from 'node:zlib'

const MAX_UNZIPPED = 64 * 1024 * 1024 // un an de prédictions fait 3 à 4 Mo décompressé

/** Le texte du premier fichier .xml de l'archive `buffer` ; une erreur pour une archive illisible. */
export function firstXmlOfZip(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) // fin du répertoire central
  if (end < 0) throw new Error('archive illisible (pas de répertoire central)')
  const count = buffer.readUInt16LE(end + 10)
  let at = buffer.readUInt32LE(end + 16)
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(at) !== 0x02014b50) throw new Error('archive illisible (répertoire central)')
    const method = buffer.readUInt16LE(at + 10)
    const compressed = buffer.readUInt32LE(at + 20)
    const size = buffer.readUInt32LE(at + 24)
    const nameLength = buffer.readUInt16LE(at + 28)
    const extraLength = buffer.readUInt16LE(at + 30)
    const commentLength = buffer.readUInt16LE(at + 32)
    const local = buffer.readUInt32LE(at + 42)
    const name = buffer.toString('utf8', at + 46, at + 46 + nameLength)
    at += 46 + nameLength + extraLength + commentLength
    if (!name.toLowerCase().endsWith('.xml')) continue
    if (size > MAX_UNZIPPED) throw new Error('fichier de prédictions trop grand')
    if (buffer.readUInt32LE(local) !== 0x04034b50) throw new Error('archive illisible (en-tête local)')
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28)
    const data = buffer.subarray(start, start + compressed)
    if (method === 0) return data.toString('utf8')
    if (method === 8) return inflateRawSync(data, { maxOutputLength: MAX_UNZIPPED }).toString('utf8')
    throw new Error(`compression ${method} non prise en charge`)
  }
  throw new Error('pas de fichier de prédictions dans l’archive')
}
