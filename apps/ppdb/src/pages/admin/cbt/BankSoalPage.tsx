import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cbtService } from '@/services/cbtService'
import { useToast } from '@/components/Toast'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
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
  ConfirmDialog,
  EmptyState,
  Badge,
} from '@/components/ui'
import {
  Download,
  Upload,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileSpreadsheet,
} from 'lucide-react'

interface BankSoalPageProps {
  category: 'akademik' | 'psikologi'
  title: string
}

export default function BankSoalPage({ category, title }: BankSoalPageProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Queries
  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['cbt-banks', category],
    queryFn: () => cbtService.getBanks(category),
  })

  // State
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDuration, setFormDuration] = useState(60)
  const [formDescription, setFormDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Detail Modal
  const [viewBankId, setViewBankId] = useState<string | null>(null)
  const { data: bankDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['cbt-bank-detail', viewBankId],
    queryFn: () => (viewBankId ? cbtService.getBankDetail(viewBankId) : null),
    enabled: !!viewBankId,
  })

  // Delete State
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null)

  // Mutations
  const importMutation = useMutation({
    mutationFn: (formData: FormData) => cbtService.importBankSoal(formData),
    onSuccess: () => {
      toast('success', 'Bank Soal berhasil di-generate dan tersimpan di sistem!')
      setShowImportModal(false)
      setSelectedFile(null)
      setFormTitle('')
      setFormDuration(60)
      setFormDescription('')
      setErrorMessage(null)
      queryClient.invalidateQueries({ queryKey: ['cbt-banks', category] })
    },
    onError: (err: any) => {
      const msg = err.message || 'Gagal mengimpor file soal.'
      setErrorMessage(msg)
      toast('error', msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (bankId: string) => cbtService.deleteBankSoal(bankId),
    onSuccess: () => {
      toast('success', 'Bank Soal berhasil dihapus.')
      setDeleteBankId(null)
      queryClient.invalidateQueries({ queryKey: ['cbt-banks', category] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal menghapus Bank Soal.')
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
    setSelectedFile(file)
    setErrorMessage(null)
    if (file && !formTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setFormTitle(cleanName)
    }
  }

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setErrorMessage('Judul Bank Soal wajib diisi.')
      return
    }
    if (!selectedFile) {
      setErrorMessage('Harap pilih file soal (.csv atau .json) terlebih dahulu.')
      return
    }
    if (formDuration < 5) {
      setErrorMessage('Durasi ujian minimal 5 menit.')
      return
    }

    const formData = new FormData()
    formData.append('title', formTitle.trim())
    formData.append('category', category)
    formData.append('duration_minutes', formDuration.toString())
    if (formDescription.trim()) {
      formData.append('description', formDescription.trim())
    }
    formData.append('file', selectedFile)

    importMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <PageHeaderCard
        title={title}
        description={`Kelola modul bank soal pilihan ganda (MCQ) resmi untuk ${title}. Soal yang diimpor akan menjadi acuan materi ujian massal calon santri.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Unduh Template Soal (.csv)
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowImportModal(true)
                setErrorMessage(null)
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Import Soal Baru
            </Button>
          </div>
        }
      />

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
            description="Unggah file soal pilihan ganda (.csv atau .json) menggunakan template yang telah disediakan untuk membuat Bank Soal."
            action={
              <Button onClick={() => setShowImportModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Upload className="w-4 h-4 mr-1.5" /> Import Soal Sekarang
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {banks.map((b) => (
            <Card
              key={b.id}
              className="border border-border/70 hover:border-emerald-500/50 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Badge variant="outline" className="capitalize text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                      {b.category}
                    </Badge>
                    <h3 className="font-bold text-base text-foreground line-clamp-2 mt-1">
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewBankId(b.id)}
                      className="h-8 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Lihat Soal
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteBankId(b.id)}
                      className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Import Soal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-emerald-600" />
              Import Soal ({category === 'akademik' ? 'Tes Akademik' : 'Tes Psikologi'})
            </DialogTitle>
          </DialogHeader>

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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih File Soal (.csv / .json) *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-5 text-center hover:border-emerald-500 transition-colors bg-muted/20">
                <input
                  type="file"
                  id="cbt-file-input"
                  accept=".csv,.json"
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
                disabled={importMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={importMutation.isPending || !selectedFile}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
              >
                {importMutation.isPending ? 'Memvalidasi...' : 'Generate Bank Soal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal (Preview Questions) */}
      <Dialog open={!!viewBankId} onOpenChange={(open) => !open && setViewBankId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base">
              <span>Pratinjau Soal: {bankDetail?.title || 'Memuat...'}</span>
              {bankDetail && (
                <Badge variant="outline" className="text-xs">
                  {bankDetail.total_questions} Soal • {bankDetail.duration_minutes} Menit
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Memuat butir soal...
            </div>
          ) : !bankDetail || bankDetail.questions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada butir soal.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {bankDetail.questions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-lg border border-border bg-card space-y-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-foreground">
                      No. {q.question_number}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {q.points} Poin
                    </Badge>
                  </div>
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {q.question_text}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`flex items-center gap-2 p-2 rounded border text-xs ${
                          opt.is_correct
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                            : 'bg-muted/30 border-border text-foreground'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            opt.is_correct
                              ? 'bg-emerald-600 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {opt.option_key}
                        </span>
                        <span className="flex-1">{opt.option_text}</span>
                        {opt.is_correct && (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] h-4 px-1 text-white">
                            KUNCI
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewBankId(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteBankId}
        onClose={() => setDeleteBankId(null)}
        title="Hapus Bank Soal?"
        message="Bank Soal ini akan dihapus secara permanen beserta seluruh butir soalnya. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        variant="destructive"
        onConfirm={() => deleteBankId && deleteMutation.mutate(deleteBankId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
