import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import { ErrorState } from '@repo/ui'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import ApplicantLayout from './layouts/ApplicantLayout'
import LoginPage from './pages/auth/LoginPage'
import NotFoundPage from './pages/errors/NotFoundPage'
import ForbiddenPage from './pages/errors/ForbiddenPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import PeriodsPage from './pages/admin/ppdb/PeriodsPage'
import LandingPage from './pages/public/LandingPage'
import GlobeDemoPage from './pages/public/GlobeDemoPage'
import RegisterPage from './pages/public/RegisterPage'
import PublicReceiptPage from './pages/public/PublicReceiptPage'
import ApplicantReceiptPage from './pages/applicant/ReceiptPage'
import ApplicantDocumentsPage from './pages/applicant/DocumentsPage'
import TesSeleksiPage from './pages/applicant/TesSeleksiPage'
import WawancaraPage from './pages/applicant/WawancaraPage'
import ResultStagePage from './pages/applicant/ResultStagePage'
import ApplicantProfilePage from './pages/applicant/ProfilePage'
import CheckoutPage from './pages/applicant/CheckoutPage'
import ApplicantDashboardPage from './pages/applicant/DashboardPage'
import ExamCardPage from './pages/applicant/ExamCardPage'
import NotificationsPage from './pages/admin/notifications/NotificationsPage'
import DataPendaftarPage from './pages/admin/ppdb/DataPendaftarPage'
import AdminProfilePage from './pages/admin/ProfilePage'
import SelectionPage from './pages/admin/ppdb/SelectionPage'
import LoaPage from './pages/admin/ppdb/LoaPage'
import ArsipPendaftarPage from './pages/admin/ppdb/ArsipPendaftarPage'
import VerifikasiDokumenPage from './pages/admin/ppdb/VerifikasiDokumenPage'
import VerifikasiDokumenDetailPage from './pages/admin/ppdb/VerifikasiDokumenDetailPage'
import PembayaranFormulirPage from './pages/admin/ppdb/PembayaranFormulirPage'
import AdminReceiptPage from './pages/admin/ppdb/AdminReceiptPage'
import PenilaianPage from './pages/admin/ppdb/PenilaianPage'
import ReviewLoaPage from './pages/admin/ppdb/ReviewLoaPage'
import PublicLoaPage from './pages/public/PublicLoaPage'
import JadwalTahfidzPage from './pages/admin/ppdb/JadwalTahfidzPage'
import TahfidzSessionDetailPage from './pages/admin/ppdb/TahfidzSessionDetailPage'
import JadwalWawancaraPage from './pages/admin/ppdb/JadwalWawancaraPage'
import WawancaraSessionDetailPage from './pages/admin/ppdb/WawancaraSessionDetailPage'
import SessionEvaluationPage from './pages/admin/ppdb/SessionEvaluationPage'
import BankSoalPage from './pages/admin/cbt/BankSoalPage'
import BankSoalDetailPage from './pages/admin/cbt/BankSoalDetailPage'
import JadwalUjianPage from './pages/admin/cbt/JadwalUjianPage'
import PemantauanUjianPage from './pages/admin/cbt/PemantauanUjianPage'
import CbtExamPage from './pages/cbt/CbtExamPage'
import * as api from './api/client'

export default function App() {
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    const loadFavicon = () => {
      fetch(`${api.API_BASE}/companyprofile/settings/favicon`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.value && link) { link.href = data.value; link.type = '' } })
        .catch(() => { /* silently ignore if favicon is unavailable */ })
    }
    loadFavicon()
    const es = new EventSource(`${api.API_BASE}/companyprofile/events`)
    es.addEventListener('change', loadFavicon)
    es.onerror = () => {
      // EventSource browser otomatis reconnect jika server restart / network drop
    }
    return () => es.close()
  }, [])

  return (
    <BrowserRouter>
      <ErrorBoundary
        fallbackRender={({ resetErrorBoundary }) => (
          <ErrorState status={500} retry={resetErrorBoundary} fullscreen={false} />
        )}
      >
        <AuthProvider>
          <ToastProvider>
            <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/globe" element={<GlobeDemoPage />} />
            <Route path="/auth/login" element={<LoginPage />} />

            {/* Alias: /applicant/login -> /auth/login untuk user yang salah ketik URL */}
            <Route path="/applicant/login" element={<Navigate to="/auth/login" replace />} />

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout><Outlet /></AdminLayout></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="data-pendaftar" element={<DataPendaftarPage />} />
              <Route path="verifikasi-dokumen" element={<VerifikasiDokumenPage />} />
              <Route path="verifikasi-dokumen/:id" element={<VerifikasiDokumenDetailPage />} />
              <Route path="pembayaran-formulir" element={<PembayaranFormulirPage />} />
              <Route path="kuitansi/:id" element={<AdminReceiptPage />} />
              <Route path="sessions" element={<Navigate to="/admin/jadwal-seleksi/tahfidz" replace />} />
              <Route path="sessions/tahfidz" element={<Navigate to="/admin/jadwal-seleksi/tahfidz" replace />} />
              <Route path="sessions/wawancara" element={<Navigate to="/admin/jadwal-seleksi/wawancara" replace />} />
              <Route path="sessions/:sessionType/evaluasi/:sessionId" element={<SessionEvaluationPage />} />
              <Route path="penilaian" element={<PenilaianPage />} />
              <Route path="review-loa" element={<ReviewLoaPage />} />
              <Route path="arsip" element={<ArsipPendaftarPage />} />
              <Route path="periods" element={<PeriodsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="selection" element={<SelectionPage />} />
              <Route path="rubrik" element={<SelectionPage />} />
              <Route path="bank-soal/akademik" element={<BankSoalPage category="akademik" title="Bank Soal Akademik" />} />
              <Route path="bank-soal/psikologi" element={<BankSoalPage category="psikologi" title="Bank Soal Psikologi" />} />
              <Route path="bank-soal/detail/:bankId" element={<BankSoalDetailPage />} />
              <Route path="jadwal-seleksi/akademik" element={<JadwalUjianPage category="akademik" title="Seleksi Akademik (CBT)" />} />
              <Route path="jadwal-seleksi/psikologi" element={<JadwalUjianPage category="psikologi" title="Seleksi Psikologi (CBT)" />} />
              <Route path="jadwal-seleksi/tahfidz" element={<JadwalTahfidzPage />} />
              <Route path="jadwal-seleksi/tahfidz/:sessionId" element={<TahfidzSessionDetailPage />} />
              <Route path="jadwal-seleksi/wawancara" element={<JadwalWawancaraPage />} />
              <Route path="jadwal-seleksi/wawancara/:sessionId" element={<WawancaraSessionDetailPage />} />
              <Route path="jadwal-wawancara" element={<Navigate to="/admin/jadwal-seleksi/wawancara" replace />} />
              <Route path="jadwal-wawancara/*" element={<Navigate to="/admin/jadwal-seleksi/wawancara" replace />} />
              <Route path="sessions/wawancara" element={<Navigate to="/admin/jadwal-seleksi/wawancara" replace />} />
              <Route path="jadwal-ujian/akademik" element={<Navigate to="/admin/jadwal-seleksi/akademik" replace />} />
              <Route path="jadwal-ujian/psikologi" element={<Navigate to="/admin/jadwal-seleksi/psikologi" replace />} />
              <Route path="monitoring/:category/:scheduleId" element={<PemantauanUjianPage />} />
              <Route path="pengumuman" element={<LoaPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>

            <Route path="/checkout" element={<ProtectedRoute role="applicant"><CheckoutPage /></ProtectedRoute>} />
            <Route path="/exam/:scheduleId" element={<ProtectedRoute role="applicant"><CbtExamPage /></ProtectedRoute>} />

            {/* Public Kuitansi & LoA Resmi via Direct / QR Link */}
            <Route path="/kuitansi/:id" element={<PublicReceiptPage />} />
            <Route path="/receipt/:id" element={<PublicReceiptPage />} />
            <Route path="/loa/:registrationNo" element={<PublicLoaPage />} />

            {/* Applicant portal: alur pendaftaran berurutan hingga penandatanganan LoA */}
            <Route path="/applicant" element={<ProtectedRoute role="applicant" requirePaid={true}><ApplicantLayout><Outlet /></ApplicantLayout></ProtectedRoute>}>
              <Route index element={<ApplicantDashboardPage />} />
              <Route path="kuitansi" element={<ApplicantReceiptPage />} />
              <Route path="dokumen" element={<ApplicantDocumentsPage />} />
              <Route path="tes-seleksi" element={<TesSeleksiPage />} />
              <Route path="wawancara" element={<WawancaraPage />} />
              <Route path="seleksi-tahfidz" element={<Navigate to="/applicant/tes-seleksi" replace />} />
              <Route path="seleksi-wawancara" element={<Navigate to="/applicant/wawancara" replace />} />
              <Route path="pengumuman" element={<ResultStagePage />} />
              <Route path="profile" element={<ApplicantProfilePage />} />
            </Route>
            <Route path="/applicant/kartu-ujian" element={<ProtectedRoute role="applicant" requirePaid={true}><ExamCardPage /></ProtectedRoute>} />

            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
