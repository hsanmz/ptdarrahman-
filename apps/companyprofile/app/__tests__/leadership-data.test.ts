import { describe, expect, it } from 'vitest'
import {
  fallbackLeadershipBoards,
  groupLeadership,
} from '@/app/data/leadership'
import { storyChapters } from '@/app/data/aboutStory'

describe('fallback struktur pengurus (halaman About)', () => {
  it('memuat dua kelompok dengan 7 + 12 pengurus sesuai data resmi', () => {
    expect(fallbackLeadershipBoards).toHaveLength(2)
    expect(fallbackLeadershipBoards[0].board).toBe('yayasan')
    expect(fallbackLeadershipBoards[0].members).toHaveLength(7)
    expect(fallbackLeadershipBoards[1].board).toBe('islamic-center')
    expect(fallbackLeadershipBoards[1].members).toHaveLength(12)
  })

  it('setiap pengurus punya nama dan jabatan non-kosong', () => {
    for (const board of fallbackLeadershipBoards) {
      for (const member of board.members) {
        expect(member.name.trim().length).toBeGreaterThan(0)
        expect(member.position.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('patuh standar naming institusi (tanpa frasa terlarang)', () => {
    const dump = JSON.stringify(fallbackLeadershipBoards).toLowerCase()
    expect(dump).not.toContain('yayasan pesantren ar-rahman')
    expect(dump).not.toContain('yayasan pesantren ar rahman')
    expect(dump).not.toContain('"pesantren ar-rahman"')
    expect(dump).toContain("pesantren tahfidz qur'an dan digital ar-rahman")
  })
})

describe('groupLeadership (baris CMS → kelompok render)', () => {
  it('mengelompokkan per board, yayasan dulu, urut order_index ASC', () => {
    const boards = groupLeadership([
      { id: '3', board: 'islamic-center', order: 2, content: { name: 'Rang Kedua', position: 'X' } },
      { id: '1', board: 'yayasan', order: 1, content: { name: 'Yys', position: 'Pembina' } },
      { id: '2', board: 'islamic-center', order: 1, content: { name: 'Rang Pertama', position: 'X' } },
    ])
    expect(boards).toHaveLength(2)
    expect(boards[0].board).toBe('yayasan')
    expect(boards[1].board).toBe('islamic-center')
    expect(boards[1].members.map((m) => m.name)).toEqual(['Rang Pertama', 'Rang Kedua'])
  })

  it('baris tanpa nama dibuang dan board asing tetap tampil di belakang', () => {
    const boards = groupLeadership([
      { id: '1', board: 'yayasan', content: { name: 'Yys', position: 'Ketua' } },
      { id: '2', board: '', content: { name: '', position: 'Kosong' } },
      { id: '3', board: 'komite-siswa', content: { name: 'Siswa', position: 'Ketua Komite' } },
    ])
    expect(boards.map((b) => b.board)).toEqual(['yayasan', 'komite-siswa'])
    expect(boards[1].title).toBe('Komite Siswa')
  })
})

describe('naskah cerita PTD (sticky scroll)', () => {
  it('memuat 4 babak dengan judul yang ditetapkan panitia', () => {
    expect(storyChapters.map((c) => c.title)).toEqual([
      'Siapa Pak Eko?',
      'Kenapa PTD Dibangun?',
      'Bagaimana Sistemnya?',
      'Tujuan PTD Dibuat?',
    ])
  })

  it('setiap babak punya minimal satu paragraf isi', () => {
    for (const chapter of storyChapters) {
      expect(chapter.body.length).toBeGreaterThan(0)
      for (const p of chapter.body) expect(p.trim().length).toBeGreaterThan(0)
    }
  })
})
