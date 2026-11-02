import { apiFetch } from '@/api/client'

export interface FeeItemPublic {
  id: string
  name: string
  nominal: number
  description?: string | null
  order_index?: number
  discount_type?: 'nominal' | 'percent' | null
  discount_value?: number
  early_discount_type?: 'nominal' | 'percent' | null
  early_discount_value?: number
}

export interface PublicFeesResponse {
  active: boolean
  wave_id?: string
  wave_name?: string
  period_id?: string
  period_name?: string | null
  academic_year?: string | null
  form_fee: number
  minimum_dp: number
  early_discount_quota: number
  items: FeeItemPublic[]
}

export interface CalculatedFeeItem extends FeeItemPublic {
  regularDiscountAmount: number
  regularFinalPrice: number
  earlyDiscountAmount: number
  earlyFinalPrice: number
}

export interface FeesSummary {
  formFee: number
  minimumDp: number
  totalOriginal: number
  totalRegularDiscount: number
  totalRegularFinal: number
  totalEarlyDiscount: number
  totalEarlyFinal: number
  items: CalculatedFeeItem[]
  earlyDiscountQuota: number
  waveName: string
  academicYear: string
  active: boolean
}

export const FALLBACK_FEES_SUMMARY: FeesSummary = {
  formFee: 350000,
  minimumDp: 3000000,
  totalOriginal: 16500000,
  totalRegularDiscount: 1500000,
  totalRegularFinal: 15000000,
  totalEarlyDiscount: 2500000,
  totalEarlyFinal: 14000000,
  earlyDiscountQuota: 10,
  waveName: 'Gelombang 1',
  academicYear: '2026/2027',
  active: true,
  items: [
    {
      id: 'item-1',
      name: 'Uang Pangkal & Pengembangan Sarana',
      nominal: 8000000,
      description: 'Biaya fasilitas asrama, lab programming, musholla, dan ranjang mukim selama menempuh pendidikan.',
      discount_type: 'nominal',
      discount_value: 1000000,
      early_discount_type: 'nominal',
      early_discount_value: 1500000,
      regularDiscountAmount: 1000000,
      regularFinalPrice: 7000000,
      earlyDiscountAmount: 1500000,
      earlyFinalPrice: 6500000,
    },
    {
      id: 'item-2',
      name: 'SPP Bulan Pertama (Pendidikan & Konsumsi Makan 3x Sehari)',
      nominal: 1800000,
      description: 'Meliputi biaya kegiatan santri, asuhan muhaffidz, bimbingan IT, dan makan bergizi 3x sehari.',
      discount_type: null,
      discount_value: 0,
      early_discount_type: null,
      early_discount_value: 0,
      regularDiscountAmount: 0,
      regularFinalPrice: 1800000,
      earlyDiscountAmount: 0,
      earlyFinalPrice: 1800000,
    },
    {
      id: 'item-3',
      name: 'Paket Seragam Resmi Santri (5 Pasang)',
      nominal: 1700000,
      description: 'Seragam Gamis Putih Shalat, Seragam Batik, Seragam Pramuka, Seragam Olahraga, dan Jas Santri Resmi.',
      discount_type: null,
      discount_value: 0,
      early_discount_type: null,
      early_discount_value: 0,
      regularDiscountAmount: 0,
      regularFinalPrice: 1700000,
      earlyDiscountAmount: 0,
      earlyFinalPrice: 1700000,
    },
    {
      id: 'item-4',
      name: 'Buku Ajar, Al-Qur\'an Mushaf Rasm Utsmani & Kitab Halaqah',
      nominal: 1500000,
      description: 'Paket mushaf tajwid bersanad, kitab matan tajwid, buku modul rekayasa web Next.js/IoT, dan buku ajar.',
      discount_type: 'nominal',
      discount_value: 200000,
      early_discount_type: 'nominal',
      early_discount_value: 400000,
      regularDiscountAmount: 200000,
      regularFinalPrice: 1300000,
      earlyDiscountAmount: 400000,
      earlyFinalPrice: 1100000,
    },
    {
      id: 'item-5',
      name: 'Matrikulasi & Perlengkapan Asrama (Kasur, Sprei, Loker)',
      nominal: 2500000,
      description: 'Paket masa ta\'aruf dan orientasi (Khutbatul Arsy), pembekalan adab, kasur asrama, sprei, dan loker pakaian.',
      discount_type: 'nominal',
      discount_value: 300000,
      early_discount_type: 'nominal',
      early_discount_value: 600000,
      regularDiscountAmount: 300000,
      regularFinalPrice: 2200000,
      earlyDiscountAmount: 600000,
      earlyFinalPrice: 1900000,
    },
    {
      id: 'item-6',
      name: 'Kegiatan Santri Tahunan & Uji Tasmi Terbuka',
      nominal: 1000000,
      description: 'Iuran kegiatan rihlah tahunan, ujian Tasmi Bil Ghoib live streaming, wisuda tahfidz, dan kompetisi santri.',
      discount_type: null,
      discount_value: 0,
      early_discount_type: null,
      early_discount_value: 0,
      regularDiscountAmount: 0,
      regularFinalPrice: 1000000,
      earlyDiscountAmount: 0,
      earlyFinalPrice: 1000000,
    },
  ],
}

export function computeFeeItem(item: FeeItemPublic): CalculatedFeeItem {
  const nominal = Number(item.nominal) || 0

  // Regular discount
  let regularDiscount = 0
  if (item.discount_type === 'percent') {
    const pct = Number(item.discount_value) || 0
    regularDiscount = Math.round((nominal * pct) / 100)
  } else if (item.discount_type === 'nominal') {
    regularDiscount = Number(item.discount_value) || 0
  }
  regularDiscount = Math.min(nominal, Math.max(0, regularDiscount))
  const regularFinal = nominal - regularDiscount

  // Early bird discount
  let earlyDiscount = 0
  if (item.early_discount_type === 'percent') {
    const pct = Number(item.early_discount_value) || 0
    earlyDiscount = Math.round((nominal * pct) / 100)
  } else if (item.early_discount_type === 'nominal') {
    earlyDiscount = Number(item.early_discount_value) || 0
  }
  earlyDiscount = Math.min(nominal, Math.max(0, earlyDiscount))
  const earlyFinal = nominal - earlyDiscount

  return {
    ...item,
    regularDiscountAmount: regularDiscount,
    regularFinalPrice: regularFinal,
    earlyDiscountAmount: earlyDiscount,
    earlyFinalPrice: earlyFinal,
  }
}

export async function fetchPublicFees(): Promise<FeesSummary> {
  try {
    const res = await apiFetch<PublicFeesResponse>('/ppdb/waves/active-public/fees')
    if (res && res.items && res.items.length > 0) {
      const calculatedItems = res.items.map(computeFeeItem)
      const totalOriginal = calculatedItems.reduce((acc, it) => acc + (Number(it.nominal) || 0), 0)
      const totalRegularDiscount = calculatedItems.reduce((acc, it) => acc + it.regularDiscountAmount, 0)
      const totalRegularFinal = calculatedItems.reduce((acc, it) => acc + it.regularFinalPrice, 0)
      const totalEarlyDiscount = calculatedItems.reduce((acc, it) => acc + it.earlyDiscountAmount, 0)
      const totalEarlyFinal = calculatedItems.reduce((acc, it) => acc + it.earlyFinalPrice, 0)

      return {
        formFee: Number(res.form_fee) || FALLBACK_FEES_SUMMARY.formFee,
        minimumDp: Number(res.minimum_dp) || FALLBACK_FEES_SUMMARY.minimumDp,
        totalOriginal,
        totalRegularDiscount,
        totalRegularFinal,
        totalEarlyDiscount,
        totalEarlyFinal,
        items: calculatedItems,
        earlyDiscountQuota: res.early_discount_quota || 0,
        waveName: res.wave_name || 'Gelombang Aktif',
        academicYear: res.academic_year || '2026/2027',
        active: res.active ?? true,
      }
    }
  } catch {
    // If backend doesn't have active fee items yet, fallback gracefully
  }

  return FALLBACK_FEES_SUMMARY
}
