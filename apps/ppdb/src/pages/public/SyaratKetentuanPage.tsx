import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import {
  FileCheck, ShieldAlert, HeartPulse, UserCheck, FileText, CheckCircle2,
  Lock, UserPlus, Scale, Info
} from 'lucide-react'

export default function SyaratKetentuanPage() {
  const navigate = useNavigate()

  const generalRequirements = [
    {
      title: "Lulusan Jenjang Dasar (SD / MI)",
      desc: "Telah lulus atau sedang duduk di kelas 6 SD/MI/sederajat dan siap melanjutkan pendidikan menengah di pesantren.",
    },
    {
      title: "Komitmen Mukim di Asrama Penuh",
      desc: "Bersedia tinggal di asrama pesantren (full boarding school) dan menaati seluruh tata tertib serta budaya disiplin santri.",
    },
    {
      title: "Kesiapan Menghafal Al-Qur'an & Belajar IT",
      desc: "Memiliki motivasi kuat dari diri sendiri untuk menghafal 30 juz Al-Qur'an dan mempelajari rekayasa perangkat lunak modern.",
    },
    {
      title: "Sehat Jasmani dan Rohani",
      desc: "Mampu beraktivitas mandiri tanpa ketergantungan medis darurat dan mengisi 10 kuesioner kesehatan secara jujur.",
    },
    {
      title: "Tanpa Smartphone Pribadi di Asrama",
      desc: "Menyetujui aturan pesantren bahwa santri tidak membawa smartphone/laptop pribadi ke asrama. Akses IT disediakan di lab komputer.",
    },
  ]

  const mandatoryDocuments = [
    {
      name: "Nomor Induk Siswa Nasional (NISN)",
      format: "Tangkapan layar / surat keterangan NISN resmi dari Kemdikbud/Kemenag",
      type: "PDF / JPG / PNG (Maks 2MB)",
    },
    {
      name: "Kartu Keluarga (KK)",
      format: "Scan / foto Kartu Keluarga terbaru yang masih berlaku dan terbaca jelas",
      type: "PDF / JPG / PNG (Maks 2MB)",
    },
    {
      name: "Akta Kelahiran Calon Santri",
      format: "Scan / foto Akta Kelahiran resmi dari Dinas Kependudukan dan Pencatatan Sipil",
      type: "PDF / JPG / PNG (Maks 2MB)",
    },
    {
      name: "Pas Foto Calon Santri",
      format: "Pas foto resmi berwarna terbaru (rasio 3x4 / 4x6) berpakaian rapi / berpeci",
      type: "JPG / PNG (Maks 2MB)",
    },
    {
      name: "KTP Orang Tua / Wali Santri",
      format: "Scan / foto e-KTP Ayah dan Ibu atau Wali yang bertanggung jawab",
      type: "PDF / JPG / PNG (Maks 2MB)",
    },
    {
      name: "Buku Rapor 4 Semester Terakhir",
      format: "Scan nilai rapor semester ganjil-genap kelas 4 dan kelas 5 yang telah dilegalisir",
      type: "PDF (Maks 5MB)",
    },
  ]

  const healthQuestionsSummary = [
    "Riwayat penyakit kronis (asma, diabetes, kelainan jantung, epilepsi, dll.)",
    "Riwayat alergi makanan, obat-obatan tertentu, atau cuaca dingin",
    "Kebutuhan obat-obatan rutin yang sedang dikonsumsi",
    "Keterbatasan fisik yang membutuhkan perhatian dalam aktivitas keseharian",
    "Riwayat rawat inap di rumah sakit dalam kurun 2 tahun terakhir",
    "Kebutuhan khusus dalam proses belajar atau pendampingan konseling",
    "Data nama, relasi, dan nomor telepon kontak darurat keluarga yang aktif 24 jam",
  ]

  const policies = [
    {
      icon: Scale,
      title: "Kebijakan Dana Formulir (Non-Refundable)",
      desc: "Biaya pendaftaran formulir yang telah dibayarkan melalui kanal QRIS resmi bersifat non-refundable (tidak dapat ditarik kembali atau dialihkan) apabila calon santri memutuskan mengundurkan diri atau tidak melanjutkan seleksi.",
    },
    {
      icon: Lock,
      title: "Penguncian Data Pasca-LoA (is_locked = true)",
      desc: "Setelah calon santri dinyatakan lulus dan menandatangani Letter of Acceptance (LoA) secara digital, data formulir dan kuesioner kesehatan dikunci permanen oleh sistem untuk penerbitan Nomor Registrasi Resmi santri baru.",
    },
    {
      icon: ShieldAlert,
      title: "Keabsahan dan Tanggung Jawab Dokumen",
      desc: "Seluruh berkas dan pernyataan kesehatan yang diunggah harus dapat dipertanggungjawabkan kebenarannya. Pemalsuan dokumen dapat membatalkan status kelulusan calon santri secara sepihak oleh panitia PPDB.",
    },
  ]

  return (
    <div className="pt-24 pb-20">
      {/* ── Page Header ── */}
      <section className="relative overflow-hidden px-4 py-12 bg-gradient-to-b from-blue-50/50 via-white to-background border-b border-slate-100">
        <div className="container mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3.5 py-1 text-xs font-bold text-blue-900 border border-blue-200">
            <FileCheck className="h-3.5 w-3.5 text-blue-700" />
            <span>Ketentuan &amp; Dokumen Resmi</span>
          </span>

          <h1 className="mt-4 font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Syarat &amp; Ketentuan PPDB
          </h1>

          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            Panduan lengkap mengenai persyaratan pendaftaran santri baru, kelengkapan berkas dokumen, kuesioner kesehatan mandiri, dan komitmen mukim di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-12 space-y-14">
        {/* ── 1. Persyaratan Umum ── */}
        <section>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900">
                1. Persyaratan Umum Calon Santri
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Kriteria dasar kesiapan calon santri mengikuti pendidikan pesantren.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generalRequirements.map((req, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-200 transition-all"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      {req.title}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {req.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 2. Berkas Persyaratan Wajib ── */}
        <section>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-800">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900">
                2. 6 Dokumen Persyaratan Wajib
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Diunggah pada dashboard pendaftar setelah pembayaran formulir terverifikasi.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-4 sm:px-6">No</th>
                    <th className="py-3.5 px-4 sm:px-6">Nama Dokumen</th>
                    <th className="py-3.5 px-4 sm:px-6">Ketentuan Dokumen</th>
                    <th className="py-3.5 px-4 sm:px-6">Format File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mandatoryDocuments.map((doc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 sm:px-6 font-semibold text-slate-400 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-4 sm:px-6 font-bold text-slate-900">
                        {doc.name}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-xs text-slate-600">
                        {doc.format}
                      </td>
                      <td className="py-4 px-4 sm:px-6">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-[11px] font-mono font-semibold text-slate-700">
                          {doc.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── 3. Kuesioner Kesehatan Mandiri ── */}
        <section className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900">
                3. Kuesioner Kesehatan Mandiri (10 Pertanyaan Baku)
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Diisi langsung oleh orang tua/wali santri saat pengisian formulir pendaftaran akun awal. Kuesioner ini menggantikan cek fisik awal untuk memetakan kesiapan medis ananda selama hidup mandiri di asrama.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/60 bg-white p-5 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3">
              Cakupan Pertanyaan Kesehatan:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {healthQuestionsSummary.map((q, i) => (
                <div key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{q}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11.5px] text-slate-500 italic flex items-center gap-1.5">
              <Info className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Data kesehatan dijaga kerahasiaannya dan hanya dapat diakses oleh tim medis serta panitia berwenang.</span>
            </div>
          </div>
        </section>

        {/* ── 4. Aturan Bisnis & Kebijakan ── */}
        <section>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900">
                4. Aturan Bisnis &amp; Kebijakan PPDB
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Klausul resmi yang berlaku dan mengikat seluruh calon santri dan orang tua/wali.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {policies.map((pol, i) => {
              const Icon = pol.icon
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-start gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      {pol.title}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {pol.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-primary to-emerald-dark p-8 sm:p-10 text-white text-center shadow-xl">
          <h3 className="font-heading text-xl sm:text-3xl font-extrabold">
            Sudah Memenuhi Seluruh Persyaratan?
          </h3>
          <p className="mt-2 text-xs sm:text-base text-emerald-100 max-w-xl mx-auto">
            Segera buat akun pendaftaran online ananda dan lengkapi formulir pendaftaran 6 bagian dengan mudah.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => navigate('/register')}
              className="rounded-full bg-gold-accent px-8 py-3 text-sm font-bold text-emerald-950 shadow-md hover:bg-gold-light"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Mulai Pendaftaran Akun
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/alur-jadwal')}
              className="rounded-full border-white/30 bg-white/10 px-7 py-3 text-sm font-bold text-white hover:bg-white/20"
            >
              <span>Lihat Alur &amp; Jadwal Seleksi</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
