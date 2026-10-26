import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '@/api/client'
import {
  Card,
  CardContent,
  Button,
} from '@/components/ui'
import { DocTrigger } from '@repo/ui'
import PaginationControls from '@/components/shared/PaginationControls'
import ToolbarCard from '@/components/shared/ToolbarCard'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface ApplicantRow {
  id: string
  full_name: string
  status: string
  rejection_reason?: string | null
  email?: string
  phone?: string
  wave_name?: string
  registration_number?: string
  created_at: string
  updated_at?: string
}

function DocStatusBadge({ status, reason }: { status: string; reason?: string | null }) {
  if (reason && reason.startsWith('[BERKAS MENYUSUL]')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Menunggu (Berkas Menyusul)
      </span>
    )
  }
  const map: Record<string, { label: string; cls: string; dot?: string }> = {
    document_uploaded: { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200', dot: 'bg-amber-500' },
    document_uploaded_pending: { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200', dot: 'bg-amber-500' },
    document_approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200', dot: 'bg-emerald-500' },
    document_rejected: { label: 'Ditolak (Perlu Revisi)', cls: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200', dot: 'bg-red-500' },
  }
  const resolved = ['passed', 'failed', 'selection'].includes(status)
    ? map.document_approved
    : map[status] || { label: (status || '-').replace('_', ' '), cls: 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200', dot: 'bg-slate-400' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', resolved.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', resolved.dot)} />
      {resolved.label}
    </span>
  )
}

function formatUploadDateTime(dateStr?: string | null): { date: string; time: string; relative: string } {
  if (!dateStr) return { date: '-', time: '', relative: '' }
  try {
    const d = new Date(dateStr)
    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
    const timeFormatted = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)

    const diffMs = Date.now() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    let relative = ''
    if (diffMins < 1) relative = 'Baru saja'
    else if (diffMins < 60) relative = `${diffMins} mnt lalu`
    else if (diffHours < 24) relative = `${diffHours} jam lalu`
    else if (diffDays === 1) relative = 'Kemarin'
    else if (diffDays < 7) relative = `${diffDays} hari lalu`

    return { date: dateFormatted, time: `${timeFormatted} WIB`, relative }
  } catch {
    return { date: String(dateStr), time: '', relative: '' }
  }
}

export default function VerifikasiDokumenPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || ''
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const handleFilterChange = (status: string) => {
    const next = new URLSearchParams(searchParams)
    if (status) {
      next.set('status', status)
    } else {
      next.delete('status')
    }
    setSearchParams(next)
    setPage(1)
  }

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSearchQuery(searchInput.trim())
    setPage(1)
  }

  const { data, isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['applicants-docs', statusFilter, searchQuery, page],
    queryFn: async () => {
      const p = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: 'fifo_unverified',
      })
      if (statusFilter) p.set('status', statusFilter)
      if (searchQuery) p.set('search', searchQuery)
      return apiFetch<{ data: ApplicantRow[]; total: number }>(`/ppdb/applicants?${p.toString()}`)
    },
  })

  // Urutan data: yang belum diverifikasi ditaruh paling atas dengan FIFO (yang upload lebih awal di atas)
  const applicants = useMemo(() => {
    const list = [...(data?.data || [])]
    return list.sort((a, b) => {
      const isUnverifiedA = ['document_uploaded', 'document_uploaded_pending'].includes(a.status)
      const isUnverifiedB = ['document_uploaded', 'document_uploaded_pending'].includes(b.status)

      // Yang belum diverifikasi diprioritaskan di atas
      if (isUnverifiedA && !isUnverifiedB) return -1
      if (!isUnverifiedA && isUnverifiedB) return 1

      // Jika sama-sama belum diverifikasi: yang LEBIH AWAL upload (earliest / ASC) paling atas!
      if (isUnverifiedA && isUnverifiedB) {
        const timeA = new Date(a.updated_at || a.created_at).getTime()
        const timeB = new Date(b.updated_at || b.created_at).getTime()
        return timeA - timeB
      }

      // Untuk yang sudah dinilai: urutkan dari yang terbaru (DESC)
      const timeA = new Date(a.updated_at || a.created_at).getTime()
      const timeB = new Date(b.updated_at || b.created_at).getTime()
      return timeB - timeA
    })
  }, [data?.data])

  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Verifikasi Dokumen Pendaftar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Klik pada baris pendaftar untuk memeriksa dan memvalidasi berkas dokumen persyaratan calon santri.
          </p>
        </div>
        <DocTrigger
          docKey="ppdb-verifikasi-dokumen"
          variant="light"
          title="Panduan Verifikasi Dokumen"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={statusFilter === '' ? 'default' : 'outline'}
          className="text-xs"
          onClick={() => handleFilterChange('')}
        >
          Semua
        </Button>
        <Button
          size="sm"
          variant={statusFilter === 'document_uploaded_pending' ? 'default' : 'outline'}
          className="text-xs"
          onClick={() => handleFilterChange('document_uploaded_pending')}
        >
          Menunggu Verifikasi
        </Button>
        <Button
          size="sm"
          variant={statusFilter === 'document_approved' ? 'default' : 'outline'}
          className="text-xs"
          onClick={() => handleFilterChange('document_approved')}
        >
          Disetujui
        </Button>
        <Button
          size="sm"
          variant={statusFilter === 'document_rejected' ? 'default' : 'outline'}
          className="text-xs"
          onClick={() => handleFilterChange('document_rejected')}
        >
          Ditolak (Perlu Revisi)
        </Button>
      </div>

      {/* Search & Actions Bar */}
      <ToolbarCard
        searchPlaceholder="Cari nama, email, atau no. telepon..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearch}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-emerald-primary/5 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Nama Pendaftar</th>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Waktu Upload</th>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Status Dokumen</th>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Email / No. WA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={4} className="py-4 px-4 h-12 bg-slate-50/50" />
                    </tr>
                  ))
                ) : applicants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground text-sm">
                      Tidak ada pendaftar yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  applicants.map((applicant) => {
                    const uploadInfo = formatUploadDateTime(applicant.updated_at || applicant.created_at)
                    const isUnverified = ['document_uploaded', 'document_uploaded_pending'].includes(applicant.status)

                    return (
                      <tr
                        key={applicant.id}
                        onClick={() => navigate(`/admin/verifikasi-dokumen/${applicant.id}`)}
                        className="hover:bg-emerald-50/40 cursor-pointer transition-colors group select-none"
                        title="Klik untuk membuka verifikasi dokumen pendaftar ini"
                      >
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                            <span>{applicant.full_name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {applicant.registration_number ? `No: ${applicant.registration_number} • ` : ''}{applicant.wave_name || '-'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 min-w-[170px]">
                          <div className="flex items-center gap-1.5 text-xs text-slate-800">
                            <Clock className={cn('w-3.5 h-3.5 shrink-0', isUnverified ? 'text-amber-500' : 'text-slate-400')} />
                            <span className="font-medium whitespace-nowrap">{uploadInfo.date}</span>
                            <span className="text-slate-400 font-normal text-[11px]">{uploadInfo.time}</span>
                          </div>
                          {uploadInfo.relative && (
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              {isUnverified && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              )}
                              <span>{uploadInfo.relative}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <DocStatusBadge status={applicant.status} reason={applicant.rejection_reason} />
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 min-w-[180px]">
                          <div className="text-xs truncate max-w-[220px]">{applicant.email || '-'}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{applicant.phone || '-'}</div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
