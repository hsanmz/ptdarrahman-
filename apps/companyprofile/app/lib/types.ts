export interface NewsContent {
  title?: string
  excerpt?: string
  author?: string
  content?: string
  body?: string
}

export interface ProgramContent {
  title?: string
  tagline?: string
  desc?: string
  duration?: string
  level?: string
  highlights?: string[]
  curriculum?: string[]
  outcomes?: string[]
}

export interface FacilityContent {
  name?: string
  desc?: string
  features?: string[]
}

export interface StaffContent {
  name?: string
  position?: string
  bio?: string
  expertise?: string[]
  parentId?: string
  order?: number
}

export interface AchievementContent {
  title?: string
  desc?: string
  scope?: string
}

export interface GalleryContent {
  title?: string
  desc?: string
}

export interface TestimonialContent {
  quote?: string
  text?: string
}

export interface NewsArticle {
  id: string
  slug: string
  image: string
  category: string
  date: string
  gallery?: string[]
  content: NewsContent | null
}

export interface Program {
  id: string
  slug: string
  icon: string
  image: string
  /** Urutan tampil (ASC) untuk menu Program & daftar program. */
  order?: number
  content: ProgramContent | null
}

export interface Facility {
  id: string
  image: string
  category: string
  content: FacilityContent | null
}

export interface Staff {
  id: string
  image: string
  role: string
  content: StaffContent | null
}

export interface LeadershipContent {
  name?: string
  position?: string
  image?: string
}

/** Baris CMS `leadership_members` — struktur organisasi khusus halaman About. */
export interface LeadershipMember {
  id: string
  /** Kunci kelompok organisasi, contoh: 'yayasan' | 'islamic-center'. */
  board: string
  order?: number
  content: LeadershipContent | null
}

/** Kelompok pengurus siap render per lembaga (hasil grouping di app/data/leadership.ts). */
export interface LeadershipBoard {
  board: string
  title: string
  members: Array<{ name: string; position: string; image?: string; order?: number }>
}

export interface AboutContentData {
  kicker?: string
  page_title?: string
  badge?: string
  eyebrow?: string
  title?: string
  subtitle?: string
  body?: string | string[]
  items?: string[]
  description?: string
  icon?: string
  image?: string
  image_alt?: string
  image_name?: string
  image_role?: string
  cta_label?: string
  cta_href?: string
  secondary_cta_label?: string
  button_label?: string
  button_href?: string
  link_label?: string
  link_href?: string
  stat_1_value?: string | number
  stat_1_suffix?: string
  stat_1_label?: string
  stat_2_value?: string | number
  stat_2_suffix?: string
  stat_2_label?: string
  stat_3_value?: string | number
  stat_3_suffix?: string
  stat_3_label?: string
  stat_4_value?: string | number
  stat_4_suffix?: string
  stat_4_label?: string
  [key: string]: unknown
}

/** Satu blok yang dikelola dari tab CRUD Tentang Kami. */
export interface AboutContent {
  id: string
  section: string
  order?: number
  content: AboutContentData | null
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  category?: string
  order?: number
}

export interface Achievement {
  id: string
  year: number
  image: string
  content: AchievementContent | null
}

export interface GalleryItem {
  id: string
  image: string
  category: string
  content: GalleryContent | null
}

export interface Testimonial {
  id: string
  name: string
  child: string
  image: string
  order: number
  content: TestimonialContent | null
}

// ── Hero beranda (dikelola dari CMS Company Profile) ────────────────────

export interface HeroSlideContent {
  height_mode?: 'full' | 'peek' | string
}

export interface HomeCtaContent {
  enabled: boolean
  title: string
  description: string
  button_text: string
  button_url: string
  layout: 'left' | 'right'
}

export interface HeroSlide {
  id: string
  image?: string | null
  order?: number
  content: HeroSlideContent | null
}

export interface SocialLink {
  id: string
  label: string
  href: string
  path: string
}

// ── Konten statis landing PPDB (`app/lib/ppdbContent.ts`) ────────────────

export interface PpdbJalurContent {
  order?: number
  accent?: string
  kicker?: string
  title?: string
  desc?: string
  items?: string[]
  cta_label?: string
  cta_href?: string
}

export interface PpdbJalurCard {
  id: string
  icon?: string | null
  content: PpdbJalurContent | null
}

export interface PpdbPillarContent {
  order?: number
  title?: string
  desc?: string
}

export interface PpdbPillar {
  id: string
  icon?: string | null
  content: PpdbPillarContent | null
}

export interface PpdbStepContent {
  order?: number
  title?: string
  desc?: string
}

export interface PpdbStep {
  id: string
  content: PpdbStepContent | null
}

export interface PpdbCopyContent {
  // Copy hero 3D `/ppdb` — kini statis (lihat `ppdbContent.ts`).
  hero_title?: string
  hero_desc?: string
  /** Poin unggulan, item dipisah `|` — mis. "30 Juz | 2 Jenjang | 1 Ekosistem". */
  hero_proof?: string
  hero_cta_label?: string
  hero_cta_href?: string
  hero_register_label?: string
  hero_register_href?: string
  jalur_title?: string
  jalur_desc?: string
  kurikulum_title?: string
  kurikulum_desc?: string
  alur_kicker?: string
  alur_title?: string
  cta_title?: string
  cta_desc?: string
  cta_primary_label?: string
  cta_primary_href?: string
  cta_secondary_label?: string
  cta_secondary_href?: string
}

export interface ContactInfo {
  id: string
  address: string
  phone_primary: string
  phone_secondary: string
  whatsapp: string
  email_primary: string
  email_admission: string
  office_hours: string | null
  maps_embed?: string | null
}

export interface SettingsItem {
  key: string
  value: string
}
