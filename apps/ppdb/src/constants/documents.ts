export interface DocumentSpec {
  name: string
  description: string
  required: boolean
  category: 'wajib'
}

// Daftar dokumen seragam & wajib untuk seluruh pendaftar:
export const BASE_DOCUMENTS: DocumentSpec[] = [
  { name: 'NISN', description: 'Kartu atau bukti cetak NISN resmi.', required: true, category: 'wajib' },
  { name: 'Kartu Keluarga (KK)', description: 'Bukti susunan keluarga dan NIK.', required: true, category: 'wajib' },
  { name: 'Akta Kelahiran', description: 'Bukti kelahiran calon santri/siswa.', required: true, category: 'wajib' },
  { name: 'Pas Foto', description: 'Pas foto terbaru calon siswa (3x4 atau 4x6).', required: true, category: 'wajib' },
  { name: 'KTP Orang Tua/Wali', description: 'KTP orang tua atau wali calon santri.', required: true, category: 'wajib' },
  { name: 'Rapor Terakhir', description: 'Scan/foto rapor terakhir (semester terakhir) dari sekolah asal.', required: true, category: 'wajib' },
  { name: 'Surat Keterangan Sehat', description: 'Surat keterangan sehat dari dokter/puskesmas.', required: true, category: 'wajib' },
  { name: 'Surat Berkelakuan Baik', description: 'Surat keterangan berkelakuan baik dari sekolah asal.', required: true, category: 'wajib' },
  { name: 'Sertifikat Penghargaan (jika ada)', description: 'Sertifikat prestasi/penghargaan (opsional).', required: false, category: 'wajib' }
]

export function getDocumentSpecs(): DocumentSpec[] {
  return BASE_DOCUMENTS
}

export const REQUIRED_DOCUMENTS = BASE_DOCUMENTS
