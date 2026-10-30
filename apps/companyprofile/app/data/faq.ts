/**
 * Data FAQ statis — dikelola manual di sini, BUKAN lewat CMS.
 * Pertanyaan & jawaban resmi menyusul (diantar oleh Tim Humas/Hubin).
 * Selama array masih kosong, halaman /faq menampilkan empty state.
 */

export interface Faq {
  question: string
  answer: string
  /** Kategori opsional untuk pengelompokan, mis. "Pendaftaran". */
  category?: string
}

export const faqs: Faq[] = []
