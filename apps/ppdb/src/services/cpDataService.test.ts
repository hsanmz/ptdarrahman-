import { describe, it, expect } from 'vitest'
import { FALLBACK_PROGRAMS, FALLBACK_FACILITIES } from './cpDataService'

describe('cpDataService', () => {
  it('has comprehensive fallback programs matching PTDARRAHMAN pillars', () => {
    expect(FALLBACK_PROGRAMS.length).toBeGreaterThanOrEqual(4)
    const titles = FALLBACK_PROGRAMS.map((p) => p.title.toLowerCase())
    expect(titles.some((t) => t.includes('tahfidz'))).toBe(true)
    expect(titles.some((t) => t.includes('digital') || t.includes('teknologi'))).toBe(true)
  })

  it('has comprehensive fallback facilities matching boarding school needs', () => {
    expect(FALLBACK_FACILITIES.length).toBeGreaterThanOrEqual(5)
    const names = FALLBACK_FACILITIES.map((f) => f.name.toLowerCase())
    expect(names.some((n) => n.includes('programming'))).toBe(true)
    expect(names.some((n) => n.includes('musholla'))).toBe(true)
    expect(names.some((n) => n.includes('asrama'))).toBe(true)
  })
})
