import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchCpPrograms,
  fetchCpFacilities,
  type ProgramItem,
  type FacilityItem,
} from '@/services/cpDataService'
import { Button } from '@/components/ui'
import {
  BookOpen, Building2, CheckCircle2, Award, Sparkles, Clock, Layers,
  Laptop, Moon, Home, Trophy, UserPlus, LogIn
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function KurikulumFasilitasPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'programs' | 'facilities'>('programs')
  const [facilityCategory, setFacilityCategory] = useState<string>('all')

  const [programs, setPrograms] = useState<ProgramItem[]>([])
  const [facilities, setFacilities] = useState<FacilityItem[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const [progData, facData] = await Promise.all([
          fetchCpPrograms(),
          fetchCpFacilities(),
        ])
        setPrograms(progData)
        setFacilities(facData)
      } catch (err) {
        console.error('Failed to load CP programs/facilities', err)
      }
    }
    loadData()
  }, [])

  const facilityCategories = [
    { id: 'all', label: 'Semua Fasilitas', icon: Building2 },
    { id: 'tech', label: 'Teknologi & Lab', icon: Laptop },
    { id: 'worship', label: 'Musholla & Halaqah', icon: Moon },
    { id: 'boarding', label: 'Asrama Mukim', icon: Home },
    { id: 'academic', label: 'Ruang Kelas & Aula', icon: BookOpen },
    { id: 'sports', label: 'Olahraga & Rooftop', icon: Trophy },
  ]

  const filteredFacilities = facilities.filter((fac) => {
    if (facilityCategory === 'all') return true
    return fac.category === facilityCategory
  })

  return (
    <div className="pt-24 pb-20">
      {/* ── Page Header ── */}
      <section className="relative overflow-hidden px-4 py-12 bg-gradient-to-b from-emerald-50/50 via-white to-background border-b border-slate-100">
        <div className="container mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3.5 py-1 text-xs font-bold text-emerald-800">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sistem Belajar &amp; Sarana Penunjang</span>
          </span>

          <h1 className="mt-4 font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Kurikulum Terpadu &amp; Fasilitas Modern
          </h1>

          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            Menghadirkan perpaduan harmonis antara kedalaman Al-Qur'an 30 juz, adab kemandirian asrama, dan rekayasa teknologi digital terkini di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.
          </p>

          {/* Tab Switcher */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200">
              <button
                onClick={() => setActiveTab('programs')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all',
                  activeTab === 'programs'
                    ? 'bg-white text-emerald-primary shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <BookOpen className="h-4 w-4" />
                <span>Kurikulum &amp; Program Belajar ({programs.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('facilities')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all',
                  activeTab === 'facilities'
                    ? 'bg-white text-emerald-primary shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Building2 className="h-4 w-4" />
                <span>Sarana &amp; Fasilitas Sekolah ({facilities.length})</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content Body ── */}
      <div className="container mx-auto max-w-6xl px-4 py-12">
        {activeTab === 'programs' ? (
          /* Programs Section */
          <div className="space-y-10">
            <div className="text-center max-w-xl mx-auto mb-8">
              <h2 className="font-heading text-2xl font-extrabold text-slate-900">
                5 Pilar Kurikulum Terintegrasi
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Disusun khusus agar santri menyelesaikan hafalan Al-Qur'an sekaligus memiliki keterampilan komputasi yang relevan di era industri teknologi.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {loading ? (
                <p className="py-10 text-center text-sm text-slate-400 animate-pulse">
                  Memuat kurikulum & fasilitas...
                </p>
              ) : (
              programs.map((prog, idx) => (
                <div
                  key={prog.id || idx}
                  className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300"
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold">
                        <Award className="h-3.5 w-3.5" />
                        <span>Pilar {idx + 1}</span>
                      </span>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {prog.duration}
                        </span>
                        <span className="h-3 w-px bg-slate-200" />
                        <span className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          {prog.level}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900">
                      {prog.title}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm font-semibold text-emerald-primary">
                      {prog.tagline}
                    </p>

                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                      {prog.desc}
                    </p>

                    {/* Highlights & Curriculum Grid */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                      {/* Highlights */}
                      <div className="rounded-2xl bg-emerald-50/50 p-4 border border-emerald-100/60">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-3 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                          Keunggulan &amp; Pengalaman Santri
                        </h4>
                        <ul className="space-y-2">
                          {prog.highlights.map((hl, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                              <span>{hl}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Curriculum Items */}
                      <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                          Fokus Materi &amp; Praktik Harian
                        </h4>
                        <ul className="space-y-2">
                          {prog.curriculum.map((cm, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 mt-0.5">
                                {i + 1}
                              </span>
                              <span>{cm}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Outcomes */}
                    {prog.outcomes && prog.outcomes.length > 0 && (
                      <div className="mt-4 pt-3 flex items-start gap-2 text-xs sm:text-sm text-slate-600">
                        <span className="font-bold text-slate-800 shrink-0">Target Capaian:</span>
                        <span>{prog.outcomes.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        ) : (
          /* Facilities Section */
          <div className="space-y-8">
            <div className="text-center max-w-xl mx-auto mb-4">
              <h2 className="font-heading text-2xl font-extrabold text-slate-900">
                Sarana &amp; Lingkungan Belajar Kondusif
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Fasilitas dirancang untuk kenyamanan ibadah, kebersihan mukim berasrama, serta ruang praktikum teknologi yang memadai.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pb-4">
              {facilityCategories.map((cat) => {
                const Icon = cat.icon
                const isSelected = facilityCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFacilityCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all',
                      isSelected
                        ? 'bg-emerald-primary text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Facilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFacilities.map((fac) => (
                <div
                  key={fac.id}
                  className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Facility Image */}
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                      <img
                        src={fac.image}
                        alt={fac.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {fac.floor && (
                        <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white">
                          {fac.floor}
                        </span>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="font-heading text-lg font-bold text-slate-900">
                        {fac.name}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {fac.desc}
                      </p>

                      {/* Features */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                        {fac.features.map((feat, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-primary shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA Banner ── */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-emerald-900 to-emerald-700 p-8 sm:p-10 text-white text-center shadow-xl">
          <h3 className="font-heading text-xl sm:text-3xl font-extrabold">
            Ingin Melihat Langsung Fasilitas Kami?
          </h3>
          <p className="mt-2 text-xs sm:text-base text-emerald-100 max-w-xl mx-auto">
            Ayah &amp; Bunda dapat mengikuti jadwal observasi dan silaturahmi langsung dengan pengasuh pesantren saat proses seleksi berlangsung.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => navigate('/register')}
              className="rounded-full bg-gold-accent px-7 py-3 text-sm font-bold text-emerald-950 shadow-md hover:bg-gold-light"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Daftar Santri Baru
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/auth/login')}
              className="rounded-full border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/20"
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
