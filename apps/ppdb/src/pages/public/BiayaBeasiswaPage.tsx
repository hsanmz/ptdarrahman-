import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPublicFees, type FeesSummary } from '@/services/feeService'
import { Button } from '@/components/ui'
import {
  CheckCircle2, QrCode, CreditCard,
  GraduationCap, UserPlus, LogIn,
  Coins, Tag, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function BiayaBeasiswaPage() {
  const navigate = useNavigate()
  const [fees, setFees] = useState<FeesSummary | null>(null)
  const [selectedDiscountView, setSelectedDiscountView] = useState<'regular' | 'early'>('regular')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicFees()
      .then((data) => setFees(data))
      .catch((err) => console.error('Failed to load public fees', err))
      .finally(() => setLoading(false))
  }, [])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const scholarships = [
    {
      id: 'sch-1',
      title: "Beasiswa Tahfidz Al-Qur'an 30 Juz",
      target: "Calon Santri Penghafal Al-Qur'an (Minimal 10 - 30 Juz Mutqin)",
      benefit: "Bebas Biaya Masuk & Uang Pangkal hingga 100% serta subsidi SPP",
      desc: "Diberikan khusus kepada ananda yang telah memiliki hafalan Al-Qur'an dengan bacaan tahsin bersanad dan lulus sidang Tasmi' terbuka oleh dewan penguji pesantren.",
      requirements: [
        "Memiliki syahadah / sertifikat hafalan minimal 10 juz dari lembaga / pondok asal",
        "Lulus uji petik hafalan (Tasmi' kelancaran, fashahah, dan tajwid) saat seleksi",
        "Menandatangani pakta komitmen menjaga hafalan dan menyelesaikan 30 juz mutqin",
      ],
      quota: "Kuota Terbatas (3 Santri / Angkatan)",
      tag: "Tahfidz Mutqin",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      id: 'sch-2',
      title: 'Beasiswa Prestasi Sains, Robotika & IT Digital',
      target: 'Peraih Medali / Juara Lomba Sains, Coding, atau Robotika',
      benefit: 'Potongan Uang Pangkal hingga 50% dan pembinaan intensif Lab IT',
      desc: 'Apresiasi bagi calon santri yang memiliki bakat dan rekam jejak juara dalam olimpiade matematika, sains, pembuatan software, maupun kejuaraan robotika tingkat kota/provinsi/nasional.',
      requirements: [
        "Piagam / sertifikat kejuaraan resmi (maksimal 2 tahun terakhir)",
        "Menunjukkan portofolio karya digital atau unjuk keterampilan saat sesi wawancara",
        "Lulus seleksi akademik dasar CBT PTDARRAHMAN",
      ],
      quota: "Kuota Terbatas (2 Santri / Angkatan)",
      tag: "Prestasi Digital",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    },
    {
      id: 'sch-3',
      title: 'Beasiswa Afirmasi Yatim & Dhuafa Berprestasi',
      target: 'Santri Berprestasi dari Keluarga Kurang Mampu / Yatim',
      benefit: 'Bantuan Biaya Pendidikan & Pemenuhan Perlengkapan Asrama',
      desc: 'Bentuk komitmen kepedulian sosial pesantren agar generasi penerus yang memiliki kesungguhan belajar tahfidz dan teknologi tidak terhalang oleh kendala finansial.',
      requirements: [
        "Surat Keterangan Kematian Orang Tua (untuk santri yatim)",
        "Surat Keterangan Tidak Mampu (SKTM) dari kelurahan / desa setempat",
        "Rapor akademik dengan nilai rata-rata baik dan rekomendasi guru",
        "Lolos verifikasi faktual dan wawancara komitmen orang tua/wali",
      ],
      quota: "Kuota Terbatas (2 Santri / Angkatan)",
      tag: "Afirmasi Sosial",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    },
  ]

  return (
    <div className="pt-24 pb-20">
      {/* ── Page Header ── */}
      <section className="relative overflow-hidden px-4 py-12 bg-gradient-to-b from-amber-50/50 via-white to-background border-b border-slate-100">
        <div className="container mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-900 border border-amber-200">
            <Coins className="h-3.5 w-3.5 text-amber-700" />
            <span>Transparansi Finansial PPDB</span>
          </span>

          <h1 className="mt-4 font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Rincian Biaya Pendidikan &amp; Beasiswa
          </h1>

          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            Investasi terbaik untuk mencetak generasi penghafal Al-Qur'an yang mahir rekayasa digital di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Seluruh komponen disajikan secara terbuka.
          </p>

          {/* Quick Summary Pill Cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {/* Form Fee Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                <QrCode className="h-4 w-4 text-emerald-600" />
                <span>Biaya Formulir (QRIS)</span>
              </div>
              <div className="mt-2 text-xl font-extrabold text-emerald-primary">
                {formatRupiah(fees?.formFee || 350000)}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Dibayar saat pendaftaran via QRIS (Non-Refundable).
              </p>
            </div>

            {/* Minimum DP Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                <CreditCard className="h-4 w-4 text-amber-600" />
                <span>Minimal Uang Muka (DP)</span>
              </div>
              <div className="mt-2 text-xl font-extrabold text-slate-900">
                {formatRupiah(fees?.minimumDp || 3000000)}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Penyetoran pasca-kelulusan saat konfirmasi LoA resmi.
              </p>
            </div>

            {/* Early Bird Quota Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                <Tag className="h-4 w-4 text-blue-600" />
                <span>Diskon Pendaftar Awal</span>
              </div>
              <div className="mt-2 text-xl font-extrabold text-blue-600">
                Kuota {fees?.earlyDiscountQuota || 10} Santri
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Otomatis diperoleh {fees?.earlyDiscountQuota || 10} pembayar formulir pertama.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Table / Breakdown Biaya Masuk ── */}
      <section className="container mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-primary">
              Tahun Ajaran {fees?.academicYear || '2026/2027'} • {fees?.waveName || 'Gelombang 1'}
            </span>
            <h2 className="mt-1 font-heading text-2xl font-extrabold text-slate-900">
              Rincian Komponen Biaya Masuk
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Komponen biaya standar institusi yang berlaku untuk seluruh santri baru.
            </p>
          </div>

          {/* Toggle View: Reguler vs Early Bird */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 self-start md:self-auto">
            <button
              onClick={() => setSelectedDiscountView('regular')}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                selectedDiscountView === 'regular'
                  ? 'bg-white text-emerald-primary shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Skema Diskon Reguler
            </button>
            <button
              onClick={() => setSelectedDiscountView('early')}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                selectedDiscountView === 'early'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Skema Diskon Early Bird
            </button>
          </div>
        </div>

        {/* Fees Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-4 px-4 sm:px-6">No</th>
                  <th className="py-4 px-4 sm:px-6">Komponen Biaya</th>
                  <th className="py-4 px-4 sm:px-6 text-right">Biaya Standar</th>
                  <th className="py-4 px-4 sm:px-6 text-right">
                    {selectedDiscountView === 'regular' ? 'Diskon Reguler' : 'Diskon Early Bird'}
                  </th>
                  <th className="py-4 px-4 sm:px-6 text-right">Nominal Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-6 text-center text-xs text-slate-400 animate-pulse">
                      Memuat rincian biaya...
                    </td>
                  </tr>
                ) : (
                fees?.items.map((item, idx) => {
                  const discountAmt =
                    selectedDiscountView === 'regular'
                      ? item.regularDiscountAmount
                      : item.earlyDiscountAmount
                  const finalPrice =
                    selectedDiscountView === 'regular'
                      ? item.regularFinalPrice
                      : item.earlyFinalPrice

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 sm:px-6 font-semibold text-slate-400 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right font-medium text-slate-600 whitespace-nowrap">
                        {formatRupiah(item.nominal)}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        {discountAmt > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 rounded-md">
                            -{formatRupiah(discountAmt)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatRupiah(finalPrice)}
                      </td>
                    </tr>
                  )
                })
                )}
              </tbody>
              <tfoot>
                {/* Total Row */}
                <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-slate-900">
                  <td colSpan={2} className="py-5 px-4 sm:px-6 font-heading text-base">
                    Total Biaya Masuk Pendidikan
                  </td>
                  <td className="py-5 px-4 sm:px-6 text-right font-medium text-slate-400 line-through">
                    {formatRupiah(fees?.totalOriginal || 16500000)}
                  </td>
                  <td className="py-5 px-4 sm:px-6 text-right text-emerald-600 font-extrabold">
                    -
                    {formatRupiah(
                      selectedDiscountView === 'regular'
                        ? fees?.totalRegularDiscount || 1500000
                        : fees?.totalEarlyDiscount || 2500000
                    )}
                  </td>
                  <td className="py-5 px-4 sm:px-6 text-right font-heading text-lg sm:text-xl font-extrabold text-emerald-primary whitespace-nowrap">
                    {formatRupiah(
                      selectedDiscountView === 'regular'
                        ? fees?.totalRegularFinal || 15000000
                        : fees?.totalEarlyFinal || 14000000
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Kebijakan Penyetoran Di Luar Aplikasi (Aturan Kritis) */}
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50/60 p-6 sm:p-7">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-heading text-base font-bold text-amber-950">
                Mekanisme Penyetoran Biaya Pendidikan (Di Luar Aplikasi)
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-amber-900/80 leading-relaxed">
                Di dalam portal aplikasi PPDB pendaftar <strong>hanya melunasi biaya formulir</strong> (via QRIS resmi). Penyetoran Uang Muka (DP) maupun pelunasan biaya pendidikan santri yang telah lulus <strong>dilakukan di luar aplikasi</strong> (melalui transfer rekening resmi PTDARRAHMAN atau tunai ke kantor bendahara pesantren). Alur pendaftaran portal PPDB tuntas pada penandatanganan Letter of Acceptance (LoA) resmi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section Beasiswa ── */}
      <section className="bg-slate-50/70 py-14 border-t border-slate-200/80">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Program Beasiswa Santri</span>
            </span>
            <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
              Peluang Beasiswa Prestasi &amp; Afirmasi
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              Pesantren Tahfidz Qur'an dan Digital Ar-Rahman membuka jalur beasiswa bagi santri yang memiliki capaian hafalan Al-Qur'an istimewa atau prestasi kejuaraan IT.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scholarships.map((sch) => (
              <div
                key={sch.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn('rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold', sch.badgeColor)}>
                      {sch.tag}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {sch.quota}
                    </span>
                  </div>

                  <h3 className="font-heading text-lg font-bold text-slate-900">
                    {sch.title}
                  </h3>
                  <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl p-2.5 border border-emerald-100">
                    {sch.benefit}
                  </div>

                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                    {sch.desc}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Kriteria &amp; Syarat:
                    </div>
                    <ul className="space-y-1.5">
                      {sch.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400 italic">
                    *Seleksi berkas beasiswa diverifikasi langsung saat wawancara santri &amp; wali.
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Callout */}
          <div className="mt-12 rounded-3xl bg-gradient-to-r from-emerald-primary to-emerald-dark p-8 text-center text-white shadow-xl">
            <h3 className="font-heading text-xl sm:text-2xl font-extrabold">
              Amankan Kuota Diskon Pendaftar Awal Sekarang
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-emerald-100 max-w-lg mx-auto">
              Slot diskon pendaftar awal otomatis terkunci saat pembayaran formulir terkonfirmasi oleh sistem QRIS Pakasir.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => navigate('/register')}
                className="rounded-full bg-gold-accent px-8 py-3 text-sm font-bold text-emerald-950 shadow-md hover:bg-gold-light"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Daftar &amp; Dapatkan Kuota
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/auth/login')}
                className="rounded-full border-white/30 bg-white/10 px-7 py-3 text-sm font-bold text-white hover:bg-white/20"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Masuk / Login
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
