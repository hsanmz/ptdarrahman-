import { apiFetch, apiFetchBlob } from '@/api/client'

export interface BankSoalItem {
  id: string
  period_id: string
  category: 'akademik' | 'psikologi'
  title: string
  description?: string | null
  duration_minutes: number
  total_questions: number
  total_points: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BankSoalDetail extends BankSoalItem {
  questions: Array<{
    id: string
    question_number: number
    question_text: string
    points: number
    options: Array<{
      id: string
      option_key: string
      option_text: string
      is_correct: boolean
    }>
  }>
}

export interface ScheduleItem {
  id: string
  period_id: string
  wave_id: string
  wave_name?: string
  bank_id: string
  bank_title?: string
  duration_minutes?: number
  category: 'akademik' | 'psikologi'
  name: string
  batch_name?: string | null
  session_date: string
  start_time: string
  end_time: string
  officer_name?: string | null
  mode: 'offline' | 'online'
  location?: string | null
  meeting_url?: string | null
  access_token: string
  notes?: string | null
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  total_eligible: number
  total_attempts: number
  created_at: string
}

export interface CandidateMonitoring {
  applicant_id: string
  registration_number?: string | null
  full_name: string
  phone: string
  status: 'not_started' | 'in_progress' | 'locked' | 'completed'
  started_at?: string | null
  finished_at?: string | null
  remaining_seconds?: number | null
  violations_count: number
  last_violation_at?: string | null
  answers_count: number
  total_questions: number
  score?: number | null
}

export interface MonitoringResponse {
  schedule: ScheduleItem
  candidates: CandidateMonitoring[]
  stats: {
    total: number
    not_started: number
    in_progress: number
    locked: number
    completed: number
  }
}

export interface QuestionPublic {
  id: string
  question_number: number
  question_text: string
  points: number
  options: Array<{
    id: string
    option_key: string
    option_text: string
  }>
}

export interface ExamSheet {
  schedule_id: string
  exam_title: string
  category: string
  duration_minutes: number
  remaining_seconds: number
  status: string
  questions: QuestionPublic[]
  saved_answers: Record<string, string>
}

export const cbtService = {
  // ── Admin: Bank Soal ───────────────────────────────────────────
  getBanks: (category: 'akademik' | 'psikologi') =>
    apiFetch<BankSoalItem[]>(`/cbt/banks?category=${category}`),

  getBankDetail: (bankId: string) =>
    apiFetch<BankSoalDetail>(`/cbt/banks/${bankId}`),

  importBankSoal: (formData: FormData) =>
    apiFetch<BankSoalItem>('/cbt/banks/import', {
      method: 'POST',
      body: formData,
    }),

  deleteBankSoal: (bankId: string) =>
    apiFetch<{ message: string }>(`/cbt/banks/${bankId}`, {
      method: 'DELETE',
    }),

  downloadTemplate: async (category: 'akademik' | 'psikologi') => {
    const blob = await apiFetchBlob(`/cbt/banks/template/${category}`)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Template_Bank_Soal_${category === 'akademik' ? 'Akademik' : 'Psikologi'}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },

  // ── Admin: Jadwal Ujian & Pemantauan ───────────────────────────
  getSchedules: (category: 'akademik' | 'psikologi', waveId?: string) => {
    const q = new URLSearchParams({ category })
    if (waveId) q.append('wave_id', waveId)
    return apiFetch<ScheduleItem[]>(`/cbt/schedules?${q.toString()}`)
  },

  getScheduleDetail: (scheduleId: string) =>
    apiFetch<ScheduleItem>(`/cbt/schedules/${scheduleId}`),

  createSchedule: (payload: any) =>
    apiFetch<ScheduleItem>('/cbt/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSchedule: (scheduleId: string, payload: any) =>
    apiFetch<ScheduleItem>(`/cbt/schedules/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSchedule: (scheduleId: string) =>
    apiFetch<{ message: string }>(`/cbt/schedules/${scheduleId}`, {
      method: 'DELETE',
    }),

  getMonitoring: (scheduleId: string) =>
    apiFetch<MonitoringResponse>(`/cbt/schedules/${scheduleId}/monitoring`),

  unfreezeCandidate: (scheduleId: string, applicantId: string) =>
    apiFetch<{ success: boolean; message: string; status: string }>(
      `/cbt/schedules/${scheduleId}/unfreeze/${applicantId}`,
      { method: 'POST' }
    ),

  moveCandidateSchedule: (
    scheduleId: string,
    applicantId: string,
    payload: { target_schedule_id: string; reason?: string }
  ) =>
    apiFetch<{ message: string; target_schedule_id: string; target_schedule_name: string }>(
      `/cbt/schedules/${scheduleId}/move-candidate/${applicantId}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  // ── Applicant: CBT Engine ──────────────────────────────────────
  verifyAccess: (scheduleId: string, password: string, access_token: string) =>
    apiFetch<any>(`/cbt/verify-access/${scheduleId}`, {
      method: 'POST',
      body: JSON.stringify({ password, access_token }),
    }),

  getExamSheet: (scheduleId: string) =>
    apiFetch<ExamSheet>(`/cbt/exam-sheet/${scheduleId}`),

  saveAnswer: (
    scheduleId: string,
    question_id: string,
    selected_option_id: string,
    option_key: string
  ) =>
    apiFetch<{ saved: boolean; question_id: string; option_key: string; answers_count: number }>(
      `/cbt/save-answer/${scheduleId}`,
      {
        method: 'POST',
        body: JSON.stringify({ question_id, selected_option_id, option_key }),
      }
    ),

  reportViolation: (scheduleId: string, reason = 'tab_switch_or_blur') =>
    apiFetch<{ locked: boolean; status: string; violations_count: number; message: string }>(
      `/cbt/violation/${scheduleId}`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    ),

  syncTimer: (scheduleId: string, remaining_seconds: number) =>
    apiFetch<{ status: string }>(
      `/cbt/timer/${scheduleId}?remaining_seconds=${remaining_seconds}`,
      { method: 'POST' }
    ),

  finishExam: (scheduleId: string) =>
    apiFetch<{ status: string; score: number; answers_count: number; total_questions: number; finished_at: string }>(
      `/cbt/finish/${scheduleId}`,
      { method: 'POST' }
    ),

  getAttemptStatus: (scheduleId: string) =>
    apiFetch<{
      status: 'not_started' | 'in_progress' | 'locked' | 'completed'
      remaining_seconds: number
      violations_count: number
      answers_count: number
      total_questions: number
      score: number | null
    }>(`/cbt/status/${scheduleId}`),
}
