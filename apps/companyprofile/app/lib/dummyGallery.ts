import type { GalleryItem } from '@/app/lib/types'

const U = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=1200&auto=format&fit=crop`

const DUMMY_GALLERY: GalleryItem[] = [
  {
    id: 'dummy-campus-1',
    image: U('1524178232363-1fb2b075b655'),
    category: 'Fasilitas & Lingkungan',
    content: { title: 'Kampus Ar-Rahman', desc: 'Lingkungan kampus yang nyaman untuk belajar dan bertumbuh.' },
  },
  {
    id: 'dummy-academic-1',
    image: U('1509062522246-3755977927d7'),
    category: "Kegiatan Tahfidz & Al-Qur'an",
    content: { title: 'Kelas Tahfidz', desc: "Kegiatan setoran dan murojaah Al-Qur'an bersama pembimbing." },
  },
  {
    id: 'dummy-sports-1',
    image: U('1571902943202-507ec2618e8f'),
    category: 'Olahraga & Kebugaran',
    content: { title: 'Olahraga Santri', desc: 'Aktivitas olahraga untuk menjaga kebugaran dan kekompakan santri.' },
  },
  {
    id: 'dummy-campus-2',
    image: U('1589182373726-e4f658ab50f0'),
    category: 'Kegiatan Pesantren',
    content: { title: 'Halaman Pesantren', desc: 'Sudut lingkungan pesantren dalam keseharian santri.' },
  },
  {
    id: 'dummy-academic-2',
    image: U('1517694712202-14dd9538aa97'),
    category: 'Kegiatan Akademik',
    content: { title: 'Lab Komputer', desc: 'Ruang belajar teknologi digital dan praktik komputer.' },
  },
  {
    id: 'dummy-events-1',
    image: U('1540575467063-178a50c2df87'),
    category: 'Kegiatan Santri',
    content: { title: 'Kegiatan Santri', desc: 'Dokumentasi aktivitas santri dalam suasana kebersamaan.' },
  },
  {
    id: 'dummy-arts-1',
    image: U('1460661419201-fd4cecdf8a8b'),
    category: 'Seni & Kreativitas',
    content: { title: 'Seni & Kaligrafi', desc: 'Karya seni dan kaligrafi hasil kreativitas santri.' },
  },
  {
    id: 'dummy-academic-3',
    image: U('1503676260728-1c00da094a0b'),
    category: 'Kegiatan Akademik',
    content: { title: 'Belajar Kelas', desc: 'Suasana pembelajaran akademik di kelas.' },
  },
  {
    id: 'dummy-events-2',
    image: U('1492684223066-81342ee5ff30'),
    category: 'Acara & Perayaan',
    content: { title: 'Acara Pesantren', desc: 'Momen kebersamaan dalam acara pesantren.' },
  },
  {
    id: 'dummy-campus-3',
    image: U('1523240795612-9a054b0db644'),
    category: 'Wisuda & Kelulusan',
    content: { title: 'Wisuda Santri', desc: 'Perayaan kelulusan dan capaian santri.' },
  },
]

export function getGalleryDummyFallback(gallery: GalleryItem[] | null): GalleryItem[] {
  return gallery && gallery.length > 0 ? gallery : DUMMY_GALLERY
}
