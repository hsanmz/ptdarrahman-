import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

import GalleryPhotoGrid from '../(main)/gallery/_components/GalleryPhotoGrid'
import type { GalleryItem } from '../lib/types'

afterEach(cleanup)

function makeItem(index: number): GalleryItem {
  return {
    id: `foto-${index}`,
    image: `https://res.cloudinary.com/demo/image/upload/foto-${index}.jpg`,
    category: 'Kegiatan Santri',
    content: { title: `Foto ${index}` },
  }
}

describe('GalleryPhotoGrid', () => {
  it('merender thumbnail dan memanggil onSelect saat diklik', () => {
    const items = [makeItem(1), makeItem(2)]
    const onSelect = vi.fn()

    render(<GalleryPhotoGrid items={items} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /Buka foto Foto 1/ }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(items[0])
  })

  it('memotong daftar ke 12 foto lalu membuka sisanya lewat "Lihat semua"', () => {
    const items = Array.from({ length: 15 }, (_, i) => makeItem(i + 1))

    render(<GalleryPhotoGrid items={items} onSelect={vi.fn()} />)

    expect(screen.queryByText('Foto 13')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Lihat semua 15 foto/ }))

    expect(screen.getByText('Foto 13')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Tampilkan lebih sedikit/ })).toBeTruthy()
  })

  it('tidak merender apa pun saat tidak ada foto', () => {
    const { container } = render(<GalleryPhotoGrid items={[]} onSelect={vi.fn()} />)

    expect(container.innerHTML).toBe('')
  })
})
