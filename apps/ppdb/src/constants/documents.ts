export interface DocumentSpec {
  name: string
  description: string
  required: boolean
  category: 'wajib'
}

// Daftar dokumen seragam & wajib untuk seluruh pendaftar:
// Berkas wajib dasar (NISN, KK, Akta Kelahiran, Pas Foto)
// ditambah KTP Orang Tua/Wali dan 4 Rapor Terakhir.
export const BASE_DOCUMENTS: DocumentSpec[] = [
  { name: 'NISN', description: 'Kartu atau bukti cetak NISN resmi.', required: true, category: 'wajib' },
  { name: 'Kartu Keluarga (KK)', description: 'Bukti susunan keluarga dan NIK.', required: true, category: 'wajib' },
  { name: 'Akta Kelahiran', description: 'Bukti kelahiran calon santri/siswa.', required: true, category: 'wajib' },
  { name: 'Pas Foto', description: 'Pas foto terbaru calon siswa (3x4 atau 4x6).', required: true, category: 'wajib' },
  { name: 'KTP Orang Tua/Wali', description: 'KTP orang tua atau wali calon santri.', required: true, category: 'wajib' },
  { name: 'Rapor Semester 1', description: 'Scan/foto rapor semester ke-1 dari 4 semester terakhir.', required: true, category: 'wajib' },
  { name: 'Rapor Semester 2', description: 'Scan/foto rapor semester ke-2 dari 4 semester terakhir.', required: true, category: 'wajib' },
  { name: 'Rapor Semester 3', description: 'Scan/foto rapor semester ke-3 dari 4 semester terakhir.', required: true, category: 'wajib' },
  { name: 'Rapor Semester 4', description: 'Scan/foto rapor semester ke-4 dari 4 semester terakhir.', required: true, category: 'wajib' }
]

export function getDocumentSpecs(): DocumentSpec[] {
  return BASE_DOCUMENTS
}

export const REQUIRED_DOCUMENTS = BASE_DOCUMENTS
