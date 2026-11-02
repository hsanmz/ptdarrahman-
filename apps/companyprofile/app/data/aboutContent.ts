import type { AboutContent } from '@/app/lib/types'
import { storyChapters, storyVisual } from './aboutStory'

/** Fallback saat migrasi/seed belum dijalankan atau API sedang unavailable. */
export const fallbackAboutContent: AboutContent[] = [
  {
    id: 'fallback-hero', section: 'hero', order: 0,
    content: {
      page_title: 'Tentang Kami',
      badge: 'PROFIL INSTITUSI',
      kicker: 'Iman, ilmu, dan karya',
      title: 'Pendidikan yang menyiapkan hati dan masa depan.',
      subtitle: 'Kami memadukan pembinaan Al-Qur\'an dengan teknologi, bahasa, dan kepemimpinan dalam keseharian santri yang terarah.',
      image: storyVisual.image,
      image_alt: storyVisual.alt,
      image_name: storyVisual.name,
      image_role: storyVisual.role,
      cta_label: 'Kenali perjalanan kami',
      cta_href: '#perjalanan',
      secondary_cta_label: 'Pendaftaran PPDB',
    },
  },
  ...storyChapters.map((chapter, index) => ({
    id: `fallback-${chapter.id}`,
    section: 'story',
    order: index + 1,
    content: {
      kicker: chapter.kicker,
      title: chapter.title,
      body: chapter.body,
    },
  })),
  {
    id: 'fallback-story-heading', section: 'story-heading', order: 0,
    content: {
      eyebrow: 'Perjalanan kami',
      title: 'Bertumbuh dengan arah yang jelas.',
      body: 'Dari keyakinan sederhana, lahir ikhtiar pendidikan yang terus disempurnakan bersama keluarga besar pesantren.',
    },
  },
  {
    id: 'fallback-vision', section: 'vision', order: 0,
    content: {
      eyebrow: 'Visi',
      title: 'Visi & Misi',
      body: 'Menjadi Lembaga Pendidikan Terbaik bagi generasi Islam dengan memberikan penghayatan dan bekal hidup agar dapat berkembang menjadi generasi Islam yang berakhlak mulia, berkepribadian kuat, memiliki kompetensi hafizh Al-Quran dan IT serta berjiwa mandiri...',
    },
  },
  {
    id: 'fallback-mission', section: 'mission', order: 0,
    content: {
      eyebrow: 'Misi',
      title: 'MISI KAMI',
      items: [
        'Menciptakan lingkungan islami, bersih, dan nyaman',
        'Membina akidah lurus, akhlak mulia, dan pribadi tangguh',
        'Mencetak generasi penerus yang hafal Al-Qur\'an',
        'Menguasai kecakapan bidang informasi dan teknologi',
      ],
    },
  },
  {
    id: 'fallback-goals', section: 'goals', order: 0,
    content: {
      eyebrow: 'Tujuan',
      title: 'TUJUAN KAMI',
      items: [
        'Membangun peradaban Islam mulia di muka bumi',
        'Menumbuhkan kecintaan pada Allah dan Rasul-Nya',
        'Meningkatkan mutu umat melalui teknologi mutakhir',
        'Mencetak para pemimpin muslim dan penggerak dakwah',
      ],
    },
  },
  {
    id: 'fallback-values-heading', section: 'values-heading', order: 0,
    content: {
      eyebrow: 'Nilai inti',
      title: 'Karakter sebelum prestasi.',
      body: 'Kompetensi akan bertumbuh kuat ketika dibangun di atas adab, amanah, dan kepedulian.',
    },
  },
  ...[
    ['book-open', "Al-Qur'an sebagai fondasi", 'Hafalan, pemahaman, dan adab menjadi dasar setiap proses pendidikan.'],
    ['cpu', 'Cakap di dunia digital', 'Santri dibekali keterampilan teknologi yang relevan dan bertanggung jawab.'],
    ['heart', 'Akhlak dalam keseharian', 'Karakter baik dibentuk lewat kebiasaan, keteladanan, dan kehidupan bersama.'],
    ['shield-check', 'Amanah dan mandiri', 'Kejujuran, disiplin, dan keberanian mengambil tanggung jawab ditumbuhkan bertahap.'],
  ].map(([icon, title, description], index) => ({
    id: `fallback-value-${index}`,
    section: 'value',
    order: index + 1,
    content: { icon, title, description },
  })),
  {
    id: 'fallback-student-profile', section: 'student-profile', order: 0,
    content: {
      eyebrow: 'Profil santri',
      title: 'Bekal untuk menjadi pembawa manfaat.',
      icon: 'users',
      items: [
        'Bertaqwa dan berakhlak mulia',
        "Kuat dalam hafalan dan pemahaman Al-Qur'an",
        'Mampu berkomunikasi dan bekerja sama',
        'Terampil menggunakan teknologi secara bijak',
        'Percaya diri, disiplin, dan mandiri',
        'Siap membawa manfaat bagi masyarakat',
      ],
    },
  },
  {
    id: 'fallback-leadership-heading', section: 'leadership-heading', order: 0,
    content: {
      eyebrow: 'Struktur Organisasi',
      title: 'Susunan Pengurus Yayasan',
      body: 'Susunan pengurus Yayasan Generasi Cerdas Akhlak Mulia sebagai badan penyelenggara resmi PTDARRAHMAN.',
      link_label: 'Lihat Semua Guru & Staff',
      link_href: '/staff',
    },
  },
  {
    id: 'fallback-cta', section: 'cta', order: 0,
    content: {
      eyebrow: 'Langkah berikutnya',
      title: 'Mari kenalkan pendidikan terbaik untuk putra Anda.',
      body: 'Hubungi panitia atau mulai pendaftaran melalui portal resmi PTDARRAHMAN.',
      button_label: 'Mulai pendaftaran',
    },
  },
]
