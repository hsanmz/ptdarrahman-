import { describe, it, expect } from 'vitest'

import { galleryFilterOptions } from '../lib/gallery-categories'

describe('galleryFilterOptions', () => {
  it('mengurutkan kategori standar sesuai daftar resmi lalu menaruh kategori kustom di belakang', () => {
    const options = galleryFilterOptions([
      'Seni & Kreativitas',
      'campus',
      'Kegiatan Akademik',
      'Kegiatan Akademik',
      '',
      null,
    ])

    expect(options).toEqual([
      { value: 'Kegiatan Akademik', label: 'Kegiatan Akademik' },
      { value: 'Seni & Kreativitas', label: 'Seni & Kreativitas' },
      { value: 'campus', label: 'campus' },
    ])
  })

  it('mencocokkan kategori lama tanpa membuang nilai aslinya', () => {
    expect(galleryFilterOptions(['kegiatan akademik'])).toEqual([
      { value: 'kegiatan akademik', label: 'Kegiatan Akademik' },
    ])
  })

  it('mengembalikan daftar kosong saat tidak ada kategori', () => {
    expect(galleryFilterOptions([])).toEqual([])
  })
})
