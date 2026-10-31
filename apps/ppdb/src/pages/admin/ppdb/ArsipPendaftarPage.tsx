import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/api/client'
import {
  Card,
  CardContent,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableSkeletonRows,
  EmptyState,
} from '@/components/ui'
import {
  Archive,
  Search,
  RotateCcw,
  Shield,
  UserRoundSearch,
  Filter,
  ChevronRight,
} from 'lucide-react'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import PaginationControls from '@/components/shared/PaginationControls'
import PaymentStatusBadge from '@/components/shared/PaymentStatusBadge'
import { cn } from '@/lib/utils'
import { resultStatusMeta } from '@/lib/selectionStatus'

interface PeriodItem {
  id: string
  name: string
  is_active: boolean
}

interface WaveItem {
  id: string
  name: string
  period_id: string
  is_active: boolean
}

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    document_uploaded: {
      label: 'Menunggu Verifikasi',
      cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
      dot: 'bg-amber-500',
    },
    document_uploaded_pending: {
      label: 'Menunggu Verifikasi',
      cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
      dot: 'bg-amber-500',
    },
    document_approved: {
      label: 'Disetujui',
      cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
      dot: 'bg-emerald-500',
    },
    document_rejected: {
      label: 'Ditolak',
      cls: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
      dot: 'bg-red-500',
    },
  }
  const resolved = ['passed', 'failed', 'selection'].includes(status)
    ? map.document_approved
    : map[status] || {
        label: (status || '-').replace('_', ' '),
        cls: 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200',
        dot: 'bg-slate-400',
      }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        resolved.cls
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', resolved.dot)} />
      {resolved.label}
    </span>
  )
}

function SelectionStatusBadge({ status }: { status?: string }) {
  if (!['passed', 'failed', 'conditional', 'waitlist', 'selection'].includes(status || '')) {
    return <span className="text-sm text-slate-400">—</span>
  }
  const meta = resultStatusMeta(status)
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', meta.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

export default function ArsipPendaftarPage() {
  const navigate = useNavigate()
  const [periodFilter, setPeriodFilter] = useState<string>('')
  const [waveFilter, setWaveFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const limit = 20

  // Fetch all periods for cross-period filtering
  const { data: periodsData } = useQuery<PeriodItem[]>({
    queryKey: ['archive-periods'],
    queryFn: async () => {
      const res = await api.apiFetch<any>('/ppdb/periods/all')
      return Array.isArray(res) ? res : res.data || []
    },
  })

  // Fetch waves (optionally filtered by period)
  const { data: wavesData } = useQuery<WaveItem[]>({
    queryKey: ['archive-waves', periodFilter],
    queryFn: async () => {
      const url = periodFilter ? `/ppdb/waves?period_id=${periodFilter}` : '/ppdb/waves/all'
      const res = await api.apiFetch<any>(url)
      return Array.isArray(res) ? res : res.data || []
    },
  })

  // Filtered waves list for dropdown
  const filteredWaves = useMemo(() => {
    if (!wavesData) return []
    if (!periodFilter) return wavesData
    return wavesData.filter((w) => w.period_id === periodFilter)
  }, [wavesData, periodFilter])

  // Fetch archive applicants
  const { data, isLoading } = useQuery({
    queryKey: ['archive-applicants', periodFilter, waveFilter, statusFilter, searchQuery, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (periodFilter) qs.append('period_id', periodFilter)
      if (waveFilter) qs.append('wave_id', waveFilter)
      if (statusFilter) qs.append('status', statusFilter)
      if (searchQuery) qs.append('search', searchQuery)
      qs.append('page', page.toString())
      qs.append('perPage', limit.toString())

      return await api.apiFetch<{
        data: any[]
        total: number
        page: number
        per_page: number
      }>(`/ppdb/archive/applicants?${qs.toString()}`)
    },
  })

  const applicants = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit) || 1

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  const handleReset = () => {
    setPeriodFilter('')
    setWaveFilter('')
    setStatusFilter('')
    setSearchInput('')
    setSearchQuery('')
    setPage(1)
  }

  const activePeriodObj = periodsData?.find((p) => p.id === periodFilter)
  const activeWaveObj = wavesData?.find((w) => w.id === waveFilter)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Arsip & Cari Pendaftar"
        description="Pusat pencarian lintas periode dan gelombang historis. Telusuri dossier lengkap, riwayat nilai, pembayaran, dan berkas asli calon santri."
        loading={isLoading}
        docKey="ppdb-arsip"
        blocks={[
          {
            icon: Archive,
            label: 'Total Terarsip',
            value: `${total} santri`,
            active: true,
          },
          {
            icon: Filter,
            label: 'Cakupan Filter',
            value: activePeriodObj
              ? `${activePeriodObj.name}${activeWaveObj ? ` · ${activeWaveObj.name}` : ''}`
              : 'Semua Periode & Gelombang',
            active: !!periodFilter || !!waveFilter,
          },
        ]}
      />

      {/* Security & Audit Log Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-xs text-emerald-900 shadow-sm">
        <Shield className="h-5 w-5 shrink-0 text-emerald-600" />
        <div className="leading-relaxed">
          <span className="font-bold text-emerald-800">Ruang Arsip Khusus: </span>
          Filter lintas periode dan gelombang hanya aktif di halaman ini sesuai kebijakan tata kelola sistem. Setiap pembukaan dossier pendaftar dan pengunduhan ZIP dicatat secara permanen di{' '}
          <span className="font-semibold underline">Audit Log</span> bersama akun admin dan IP address.
        </div>
      </div>

      {/* Cross-Period / Cross-Wave Filter Controls Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Filter Periode */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Periode PPDB
              </label>
              <select
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value)
                  setWaveFilter('') // reset wave when period changes
                  setPage(1)
                }}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Semua Periode (Lintas Periode)</option>
                {periodsData?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.is_active ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Gelombang */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Gelombang
              </label>
              <select
                value={waveFilter}
                onChange={(e) => {
                  setWaveFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Semua Gelombang</option>
                {filteredWaves?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.is_active ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Status Calon Santri
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Semua Status</option>
                <option value="registered">Baru Terdaftar</option>
                <option value="document_uploaded_pending">Menunggu Verifikasi Dokumen</option>
                <option value="document_approved">Dokumen Disetujui</option>
                <option value="document_rejected">Dokumen Ditolak</option>
                <option value="selection">Dalam Proses Seleksi</option>
                <option value="passed">Diterima</option>
                <option value="conditional">Diterima Bersyarat</option>
                <option value="waitlist">Cadangan</option>
                <option value="failed">Tidak Diterima</option>
                <option value="expired">Tagihan Kedaluwarsa</option>
              </select>
            </div>

            {/* Pencarian Keyword */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Cari Nama / NISN / Email / WA
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik pencarian..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-end gap-2">
              <Button
                type="submit"
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
              >
                <Search className="h-3.5 w-3.5 mr-1" />
                Cari
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-9 px-3 text-xs"
                title="Reset Semua Filter"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Archive Results Table */}
      <Card className="border border-slate-200 overflow-hidden shadow-sm">
        <Table className="min-w-[820px]">
          <TableHeader className="bg-emerald-primary/5">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Nama Calon Santri & NISN
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Periode & Gelombang
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Biaya Formulir
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Verifikasi Dokumen
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Status Seleksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={5} rows={6} />
            ) : applicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12">
                  <EmptyState
                    icon={UserRoundSearch}
                    title="Tidak Ada Data Terarsip"
                    description="Tidak ditemukan data pendaftar yang cocok dengan filter atau kata kunci pencarian Anda."
                    className="bg-transparent border-transparent"
                  />
                </TableCell>
              </TableRow>
            ) : (
              applicants.map((a: any) => (
                <TableRow
                  key={a.id}
                  onClick={() => navigate(`/admin/arsip/${a.id}`)}
                  className="group transition-colors cursor-pointer hover:bg-emerald-50/50"
                  title="Klik untuk membuka detail arsip & berkas lengkap calon santri"
                >
                  <TableCell className="min-w-[180px]">
                    <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {a.full_name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      NISN: {a.nisn || '-'} · ID: {a.id.slice(0, 8)}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-xs font-semibold text-slate-800">
                      {a.period_name || 'Periode PPDB'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {a.wave_name || 'Gelombang'}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <PaymentStatusBadge status={a.payment_status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DocStatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center justify-between gap-3">
                      <SelectionStatusBadge status={a.status} />
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </Card>
    </div>
  )
}
