// scripts/sync-celeste.mjs — recopie les documents de Céleste dans sa section du site.
// Usage : node scripts/sync-celeste.mjs <dossier du dépôt Celeste_App>
// Copie CHANGELOG.md, docs/*.md (en anglais) et docs/wiki/*.md (en français) dans
// src/projects/celeste/docs/, tels quels : la section les affiche et réécrit leurs liens.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const source = process.argv[2]
if (!source || !existsSync(join(source, 'CHANGELOG.md'))) {
  console.error('Usage : node scripts/sync-celeste.mjs <dossier du dépôt Celeste_App>')
  process.exit(1)
}
const target = new URL('../src/projects/celeste/docs/', import.meta.url).pathname
rmSync(target, { recursive: true, force: true })
mkdirSync(join(target, 'wiki'), { recursive: true })

const copied = []
copyFileSync(join(source, 'CHANGELOG.md'), join(target, 'CHANGELOG.md'))
copied.push('CHANGELOG.md')
for (const name of readdirSync(join(source, 'docs')).filter((n) => n.endsWith('.md'))) {
  copyFileSync(join(source, 'docs', name), join(target, name))
  copied.push(name)
}
for (const name of readdirSync(join(source, 'docs', 'wiki')).filter((n) => n.endsWith('.md') && !n.startsWith('_'))) {
  copyFileSync(join(source, 'docs', 'wiki', name), join(target, 'wiki', name))
  copied.push(`wiki/${name}`)
}
console.log(`${copied.length} documents recopiés : ${copied.join(', ')}`)
