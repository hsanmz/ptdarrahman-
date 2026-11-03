import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/api/client'
import { Button } from '@/components/ui'
import {
  CalendarCheck, Clock, UserPlus, QrCode, FileUp, Laptop, Users,
  Award, MessageSquare, CheckCircle2, BellRing, LogIn
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveWaveInfo {
  active: boolean
  name?: string
  academic_year?: string
  registration_start_date?: string | null
  registration_end_date?: string | null
  quota?: number
  paid_count?: number
}

export default function AlurJadwalPage() {
  const navigate = useNavigate()
  const [wave, setWave] = useState<ActiveWaveInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<ActiveWaveInfo>('/ppdb/waves/active-public')
      .then((data) => setWave(data))
      .catch(() => setWave({ active: false }))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Menyusul'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const steps = [
    {
      step: 'Tahap 1',
      title: 'Pendaftaran Akun Online',
      desc: 'Orang tua / calon santri mengisi formulir pendaftaran 6 bagian: Identitas Santri, Data Orang Tua/Wali, Kontak, Domisili, Kuesioner Kesehatan (10 pertanyaan), dan Pernyataan Kebenaran.',
      icon: UserPlus,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Registrasi Akun',
    },
    {
      step: 'Tahap 2',
      title: 'Pembayaran Formulir (QRIS)',
      desc: 'Melunasi biaya formulir pendaftaran menggunakan QRIS dinamis real-time (Pakasir v2). Setelah sukses, kuota gelombang berkurang secara atomik dan Kuitansi Resmi bertanda tangan HMAC terbit.',
      icon: QrCode,
      color: 'from-amber-500 to-yellow-600',
      badge: 'QRIS Otomatis',
    },
    {
      step: 'Tahap 3',
      title: 'Unggah & Verifikasi Berkas',
      desc: 'Mengunggah 6 dokumen persyaratan resmi (NISN, KK, Akta Kelahiran, Pas Foto, KTP Orang Tua, dan 4 Rapor Terakhir) untuk diverifikasi kelayakannya oleh panitia di backoffice.',
      icon: FileUp,
      color: 'from-blue-500 to-indigo-600',
      badge: 'Verifikasi Berkas',
    },
    {
      step: 'Tahap 4',
      title: 'Ujian Seleksi Terpadu (CBT & Tahfidz)',
      desc: 'Peserta mengikuti Seleksi Akademik & Psikologi berbasis CBT (durasi waktu terukur, anti-cheat, PIN sesi) serta Ujian Tahfidz massal sesuai jadwal batch yang ditentukan otomatis.',
      icon: Laptop,
      color: 'from-purple-500 to-violet-600',
      badge: 'CBT & Tahfidz',
    },
    {
      step: 'Tahap 5',
      title: 'Wawancara Terpadu (Santri & Ortu)',
      desc: 'Wawancara komprehensif satu waktu bersamaan antara calon santri (kesiapan mandiri & motivasi belajar) dan orang tua/wali santri (komitmen pendidikan & keselarasan visi pesantren).',
      icon: Users,
      color: 'from-teal-500 to-cyan-600',
      badge: 'Wawancara Terpadu',
    },
    {
      step: 'Tahap 6',
      title: 'Pengumuman Kelulusan & LoA Digital',
      desc: 'Panitia merilis hasil kelulusan seleksi. Calon santri yang dinyatakan diterima mengunduh Letter of Acceptance (LoA) resmi dan menandatanganinya secara digital bersama orang tua (Alur PPDB Tuntas, is_locked = true).',
      icon: Award,
      color: 'from-emerald-600 to-emerald-800',
      badge: 'Tuntas & LoA Signed',
    },
    {
      step: 'Tahap 7',
      title: 'Nomor Registrasi & Komunitas Santri',
      desc: 'Nomor Registrasi Resmi terbit pasca-LoA (REG-YYYYMMDD-XXXX), dan pendaftar mendapatkan akses tautan ke grup WhatsApp resmi calon santri baru untuk koordinasi masa ta\'aruf (Khutbatul Arsy).',
      icon: MessageSquare,
      color: 'from-slate-700 to-slate-900',
      badge: 'Resmi Santri Baru',
    },
  ]

  const batchRules = [
    {
      title: 'Pengelompokan Batch / Kloter Otomatis',
      desc: 'Setiap gelombang dibagi menjadi beberapa batch seleksi berkapasitas proporsional agar ujian CBT dan uji tahfidz berjalan tertib.',
    },
    {
      title: 'Aturan Cutoff H-1 Pukul 23.59 WIB',
      desc: 'Pendaftaran dan pelunasan formulir untuk batch tertentu ditutup tepat 24 jam sebelum jadwal batch dimulai guna finalisasi data ruang & PIN ujian.',
    },
    {
      title: 'Automated WhatsApp Reminder',
      desc: 'Sistem pengingat WhatsApp otomatis mengirimkan reminder ke nomor orang tua pada H-2, H-1, dan 1 jam sebelum ujian seleksi dimulai.',
    },
  ]

  return (
    <div className="pt-24 pb-20">
      {/* ── Page Header ── */}
      <section className="relative overflow-hidden px-4 py-12 bg-gradient-to-b from-teal-50/50 via-white to-background border-b border-slate-100">
        <div className="container mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3.5 py-1 text-xs font-bold text-teal-900 border border-teal-200">
            <CalendarCheck className="h-3.5 w-3.5 text-teal-700" />
            <span>Alur Sistem &amp; Linimasa Seleksi</span>
          </span>

          <h1 className="mt-4 font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Alur Pendaftaran &amp; Jadwal Penting
          </h1>

          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            Tahapan seleksi terpadu berurutan di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman, mulai dari pembuatan akun hingga penerbitan Letter of Acceptance (LoA) resmi.
          </p>

          {/* Active Wave Schedule Banner */}
          <div className="mt-8 max-w-2xl mx-auto rounded-3xl border border-teal-200 bg-white p-5 shadow-sm text-left">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Jadwal Gelombang Berjalan
              </span>
              <span className="rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 text-xs font-bold">
                {wave?.academic_year || 'TA 2026/2027'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? (
                <div className="sm:col-span-2 py-2 text-xs font-medium text-slate-400 animate-pulse">
                  Memuat jadwal gelombang aktif...
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Gelombang Pendaftaran:</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {wave?.name || 'Gelombang 1'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 font-medium">Periode Pendaftaran:</div>
                    <div className="text-xs sm:text-sm font-bold text-emerald-primary mt-0.5">
                      {formatDate(wave?.registration_start_date)} — {formatDate(wave?.registration_end_date)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-12 space-y-16">
        {/* ── 7 Langkah Alur PPDB Terpadu ── */}
        <section>
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-primary">
              Prosedur Resmi Pendaftaran
            </span>
            <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
              7 Tahap Menuju Santri PTDARRAHMAN
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Setiap tahapan dikonfirmasi secara seketika di dashboard mandiri pendaftar.
            </p>
          </div>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-0.5 -translate-x-1/2 bg-slate-200" />

            <div className="space-y-8 md:space-y-12">
              {steps.map((st, idx) => {
                const Icon = st.icon
                const isEven = idx % 2 === 1

                return (
                  <div
                    key={idx}
                    className={cn(
                      'relative flex flex-col md:flex-row items-center gap-6',
                      isEven ? 'md:flex-row-reverse' : ''
                    )}
                  >
                    {/* Content Card */}
                    <div className="w-full md:w-1/2">
                      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-emerald-primary uppercase tracking-wider">
                            {st.step}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                            {st.badge}
                          </span>
                        </div>

                        <h3 className="font-heading text-lg font-bold text-slate-900">
                          {st.title}
                        </h3>
                        <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {st.desc}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Node Icon */}
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md shadow-emerald-950/10 from-emerald-primary to-emerald-dark">
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Spacer for opposite side */}
                    <div className="hidden md:block w-1/2" />
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Aturan Batching & Cutoff H-1 ── */}
        <section className="rounded-3xl border border-teal-200 bg-teal-50/40 p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900">
                Sistem Batching &amp; Cutoff Ujian Seleksi
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Untuk menjaga ketertiban pelaksanaan Ujian CBT dan Tes Tahfidz massal, jadwal pendaftar dikelompokkan ke dalam kloter/batch terpadu.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {batchRules.map((rule, i) => (
              <div key={i} className="rounded-2xl border border-teal-100 bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-2 font-bold text-sm text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>{rule.title}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-teal-100 flex items-center gap-2 text-xs text-teal-900">
            <BellRing className="h-4 w-4 text-teal-700 shrink-0" />
            <span>Pastikan nomor WhatsApp orang tua yang didaftarkan aktif agar tidak melewatkan pengingat jadwal ujian dan PIN sesi.</span>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-primary to-emerald-dark p-8 sm:p-10 text-white text-center shadow-xl">
          <h3 className="font-heading text-xl sm:text-3xl font-extrabold">
            Siap Mengikuti Tahapan Seleksi?
          </h3>
          <p className="mt-2 text-xs sm:text-base text-emerald-100 max-w-xl mx-auto">
            Daftarkan diri ananda sekarang juga sebelum kuota gelombang aktif terpenuhi dan pendaftaran batch ditutup.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => navigate('/register')}
              className="rounded-full bg-gold-accent px-8 py-3 text-sm font-bold text-emerald-950 shadow-md hover:bg-gold-light"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Daftar Santri Baru
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
    </div>
  )
}
