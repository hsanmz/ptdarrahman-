import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { cbtService, type ExamSheet, type QuestionPublic } from '@/services/cbtService'
import { useToast } from '@/components/Toast'
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui'
import {
  Lock,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react'

type ExamStage = 'GATE' | 'EXAM' | 'LOCKED' | 'COMPLETED'

export default function CbtExamPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Stages
  const [stage, setStage] = useState<ExamStage>('GATE')

  // Gate Re-Auth Form
  const [password, setPassword] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [gateError, setGateError] = useState<string | null>(null)

  // Exam Sheet State
  const [examSheet, setExamSheet] = useState<ExamSheet | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({}) // question_id -> option_key
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600)
  const [isSavingAnswer, setIsSavingAnswer] = useState(false)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [finalScore, setFinalScore] = useState<number | null>(null)

  // Anti-Cheat State
  const [blurWarningSeconds, setBlurWarningSeconds] = useState<number | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isExamActiveRef = useRef(false)
  isExamActiveRef.current = stage === 'EXAM'

  // Gate Re-Auth Mutation
  const verifyMutation = useMutation({
    mutationFn: () =>
      cbtService.verifyAccess(scheduleId!, password, accessToken.trim().toUpperCase()),
    onSuccess: async (data) => {
      setGateError(null)
      if (data.status === 'locked') {
        setStage('LOCKED')
        return
      }
      if (data.status === 'completed') {
        setStage('COMPLETED')
        return
      }
      // Load Exam Sheet
      try {
        const sheet = await cbtService.getExamSheet(scheduleId!)
        setExamSheet(sheet)
        setAnswers(sheet.saved_answers || {})
        setRemainingSeconds(sheet.remaining_seconds)
        setStage('EXAM')
        // Try enter fullscreen
        try {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {})
          }
        } catch {
          // ignore fullscreen restriction
        }
      } catch (err: any) {
        if (err.status === 423) {
          setStage('LOCKED')
        } else {
          toast('error', err.message || 'Gagal memuat lembar soal ujian.')
        }
      }
    },
    onError: (err: any) => {
      setGateError(err.message || 'Verifikasi login ujian gagal.')
    },
  })

  // Poll attempt status when in LOCKED state
  useEffect(() => {
    if (stage !== 'LOCKED' || !scheduleId) return

    const interval = setInterval(async () => {
      try {
        const res = await cbtService.getAttemptStatus(scheduleId)
        if (res.status === 'in_progress') {
          // Unfrozen by admin!
          toast('success', 'Kunci ujian telah dibuka oleh Pengawas! Memuat kembali lembar soal...')
          const sheet = await cbtService.getExamSheet(scheduleId)
          setExamSheet(sheet)
          setAnswers(sheet.saved_answers || {})
          setRemainingSeconds(sheet.remaining_seconds)
          setStage('EXAM')
        } else if (res.status === 'completed') {
          setStage('COMPLETED')
        }
      } catch {
        // ignore polling error
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [stage, scheduleId, toast])

  // Countdown Timer & Periodic Server Sync
  useEffect(() => {
    if (stage !== 'EXAM') return

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleFinishExam() // Auto-finish on timeout
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Sync timer to backend every 30s
    syncTimerRef.current = setInterval(() => {
      setRemainingSeconds((current) => {
        if (scheduleId && current > 0) {
          cbtService.syncTimer(scheduleId, current).catch(() => {})
        }
        return current
      })
    }, 30000)

    return () => {
      clearInterval(timer)
      if (syncTimerRef.current) clearInterval(syncTimerRef.current)
    }
  }, [stage, scheduleId])

  // ── Anti-Cheat: Tab Switch & Window Blur Detection (3s Warning & 5s Lock) ──
  const triggerViolation = useCallback(async () => {
    if (!scheduleId) return
    try {
      await cbtService.reportViolation(scheduleId, 'leave_tab_more_than_5s')
    } catch {
      // ignore
    }
    setBlurWarningSeconds(null)
    setStage('LOCKED')
  }, [scheduleId])

  useEffect(() => {
    if (stage !== 'EXAM') return

    let blurCountdown = 5
    let blurInterval: ReturnType<typeof setInterval> | null = null

    const handleWindowLeave = () => {
      if (!isExamActiveRef.current) return
      blurCountdown = 5
      setBlurWarningSeconds(blurCountdown)

      if (blurInterval) clearInterval(blurInterval)
      blurInterval = setInterval(() => {
        blurCountdown -= 1
        setBlurWarningSeconds(blurCountdown)
        if (blurCountdown <= 0) {
          if (blurInterval) clearInterval(blurInterval)
          triggerViolation()
        }
      }, 1000)
    }

    const handleWindowReturn = () => {
      if (blurInterval) clearInterval(blurInterval)
      setBlurWarningSeconds(null)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleWindowLeave()
      } else {
        handleWindowReturn()
      }
    }

    window.addEventListener('blur', handleWindowLeave)
    window.addEventListener('focus', handleWindowReturn)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleWindowLeave)
      window.removeEventListener('focus', handleWindowReturn)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (blurInterval) clearInterval(blurInterval)
    }
  }, [stage, triggerViolation])

  // Prevent Keyboard Shortcuts & Context Menu
  useEffect(() => {
    if (stage !== 'EXAM') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12, Ctrl+Shift+I, Ctrl+C, Ctrl+V, Ctrl+U, PrintScreen
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault()
        toast('error', 'Aksi ini dilarang selama ujian berlangsung!')
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [stage, toast])

  // Handle Option Select (Autosave)
  const handleSelectOption = async (question: QuestionPublic, optionId: string, optionKey: string) => {
    // 1. Optimistic local update
    setAnswers((prev) => ({ ...prev, [question.id]: optionKey }))

    // 2. Autosave to server
    if (!scheduleId) return
    setIsSavingAnswer(true)
    try {
      await cbtService.saveAnswer(scheduleId, question.id, optionId, optionKey)
    } catch (err: any) {
      if (err.status === 423) {
        setStage('LOCKED')
      } else {
        toast('error', 'Gagal menyimpan jawaban. Periksa koneksi internet Anda.')
      }
    } finally {
      setIsSavingAnswer(false)
    }
  }

  // Handle Finish Exam
  const handleFinishExam = async () => {
    if (!scheduleId) return
    setShowFinishConfirm(false)
    try {
      const res = await cbtService.finishExam(scheduleId)
      setFinalScore(res.score)
      setStage('COMPLETED')
      toast('success', 'Ujian berhasil diselesaikan!')
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengirimkan ujian.')
    }
  }

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER 1: GATE RE-AUTHENTICATION
  // ═════════════════════════════════════════════════════════════════════════
  if (stage === 'GATE') {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              PESANTREN TAHFIDZ QUR'AN DAN DIGITAL AR-RAHMAN
            </h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              Sistem Resmi CBT Seleksi Santri Baru (PTDARRAHMAN)
            </p>
          </div>

          <Card className="border border-emerald-500/30 shadow-lg">
            <CardContent className="p-6 space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Konfirmasi Kehadiran Ujian
                </h3>
                <p className="text-xs text-muted-foreground">
                  Harap masukkan password akun pendaftaran Anda dan PIN Sesi Ujian yang diberikan Pengawas di ruangan.
                </p>
              </div>

              {gateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{gateError}</div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  verifyMutation.mutate()
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Password Akun PPDB Anda *</Label>
                  <Input
                    type="password"
                    placeholder="Masukkan password akun PPDB Anda"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">PIN Token Sesi Ujian *</Label>
                  <Input
                    placeholder="Contoh: AKAD-1234 atau PSIK-1234"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="font-mono uppercase tracking-widest text-center text-sm font-bold"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    PIN dibagikan oleh Pengawas Ujian saat sesi dibuka.
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
                  <strong>Tata Tertib Anti-Curang:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                    <li>Dilarang berpindah tab browser atau membuka aplikasi lain.</li>
                    <li>Meninggalkan layar ujian lebih dari 5 detik akan otomatis <strong>MENGUNCI UJIAN</strong>.</li>
                    <li>Jawaban Anda tersimpan otomatis setiap kali memilih opsi.</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={verifyMutation.isPending || !password || !accessToken}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5"
                >
                  {verifyMutation.isPending ? 'Memverifikasi...' : 'Mulai / Masuk Ujian'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER 2: LOCKED SCREEN (TERKUNCI KARENA KELUAR TAB > 5 DETIK)
  // ═════════════════════════════════════════════════════════════════════════
  if (stage === 'LOCKED') {
    return (
      <div className="min-h-screen bg-red-950/90 flex flex-col items-center justify-center p-4 select-none">
        <Card className="w-full max-w-lg border-2 border-red-500 shadow-2xl bg-background animate-shake">
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto animate-pulse">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <Badge className="bg-red-600 text-white font-bold text-xs uppercase px-3 py-1">
                Peringatan Sistem Anti-Curang
              </Badge>
              <h2 className="text-2xl font-extrabold text-red-700">
                UJIAN ANDA TERKUNCI!
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Anda terdeteksi meninggalkan layar ujian selama lebih dari <strong>5 detik</strong>.
                Sesi ujian Anda telah dibekukan secara otomatis demi menjaga integritas dan kejujuran seleksi.
              </p>
            </div>

            <div className="p-4 bg-muted/40 border border-border rounded-lg text-xs space-y-2 text-left">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                Cara Membuka Kunci:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Angkat tangan dan lapor langsung ke <strong>Pengawas Ujian</strong> di ruangan.</li>
                <li>Pengawas akan memeriksa dan menekan tombol <strong>Buka Kunci (Unfreeze)</strong> dari sistem pemantauan.</li>
                <li>Halaman ini akan otomatis membuka kembali lembar soal setelah diizinkan pengawas.</li>
              </ol>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 pt-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Menunggu izin pembukaan kunci dari Pengawas...</span>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Tenang, seluruh jawaban yang telah Anda pilih sebelumnya <strong>100% tersimpan aman</strong> di server kami.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER 3: COMPLETED SCREEN
  // ═════════════════════════════════════════════════════════════════════════
  if (stage === 'COMPLETED') {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border border-emerald-500/40 shadow-xl text-center">
          <CardContent className="p-8 space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <Badge className="bg-emerald-600 text-white text-xs font-semibold">
                Alhamdulillah
              </Badge>
              <h2 className="text-2xl font-bold text-foreground">
                Ujian Berhasil Diselesaikan!
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Seluruh jawaban Anda telah berhasil terkirim dan tersimpan secara permanen di sistem seleksi PTDARRAHMAN.
              </p>
            </div>

            {finalScore !== null && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                <span className="text-xs text-emerald-800 font-medium">Skor / Nilai Anda:</span>
                <div className="text-3xl font-extrabold text-emerald-700">{finalScore}</div>
              </div>
            )}

            <Button
              onClick={() => navigate('/applicant')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Kembali ke Dashboard PPDB
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER 4: ACTIVE CBT ROOM (SOAL + AUTOSAVE + TIMER)
  // ═════════════════════════════════════════════════════════════════════════
  const questions = examSheet?.questions || []
  const currentQ = questions[currentQuestionIndex]
  const answeredCount = Object.keys(answers).length
  const totalCount = questions.length

  return (
    <div className="min-h-screen bg-background flex flex-col select-none">
      {/* ⚠️ EMERGENCY WARNING MODAL WHEN BLUR / LEAVING TAB ⚠️ */}
      {blurWarningSeconds !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-red-600 text-white p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl border-4 border-white animate-bounce">
            <ShieldAlert className="w-16 h-16 mx-auto text-yellow-300" />
            <h3 className="text-2xl font-black tracking-wide">
              PERINGATAN DARURAT!
            </h3>
            <p className="text-sm font-semibold leading-relaxed">
              Anda terdeteksi meninggalkan layar ujian!
              Segera kembali ke layar ini sekarang juga!
            </p>
            <div className="text-5xl font-black font-mono text-yellow-300">
              {blurWarningSeconds}s
            </div>
            <p className="text-xs text-red-100">
              Jika waktu habis, ujian Anda akan otomatis <strong>TERKUNCI</strong> dan Anda dikeluarkan dari sesi ujian!
            </p>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="h-16 border-b border-border bg-card px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
            AR
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-base text-foreground line-clamp-1">
              {examSheet?.exam_title || 'Ujian Seleksi Calon Santri'}
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              Pesantren Tahfidz Qur'an dan Digital Ar-Rahman (PTDARRAHMAN)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Autosave Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{isSavingAnswer ? 'Menyimpan...' : 'Jawaban Autosaved'}</span>
          </div>

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm shadow-sm ${
              remainingSeconds < 300
                ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          <Button
            size="sm"
            onClick={() => setShowFinishConfirm(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Selesai Ujian
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Left/Center: Question Sheet */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          {currentQ ? (
            <Card className="border border-border/80 shadow-sm flex-1 flex flex-col justify-between">
              <CardContent className="p-6 md:p-8 space-y-6 flex-1">
                <div className="flex items-center justify-between pb-4 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base md:text-lg text-emerald-700">
                      Soal No. {currentQ.question_number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      dari {totalCount} Soal
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Bobot: {currentQ.points} Poin
                  </Badge>
                </div>

                {/* Question Text */}
                <div className="text-base md:text-lg text-foreground font-medium leading-relaxed whitespace-pre-line py-2">
                  {currentQ.question_text}
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((opt) => {
                    const isSelected = answers[currentQ.id] === opt.option_key
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(currentQ, opt.id, opt.option_key)}
                        className={`group cursor-pointer p-3.5 md:p-4 rounded-xl border-2 transition-all flex items-center gap-3.5 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-semibold shadow-sm'
                            : 'border-border hover:border-emerald-400/60 hover:bg-muted/30 text-foreground'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-muted text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-800'
                          }`}
                        >
                          {opt.option_key}
                        </div>
                        <span className="text-sm md:text-base leading-snug">{opt.option_text}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>

              {/* Prev / Next Bottom Navigation */}
              <div className="p-4 md:px-8 border-t border-border/60 flex items-center justify-between bg-muted/10 rounded-b-xl">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="text-xs h-9 px-4"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Sebelumnya
                </Button>

                <span className="text-xs text-muted-foreground font-mono">
                  {currentQuestionIndex + 1} / {totalCount}
                </span>

                <Button
                  size="sm"
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.min(totalCount - 1, prev + 1))
                  }
                  disabled={currentQuestionIndex === totalCount - 1}
                  className="text-xs h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Selanjutnya
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-sm text-muted-foreground">
              Tidak ada soal tersedia.
            </Card>
          )}
        </div>

        {/* Right Sidebar: Question Grid Navigator */}
        <div className="w-full md:w-80 space-y-4">
          <Card className="border border-border/80 shadow-sm sticky top-24">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-foreground">Daftar Soal</h3>
                <span className="text-xs font-semibold text-emerald-700">
                  {answeredCount} / {totalCount} Terjawab
                </span>
              </div>

              {/* Grid 1..N */}
              <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto p-1">
                {questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id]
                  const isCurrent = idx === currentQuestionIndex
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'ring-2 ring-emerald-600 ring-offset-2 scale-105 z-10'
                          : ''
                      } ${
                        isAnswered
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                          : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-around text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-600"></div>
                  <span>Sudah Dijawab</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-muted border border-border"></div>
                  <span>Belum</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFinishConfirm(true)}
                className="w-full text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50 mt-2"
              >
                Kirim Lembar Jawaban
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal: Selesai Ujian */}
      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Konfirmasi Selesai Ujian
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>
              Anda telah menjawab <strong>{answeredCount}</strong> dari total <strong>{totalCount}</strong> butir soal.
            </p>
            {answeredCount < totalCount && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Masih terdapat <strong>{totalCount - answeredCount} butir soal</strong> yang belum Anda jawab.
                </span>
              </div>
            )}
            <p className="text-xs">
              Setelah dikirim, jawaban Anda tidak dapat diubah kembali dan nilai akan otomatis dihitung oleh sistem.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowFinishConfirm(false)}>
              Lanjut Mengerjakan
            </Button>
            <Button
              onClick={handleFinishExam}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Ya, Selesaikan Ujian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
