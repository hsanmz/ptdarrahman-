import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cbtService } from '@/services/cbtService'
import { useToast } from '@/components/Toast'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import PaginationControls from '@/components/shared/PaginationControls'
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  EmptyState,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui'
import {
  Upload,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Link2,
  LayoutGrid,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BankSoalPageProps {
  category: 'akademik' | 'psikologi'
  title: string
}

const PAGE_SIZE = 20

const formatDateSafe = (d?: any) => {
  if (!d) return '-'
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return String(d)
    return dt.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(d)
  }
}

export default function BankSoalPage({ category, title }: BankSoalPageProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Queries
  const { data: rawBanks = [], isLoading } = useQuery({
    queryKey: ['cbt-banks', category],
    queryFn: () => cbtService.getBanks(category),
  })
  const banks = Array.isArray(rawBanks) ? rawBanks : []

  // UI State
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(banks.length / PAGE_SIZE))
  const pagedBanks = banks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // State
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'file' | 'link'>('file')
  const [formUrl, setFormUrl] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDuration, setFormDuration] = useState(60)
  const [formDescription, setFormDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Mutations
  const importMutation = useMutation({
    mutationFn: (formData: FormData) => cbtService.importBankSoal(formData),
    onSuccess: () => {
      toast('success', 'Bank Soal berhasil di-generate dan tersimpan di sistem!')
      setShowImportModal(false)
      setSelectedFile(null)
      setFormUrl('')
      setFormTitle('')
      setFormDuration(60)
      setFormDescription('')
      setErrorMessage(null)
      queryClient.invalidateQueries({ queryKey: ['cbt-banks', category] })
    },
    onError: (err: any) => {
      const msg = err.message || 'Import gagal. Periksa file atau tautan sumber soal.'
      setErrorMessage(msg)
      toast('error', msg)
    },
  })

  const handleDownloadTemplate = async () => {
    try {
      await cbtService.downloadTemplate(category)
      toast('success', 'Template soal berhasil diunduh.')
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengunduh template.')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    e.target.value = ''
    if (!file) {
      setSelectedFile(null)
      return
    }
    const allowed = ['.csv', '.json', '.txt']
    const lower = file.name.toLowerCase()
    if (!allowed.some((ext) => lower.endsWith(ext))) {
      setSelectedFile(null)
      setErrorMessage(
        'Format file ditolak. Gunakan file .csv atau .json. File .xlsx dari Excel harus disimpan ulang sebagai CSV UTF-8.'
      )
      return
    }
    setSelectedFile(file)
    setErrorMessage(null)
    if (!formTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setFormTitle(cleanName)
    }
  }

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    if (!formTitle.trim()) {
      setErrorMessage('Judul Bank Soal wajib diisi.')
      return
    }
    if (formDuration < 5 || formDuration > 300) {
      setErrorMessage('Durasi ujian harus antara 5 sampai 300 menit.')
      return
    }

    if (importMode === 'link') {
      const rawUrl = formUrl.trim().startsWith('http')
        ? formUrl.trim()
        : `https://${formUrl.trim()}`
      if (!/^https:\/\/docs\.google\.com\//i.test(rawUrl)) {
        setErrorMessage(
          'Tautan ditolak. Gunakan tautan publikasi CSV Google Sheets, contoh: https://docs.google.com/spreadsheets/.../pub?output=csv. Google Forms tidak dapat dibaca sistem.'
        )
        return
      }
    } else if (!selectedFile) {
      setErrorMessage('Harap pilih file soal (.csv atau .json) terlebih dahulu.')
      return
    }

    const formData = new FormData()
    formData.append('title', formTitle.trim())
    formData.append('category', category)
    formData.append('duration_minutes', formDuration.toString())
    if (formDescription.trim()) {
      formData.append('description', formDescription.trim())
    }
    if (importMode === 'link') {
      formData.append('source_url', formUrl.trim())
    } else if (selectedFile) {
      formData.append('file', selectedFile)
    }
    importMutation.mutate(formData)
  }

  const openImportModal = () => {
    setShowImportModal(true)
    setErrorMessage(null)
  }

  return (
    <div className="space-y-6">
      <PageHeaderCard
        title={title}
        description={`Kelola modul bank soal pilihan ganda (MCQ) resmi untuk ${title}. Klik kartu atau baris bank soal untuk membuka butir soal.`}
        docKey="ppdb-bank-soal"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={openImportModal}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Import Soal Baru
            </Button>
          </div>
        }
      />

      {/* Toolbar View Switch (tanpa pencarian — daftar bank biasanya pendek) */}
      <div className="flex items-center">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <Button
            type="button"
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-7 px-2.5 text-xs',
              viewMode === 'card'
                ? 'bg-white text-slate-900 shadow-xs hover:bg-white'
                : 'text-slate-600 hover:text-slate-900'
            )}
            onClick={() => setViewMode('card')}
            title="Tampilan Card"
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1 text-slate-700" />
            Card
          </Button>
          <Button
            type="button"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-7 px-2.5 text-xs',
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-xs hover:bg-white'
                : 'text-slate-600 hover:text-slate-900'
            )}
            onClick={() => setViewMode('list')}
            title="Tampilan Tabel"
          >
            <List className="h-3.5 w-3.5 mr-1 text-slate-700" />
            List
          </Button>
        </div>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-48 bg-muted/40" />
          ))}
        </div>
      ) : banks.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FileSpreadsheet}
            title={`Belum ada ${title}`}
            description="Impor soal pilihan ganda (.csv / .json) lewat unggahan file atau tautan publikasi CSV Google Sheets, menggunakan template resmi yang disediakan."
            action={
              <Button onClick={openImportModal} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Upload className="w-4 h-4 mr-1.5" /> Import Soal Sekarang
              </Button>
            }
          />
        </Card>
      ) : viewMode === 'list' ? (
        <Card className="border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead className="text-xs font-semibold">Judul Bank Soal</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Soal</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Total Poin</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Durasi</TableHead>
                  <TableHead className="text-xs font-semibold">Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedBanks.map((b) => (
                  <TableRow
                    key={b.id}
                    onClick={() => navigate(`/admin/bank-soal/detail/${b.id}`)}
                    className="cursor-pointer hover:bg-emerald-50/60 transition-colors group"
                    title="Klik untuk membuka butir soal"
                  >
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {b.title}
                      </div>
                      {b.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {b.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                        {b.total_questions} Soal
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-semibold text-slate-800">{b.total_points}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs text-slate-800">{b.duration_minutes} menit</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] text-muted-foreground">{formatDateSafe(b.created_at)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pagedBanks.map((b) => (
              <Card
                key={b.id}
                onClick={() => navigate(`/admin/bank-soal/detail/${b.id}`)}
                className="group cursor-pointer border border-border/70 hover:border-emerald-500/50 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
                title="Klik untuk membuka butir soal"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <Badge variant="outline" className="capitalize text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                        {b.category}
                      </Badge>
                      <h3 className="font-bold text-base text-foreground line-clamp-2 mt-1 group-hover:text-emerald-700 transition-colors">
                        {b.title}
                      </h3>
                    </div>
                  </div>

                  {b.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {b.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{b.duration_minutes} Menit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{b.total_questions} Soal Pilihan Ganda</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                    <span className="text-muted-foreground">
                      Total: <strong className="text-foreground">{b.total_points} Poin</strong>
                    </span>
                    <span className="text-[11px] text-muted-foreground">{formatDateSafe(b.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      {/* Modal Import Soal */}
      <Dialog
        open={showImportModal}
        onOpenChange={(open) => {
          if (!open && importMutation.isPending) return
          setShowImportModal(open)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-emerald-600" />
              Import Soal ({category === 'akademik' ? 'Tes Akademik' : 'Tes Psikologi'})
            </DialogTitle>
          </DialogHeader>

          {importMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="relative w-14 h-14" role="status" aria-label="Sedang memproses import soal">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-600 border-r-emerald-600/30 animate-spin" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                Sedang memproses soal...
              </div>
              <div className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
                {importMode === 'link'
                  ? 'Mengunduh CSV dari tautan Google Sheets, memvalidasi butir soal, lalu menyimpan bank.'
                  : 'Memvalidasi butir soal, kunci jawaban, dan poin, lalu menyimpan bank.'}
                <br />
                Jangan tutup dialog ini sampai selesai. Jika validasi gagal, alasan kegagalannya ditampilkan di sini.
              </div>
            </div>
          ) : (
            <form onSubmit={handleImportSubmit} className="space-y-4 py-2">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed whitespace-pre-line">{errorMessage}</div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Judul Bank Soal *</Label>
                <Input
                  placeholder="Contoh: Soal Ujian Akademik Gelombang 1"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Durasi Pengerjaan Ujian (Menit) *</Label>
                <Input
                  type="number"
                  min={5}
                  max={300}
                  value={formDuration}
                  onChange={(e) => setFormDuration(parseInt(e.target.value) || 60)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Durasi ini akan menjadi timer mundur otomatis saat peserta mengerjakan ujian.
                </p>
              </div>

              {/* Sumber Soal: File / Tautan */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 text-xs',
                    importMode === 'file'
                      ? 'bg-white text-slate-900 shadow-xs hover:bg-white'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                  onClick={() => {
                    setImportMode('file')
                    setErrorMessage(null)
                  }}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Unggah File
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 text-xs',
                    importMode === 'link'
                      ? 'bg-white text-slate-900 shadow-xs hover:bg-white'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                  onClick={() => {
                    setImportMode('link')
                    setErrorMessage(null)
                  }}
                >
                  <Link2 className="h-3.5 w-3.5 mr-1" />
                  Tautan Google Sheets
                </Button>
              </div>

              {importMode === 'link' ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tautan Publikasi CSV Google Sheets *</Label>
                  <Input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                  />
                  <ol className="list-decimal pl-4 pt-1 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                    <li>
                      Salin butir soal ke Google Sheets mengikuti kolom template resmi:
                      No, Pertanyaan, Pilihan A sampai E, Kunci Jawaban, Poin.
                    </li>
                    <li>
                      Di Sheets, buka menu File, lalu Bagikan, lalu Publikasikan ke web.
                      Pilih sheet dan format CSV, kemudian klik Publikasikan.
                    </li>
                    <li>Tempel tautan hasil publikasi pada kolom di atas.</li>
                  </ol>
                  <p className="text-[11px] text-muted-foreground">
                    Google Forms tidak dapat dibaca sistem. Soal di gform perlu disalin ke Sheets terlebih dahulu.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pilih File Soal (.csv / .json) *</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-5 text-center hover:border-emerald-500 transition-colors bg-muted/20">
                    <input
                      type="file"
                      id="cbt-file-input"
                      accept=".csv,.json,.txt"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="cbt-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                      <span className="text-xs font-medium text-foreground">
                        {selectedFile ? (
                          <span className="text-emerald-700 font-semibold">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                        ) : (
                          'Klik untuk memilih file CSV atau JSON'
                        )}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Wajib Pilihan Ganda (Single Choice) dengan Kunci Jawaban.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-md text-xs text-emerald-900">
                <span>Belum punya format file?</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="text-emerald-700 font-semibold h-auto p-0 hover:underline"
                >
                  Unduh Template Resmi (.csv)
                </Button>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImportModal(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={importMutation.isPending || (importMode === 'file' && !selectedFile)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                >
                  Generate Bank Soal
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
