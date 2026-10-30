import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DocTrigger } from '@repo/ui'
import {
  cbtService,
  type BankScheduleShare,
  type BankSoalDetail as BankSoalDetailType,
} from '@/services/cbtService'
import { useToast } from '@/components/Toast'
import PaginationControls from '@/components/shared/PaginationControls'
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ConfirmDialog,
} from '@/components/ui'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Copy,
  MessageCircle,
  Pencil,
  Trash2,
  Plus,
  Search,
  Loader2,
  FileText,
  CalendarDays,
  KeyRound,
  Link2,
  ChevronDown,
} from 'lucide-react'

const QUESTIONS_PER_PAGE = 20

interface QuestionDraft {
  question_text: string
  points: number
  options: Array<{ option_key: string; option_text: string }>
  answer_key: string
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E']

const draftFromQuestion = (
  q: BankSoalDetailType['questions'][number]
): QuestionDraft => ({
  question_text: q.question_text,
  points: q.points,
  options: OPTION_KEYS.map((key) => ({
    option_key: key,
    option_text:
      q.options.find((opt) => opt.option_key === key)?.option_text || '',
  })),
  answer_key: q.options.find((opt) => opt.is_correct)?.option_key || 'A',
})

const emptyDraft = (): QuestionDraft => ({
  question_text: '',
  points: 1,
  options: OPTION_KEYS.map((key) => ({ option_key: key, option_text: '' })),
  answer_key: 'A',
})

const isDraftDirty = (draft: QuestionDraft, original?: QuestionDraft | null) => {
  if (!original) return true
  if (draft.question_text !== original.question_text) return true
  if (Number(draft.points) !== Number(original.points)) return true
  if (draft.answer_key !== original.answer_key) return true
  return draft.options.some(
    (opt) =>
      opt.option_text !==
      original.options.find((o) => o.option_key === opt.option_key)?.option_text
  )
}

export default function BankSoalDetailPage() {
  const { bankId } = useParams<{ bankId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Detail Query — respons detail sudah menyertakan in_use (bank dipakai jadwal)
  const {
    data: bank,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['cbt-bank-detail', bankId],
    queryFn: () => cbtService.getBankDetail(bankId!),
    enabled: !!bankId,
  })

  const inUse = !!bank?.in_use

  // Meta Edit State
  const [metaDraft, setMetaDraft] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
  })
  useEffect(() => {
    if (bank) {
      setMetaDraft({
        title: bank.title,
        description: bank.description || '',
        duration_minutes: bank.duration_minutes,
      })
    }
  }, [bank?.id, bank?.title, bank?.description, bank?.duration_minutes])

  const metaOriginal = bank
    ? {
        title: bank.title,
        description: bank.description || '',
        duration_minutes: bank.duration_minutes,
      }
    : null
  const metaDirty =
    !!metaOriginal &&
    (metaDraft.title !== metaOriginal.title ||
      metaDraft.description !== metaOriginal.description ||
      metaDraft.duration_minutes !== metaOriginal.duration_minutes)

  const updateBankMutation = useMutation({
    mutationFn: () =>
      cbtService.updateBank(bankId!, {
        title: metaDraft.title.trim(),
        description: metaDraft.description.trim(),
        duration_minutes: Number(metaDraft.duration_minutes) || 60,
      }),
    onSuccess: () => {
      toast('success', 'Data bank soal tersimpan.')
      queryClient.invalidateQueries({ queryKey: ['cbt-bank-detail', bankId] })
      queryClient.invalidateQueries({ queryKey: ['cbt-banks'] })
    },
    onError: (err: any) => toast('error', err.message || 'Gagal menyimpan data bank soal.'),
  })

  const handleMetaSave = () => {
    if (!metaDraft.title.trim() || metaDraft.title.trim().length < 3) {
      toast('error', 'Judul bank soal minimal 3 karakter.')
      return
    }
    const dur = Number(metaDraft.duration_minutes)
    if (dur < 5 || dur > 300) {
      toast('error', 'Durasi ujian harus antara 5 sampai 300 menit.')
      return
    }
    updateBankMutation.mutate()
  }

  // Question List State
  const [qSearch, setQSearch] = useState('')
  const [qPage, setQPage] = useState(1)
  useEffect(() => {
    setQPage(1)
  }, [qSearch])

  const questions = bank?.questions ?? []
  const filteredQuestions = questions.filter((q) => {
    if (!qSearch.trim()) return true
    const raw = qSearch.trim().toLowerCase()
    return (
      q.question_text.toLowerCase().includes(raw) ||
      q.options.some((opt) => opt.option_text.toLowerCase().includes(raw)) ||
      String(q.question_number).includes(raw)
    )
  })
  const qTotalPages = Math.max(1, Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE))
  const qPaged = filteredQuestions.slice(
    (qPage - 1) * QUESTIONS_PER_PAGE,
    qPage * QUESTIONS_PER_PAGE
  )

  // Question Editing State
  const [editingId, setEditingId] = useState<string | null>(null) // null | question-id | '__new__'
  const [draft, setDraft] = useState<QuestionDraft | null>(null)
  const [draftOriginal, setDraftOriginal] = useState<QuestionDraft | null>(null)
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null)
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null)
  const [showDeleteBank, setShowDeleteBank] = useState(false)
  const [showShare, setShowShare] = useState(false)

  const startEdit = (q: BankSoalDetailType['questions'][number]) => {
    setEditingId(q.id)
    setOpenQuestionId(q.id)
    const d = draftFromQuestion(q)
    setDraft(d)
    setDraftOriginal(JSON.parse(JSON.stringify(d)))
  }

  const startCreate = () => {
    setEditingId('__new__')
    setDraft(emptyDraft())
    setDraftOriginal(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
    setDraftOriginal(null)
  }

  const saveQuestionMutation = useMutation({
    mutationFn: () => {
      const payload = {
        question_text: (draft!.question_text || '').trim(),
        points: Number(draft!.points) || 1,
        answer_key: draft!.answer_key,
        options: draft!.options
          .filter((o) => o.option_text.trim())
          .map((o) => ({ option_key: o.option_key, option_text: o.option_text.trim() })),
      }
      if (editingId === '__new__') {
        return cbtService.addQuestion(bankId!, payload)
      }
      return cbtService.updateQuestion(bankId!, editingId!, payload)
    },
    onSuccess: () => {
      toast('success', 'Soal tersimpan.')
      cancelEdit()
      queryClient.invalidateQueries({ queryKey: ['cbt-bank-detail', bankId] })
      queryClient.invalidateQueries({ queryKey: ['cbt-banks'] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal menyimpan soal. Periksa opsi dan kunci jawaban.')
    },
  })

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) => cbtService.deleteQuestion(bankId!, questionId),
    onSuccess: () => {
      toast('success', 'Soal berhasil dihapus dan penomoran diperbarui.')
      setDeleteQuestionId(null)
      queryClient.invalidateQueries({ queryKey: ['cbt-bank-detail', bankId] })
      queryClient.invalidateQueries({ queryKey: ['cbt-banks'] })
    },
    onError: (err: any) => {
      setDeleteQuestionId(null)
      toast('error', err.message || 'Gagal menghapus soal.')
    },
  })

  const deleteBankMutation = useMutation({
    mutationFn: () => cbtService.deleteBankSoal(bankId!),
    onSuccess: () => {
      toast('success', 'Bank Soal berhasil dihapus.')
      setShowDeleteBank(false)
      queryClient.invalidateQueries({ queryKey: ['cbt-banks'] })
      navigate(`/admin/bank-soal/${bank?.category ?? 'akademik'}`)
    },
    onError: (err: any) => {
      setShowDeleteBank(false)
      toast('error', err.message || 'Gagal menghapus Bank Soal.')
    },
  })

  // ── Bagikan Akses Ujian (link ruang ujian + PIN per jadwal) ──
  const categoryLabel = (bank?.category ?? '') === 'akademik' ? 'Tes Akademik' : 'Tes Psikologi'
  const formatDateID = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return String(d)
    }
  }
  const examLinkOf = (s: BankScheduleShare) => `${window.location.origin}/exam/${s.id}`
  const shareTextOf = (s: BankScheduleShare) =>
    [
      `Akses Ujian CBT — ${categoryLabel}`,
      `Penerimaan Pesantren Tahfidz Qur'an dan Digital Ar-Rahman`,
      `Jadwal: ${formatDateID(s.session_date)} · ${s.start_time} WIB`,
      s.batch_name ? `Kloter: ${s.batch_name}` : null,
      `Pelaksanaan: ${s.mode === 'online' ? 'Online (Zoom/Meet)' : 'Tatap Muka di ruang ujian'}`,
      `PIN Ujian: ${s.access_token ?? '-'}`,
      `Halaman ujian: ${examLinkOf(s)}`,
      `Cara masuk: login akun pendaftar di portal PPDB, buka halaman ujian di atas saat sesi dimulai, lalu isi password akun dan PIN.`,
    ]
      .filter(Boolean)
      .join('\n')

  const copyShareLink = async (s: BankScheduleShare) => {
    try {
      await navigator.clipboard.writeText(examLinkOf(s))
      toast('success', 'Link akses ujian disalin. Bagikan ke peserta.')
    } catch {
      toast('error', 'Gagal menyalin link akses ujian.')
    }
  }

  const copyShareText = async (s: BankScheduleShare) => {
    try {
      await navigator.clipboard.writeText(shareTextOf(s))
      toast('success', 'Teks akses ujian disalin, siap ditempel ke peserta.')
    } catch {
      toast('error', 'Gagal menyalin teks akses ujian.')
    }
  }

  const shareViaWa = (s: BankScheduleShare) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareTextOf(s))}`, '_blank')
  }

  const shareViaOs = async (s: BankScheduleShare) => {
    const text = shareTextOf(s)
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Akses Ujian CBT — ${categoryLabel}`,
          text,
          url: examLinkOf(s),
        })
      } else {
        await navigator.clipboard.writeText(text)
        toast('success', 'Teks akses ujian disalin, siap ditempel ke peserta.')
      }
    } catch {
      // Dibatalkan pengguna
    }
  }

  const renderEditorFields = () => {
    if (!draft) return null
    const changed =
      editingId === '__new__' || isDraftDirty(draft, draftOriginal)
    return (
      <div className="p-4 rounded-lg border-2 border-emerald-300/70 bg-emerald-50/30 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground text-xs uppercase tracking-wide">
            {editingId === '__new__' ? 'Soal Baru' : 'Ubah Soal'}
          </span>
          {saveQuestionMutation.isPending && (
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Teks Pertanyaan *</Label>
          <Textarea
            rows={3}
            value={draft.question_text}
            onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
            placeholder="Tulis pertanyaan secara lengkap dan jelas."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
          <div className="md:col-span-1 space-y-1.5">
            <Label className="text-xs font-semibold">Poin *</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={draft.points}
              onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) || 1 })}
            />
          </div>
          <div className="md:col-span-4 space-y-1.5">
            <Label className="text-xs font-semibold">Kunci Jawaban *</Label>
            <div className="flex flex-wrap gap-3">
              {draft.options.map((opt) => (
                <label
                  key={opt.option_key}
                  className={`flex items-center gap-2 px-3 h-8 rounded border text-xs font-medium cursor-pointer transition-colors ${
                    draft.answer_key === opt.option_key
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-white border-border text-slate-600 hover:border-emerald-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`answer-key-${editingId}`}
                    className="accent-emerald-600"
                    checked={draft.answer_key === opt.option_key}
                    onChange={() => setDraft({ ...draft, answer_key: opt.option_key })}
                  />
                  {opt.option_key}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Pilihan Jawaban (A sampai E) *</Label>
          <div className="space-y-2">
            {draft.options.map((opt, idx) => {
              const isKey = draft.answer_key === opt.option_key
              return (
                <div key={opt.option_key} className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold ${
                      isKey ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {opt.option_key}
                  </span>
                  <Input
                    className="h-8 text-xs"
                    placeholder={idx < 4 ? `Wajib diisi (Pilihan ${opt.option_key})` : `Opsional (Pilihan ${opt.option_key})`}
                    value={opt.option_text}
                    onChange={(e) => {
                      const next = [...draft.options]
                      next[idx] = { ...opt, option_text: e.target.value }
                      setDraft({ ...draft, options: next })
                    }}
                  />
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Minimal pilihan A sampai D wajib terisi. Pilihan E opsional.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saveQuestionMutation.isPending}>
            Batal
          </Button>
          {changed && (
            <Button
              size="sm"
              disabled={saveQuestionMutation.isPending || !draft.question_text.trim() || !draft.options.some((o) => o.option_text.trim())}
              onClick={() => saveQuestionMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
            >
              {saveQuestionMutation.isPending ? 'Menyimpan...' : 'Simpan Soal'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse h-36 bg-muted/40" />
        <Card className="animate-pulse h-96 bg-muted/30" />
      </div>
    )
  }

  if (isError || !bank) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={AlertTriangle}
          title="Bank Soal tidak ditemukan"
          description={(error as any)?.message || 'Data bank soal tidak tersedia atau sudah dihapus.'}
          action={
            <Button variant="outline" onClick={() => navigate(-1)}>
              Kembali
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Top Navigation & Back Header (pola Tahfidz/Wawancara) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/bank-soal/${bank.category}`)}
            className="h-9 w-9 p-0 rounded-full"
            title="Kembali ke Bank Soal"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-xl font-bold text-slate-900">{bank.title}</h1>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 capitalize">
                {bank.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Butir soal pilihan ganda, kunci jawaban, dan akses ujian CBT
            </p>
          </div>
        </div>

        {/* Header CTAs */}
        <div className="flex items-center gap-2">
          <DocTrigger docKey="ppdb-bank-soal" variant="light" />
          <Button size="sm" variant="outline" onClick={() => setShowShare(true)} className="flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-emerald-600" />
            Bagikan Akses
          </Button>
        </div>
      </div>

      {/* Karakteristik Bank */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            Jumlah Soal
          </div>
          <div className="mt-1 text-lg font-bold text-foreground">{bank.total_questions}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Total Poin
          </div>
          <div className="mt-1 text-lg font-bold text-foreground">{bank.total_points}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            Durasi Ujian
          </div>
          <div className="mt-1 text-lg font-bold text-foreground">{bank.duration_minutes} Menit</div>
        </Card>
      </div>

      {inUse && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Bank Soal ini sudah dipakai pada Jadwal Ujian, sehingga data dan butir soalnya
            dikunci. Hapus jadwal yang memakainya jika butir soal perlu direvisi.
          </div>
        </div>
      )}

      {/* Edit Data Bank */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Data Bank Soal</h3>
            {metaDirty && !inUse && (
              <Button
                size="sm"
                onClick={handleMetaSave}
                disabled={updateBankMutation.isPending}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {updateBankMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  'Simpan Data'
                )}
              </Button>
            )}
          </div>

          {metaDirty && !inUse && (
            <p className="text-[11px] text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Ada perubahan yang belum disimpan. Tekan Simpan Data untuk menerapkannya.
            </p>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Judul Bank Soal *</Label>
              <Input
                value={metaDraft.title}
                disabled={inUse}
                onChange={(e) => setMetaDraft({ ...metaDraft, title: e.target.value })}
                placeholder="Judul bank soal"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deskripsi (Opsional)</Label>
              <Textarea
                rows={2}
                value={metaDraft.description}
                disabled={inUse}
                onChange={(e) =>
                  setMetaDraft({ ...metaDraft, description: e.target.value })
                }
                placeholder="Catatan singkat tentang cakupan materi bank soal ini."
              />
            </div>
            <div className="space-y-1.5 sm:max-w-xs">
              <Label className="text-xs font-semibold">Durasi Ujian (Menit)</Label>
              <Input
                type="number"
                min={5}
                max={300}
                value={metaDraft.duration_minutes}
                disabled={inUse}
                onChange={(e) =>
                  setMetaDraft({
                    ...metaDraft,
                    duration_minutes: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Menjadi durasi timer ujian untuk jadwal yang memakai bank soal ini.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Butir Soal */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground">
              Butir Soal ({bank.total_questions})
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari teks soal atau nomor..."
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
              <Button
                size="sm"
                onClick={startCreate}
                disabled={inUse || editingId === '__new__'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-1" />
                Tambah Soal
              </Button>
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            qSearch ? (
              <EmptyState
                icon={Search}
                title="Tidak ada soal yang cocok"
                description={`Pencarian "${qSearch.trim()}" tidak menemukan soal. Coba kata kunci lain.`}
                action={
                  <Button variant="outline" onClick={() => setQSearch('')}>
                    Reset Pencarian
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="Belum ada butir soal"
                description={inUse ? 'Bank soal ini belum memiliki butir soal.' : 'Tambahkan butir soal pertama melalui tombol Tambah Soal.'}
                action={
                  !inUse ? (
                    <Button onClick={startCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Plus className="w-4 h-4 mr-1.5" /> Tambah Soal
                    </Button>
                  ) : undefined
                }
              />
            )
          ) : (
            <div className="space-y-3">
              {qPaged.map((q) => {
                const isEditing = editingId === q.id
                const isOpen = isEditing || openQuestionId === q.id
                return (
                  <div
                    key={q.id}
                    className="rounded-lg border border-border bg-card overflow-hidden text-sm"
                  >
                    {/* Accordion header: nomor + pratinjau soal + poin */}
                    <button
                      type="button"
                      disabled={isEditing}
                      onClick={() =>
                        setOpenQuestionId(openQuestionId === q.id ? null : q.id)
                      }
                      className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-emerald-50/40 transition-colors disabled:cursor-default"
                      title={isEditing ? 'Sedang dalam mode ubah soal' : 'Klik untuk membuka soal'}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                          {q.question_number}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {q.question_text || 'Soal kosong'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px]">
                          {q.points} Poin
                        </Badge>
                        {isEditing ? (
                          <span className="text-[10px] font-semibold text-emerald-700">Ubah...</span>
                        ) : (
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3">
                        {isEditing && draft ? (
                          renderEditorFields()
                        ) : (
                          <>
                            {!inUse && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(q)}
                                  className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
                                  title="Ubah soal"
                                >
                                  <Pencil className="w-3.5 h-3.5 mr-1" />
                                  Ubah
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteQuestionId(q.id)}
                                  className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                                  title="Hapus soal"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                                  Hapus
                                </Button>
                              </div>
                            )}
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
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {editingId === '__new__' && draft && (
                <div className="pt-2">
                  {renderEditorFields()}
                </div>
              )}

              <PaginationControls
                page={qPage}
                totalPages={qTotalPages}
                onPageChange={setQPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zona Hapus Bank */}
      <Card className="border-red-200">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-red-700">Hapus Bank Soal</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Bank beserta seluruh butir soalnya dihapus permanen dan tidak dapat dikembalikan.
              Bank yang sudah dipakai jadwal ujian tidak dapat dihapus.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={inUse || deleteBankMutation.isPending}
            onClick={() => setShowDeleteBank(true)}
            className="shrink-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Hapus Bank
          </Button>
        </CardContent>
      </Card>

      {/* Modal Bagikan Akses Ujian */}
      <Dialog open={showShare} onOpenChange={setShowShare}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pr-16 border-b bg-slate-50/60 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Share2 className="h-5 w-5 text-emerald-600" />
              Bagikan Akses Ujian
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tautan ruang ujian dan PIN yang dikirim ke peserta untuk mengerjakan ujian.
              Peserta perlu login akun pendaftar terlebih dahulu.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 p-5 space-y-3">
            {bank.schedules.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Belum ada jadwal ujian"
                description="Tidak ada jadwal ujian yang memakai bank soal ini. Buat jadwal di menu Jadwal Seleksi terlebih dahulu."
                action={
                  <Button variant="outline" onClick={() => setShowShare(false)}>
                    Tutup
                  </Button>
                }
              />
            ) : (
              bank.schedules.map((s) => (
                <div key={s.id} className="p-3 rounded-lg border border-border bg-card space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-foreground">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <CalendarDays className="w-3 h-3" />
                        {formatDateID(s.session_date)} · {s.start_time} WIB
                        {s.batch_name ? ` · ${s.batch_name}` : ''}
                        {' · '}
                        {s.mode === 'online' ? 'Online (Zoom/Meet)' : 'Tatap Muka di ruang ujian'}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      PIN {s.access_token ?? '-'}
                    </Badge>
                  </div>
                  <div className="p-2 rounded bg-muted/40 border border-border text-[11px] font-mono text-slate-600 break-all" aria-label="Link akses ujian">
                    {examLinkOf(s)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyShareLink(s)} className="h-7 px-2.5 text-xs">
                      <Link2 className="w-3.5 h-3.5" />
                      Salin Link
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyShareText(s)} className="h-7 px-2.5 text-xs">
                      <Copy className="w-3.5 h-3.5" />
                      Salin Teks
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => shareViaWa(s)}
                      className="h-7 px-2.5 text-xs text-green-700 border-green-200 hover:bg-green-50 hover:text-green-800"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => shareViaOs(s)} className="h-7 px-2.5 text-xs">
                      <Share2 className="w-3.5 h-3.5" />
                      Bagikan
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50/60 shrink-0 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowShare(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!deleteQuestionId}
        onClose={() => setDeleteQuestionId(null)}
        title="Hapus Butir Soal?"
        message="Soal ini akan dihapus dari bank dan nomor soal lainnya akan digeser otomatis. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        variant="destructive"
        onConfirm={() => deleteQuestionId && deleteQuestionMutation.mutate(deleteQuestionId)}
        loading={deleteQuestionMutation.isPending}
      />

      <ConfirmDialog
        isOpen={showDeleteBank}
        onClose={() => setShowDeleteBank(false)}
        title="Hapus Bank Soal?"
        message="Bank Soal beserta seluruh butir soalnya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        variant="destructive"
        onConfirm={() => deleteBankMutation.mutate()}
        loading={deleteBankMutation.isPending}
      />
    </div>
  )
}
