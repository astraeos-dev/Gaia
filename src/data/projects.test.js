import { existsSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { ACTIVE_PROJECTS, PROJECTS, getProject, projectOfDomain } from './projects'
import { DOMAINS, getTool } from '../registry'
import { DOCUMENTS, PAGES, changelog, latestVersion, resolveLink } from '../projects/celeste/pages'

describe('les projets', () => {
  test('un identifiant et un dépôt chacun, sans doublon', () => {
    const ids = PROJECTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(PROJECTS.map((p) => p.repo)).size).toBe(PROJECTS.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
  })

  test('chaque projet actif a de quoi remplir sa section', () => {
    for (const p of ACTIVE_PROJECTS) {
      expect(p.title && p.tagline && p.kind && p.description, p.id).toBeTruthy()
      expect(p.links?.length, p.id).toBeGreaterThan(0)
      expect(p.logo, p.id).toMatch(/^projets\/[a-z-]+\.svg$/)
      expect(existsSync(new URL(`../../public/${p.logo}`, import.meta.url)), p.logo).toBe(true)
    }
  })

  test('les sections ne prennent pas l’adresse d’un espace d’outils', () => {
    const domains = new Set(DOMAINS.map((d) => d.id))
    for (const p of PROJECTS) expect(domains.has(p.id), p.id).toBe(false)
  })

  test('chaque espace d’outils vient d’un projet, et d’un seul', () => {
    for (const d of DOMAINS) {
      expect(PROJECTS.filter((p) => p.domains?.includes(d.id)), d.id).toHaveLength(1)
      expect(projectOfDomain(d.id), d.id).toBeDefined()
    }
    expect(projectOfDomain('astronomie').id).toBe('celeste')
  })

  test('les outils cités existent', () => {
    for (const p of PROJECTS) for (const id of p.tools ?? []) expect(getTool(id), `${p.id} → ${id}`).toBeDefined()
  })
})

describe('la section Céleste', () => {
  test('ses pages et sa documentation', () => {
    expect(PAGES.map((p) => p.id)).toContain('')
    for (const p of PAGES.filter((page) => page.source)) expect(p.source.length, p.id).toBeGreaterThan(500)
    expect(DOCUMENTS.length).toBeGreaterThanOrEqual(14)
    for (const d of DOCUMENTS) expect(d.title, d.slug).toBeTruthy()
    expect(DOCUMENTS.find((d) => d.slug === 'architecture').title).toBe('Architecture')
  })

  test('l’historique, sans l’avertissement aux mainteneurs, et la dernière version', () => {
    expect(changelog().startsWith('## ')).toBe(true)
    expect(latestVersion()).toBe(getProject('celeste').version)
  })

  test('les liens du wiki mènent aux pages du site, les autres vers GitHub', () => {
    expect(resolveLink('Architecture.md', 'docs/wiki')).toBe('#/celeste/documentation/architecture')
    expect(resolveLink('docs/INSTRUMENTS.md')).toBe('#/celeste/documentation/instruments')
    expect(resolveLink('CHANGELOG.md')).toBe('#/celeste/versions')
    expect(resolveLink('../../config.py', 'docs/wiki')).toBe('https://github.com/astraeos-dev/Celeste_App/blob/master/config.py')
    expect(resolveLink('LICENSE')).toBe('https://github.com/astraeos-dev/Celeste_App/blob/master/LICENSE')
  })
})
