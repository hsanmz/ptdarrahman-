/**
 * Data staff dan guru Pesantren Tahfidz Qur'an dan Digital Ar-Rahman
 * Diperbaiki: penulisan rapi, nomor urut konsisten, dan grouping berdasarkan level
 */

// Nomor urut menunjukkan level/jenjang kepengurusan/kegurusan
// Level 1: Kepala utama
// Level 2: Kepala operasional
// Level 3: Guru/Staff teknis dan pendukung

export type StaffPosition = 
  | "Mudir"
  | "Administrator" 
  | "Kepala Kepegawaian"
  | "Guru IT"
  | "Musrif & Pegajar BA"

export interface StaffRecord {
  id: number
  position: StaffPosition
  name: string
  // Format nama: Ustadz [Nama Lengkap] (dengan prefix Ustadz wajib ada)
}

// Data staff lengkap yang sudah dibersihkan dan di-standarisasi
export const staffRegistry: StaffRecord[] = [
  {
    id: 1,
    position: "Mudir",
    name: "Ustadz Ziyad Khairy",
  },
  {
    id: 2,
    position: "Administrator",
    name: "Ustadz Mahrozal Mizan",
  },
  {
    id: 2,
    position: "Kepala Kepegawaian",
    name: "Ustadz Murtadho Tumari",
  },
  {
    id: 3,
    position: "Guru IT",
    name: "Ustadz Ian",
  },
  {
    id: 3,
    position: "Musrif & Pegajar Bahasa Arab",
    name: "Ustadz Nur Fatoni",
  },
]

// Fungsi bantuan: dapatkan nama staff berdasarkan posisi
export function getStaffByPosition(position: StaffPosition): StaffRecord | undefined {
  return staffRegistry.find((s) => s.position === position)
}

// Fungsi bantuan: dapatkan semua staff dalam level tertentu
export function getStaffByLevel(level: number): StaffRecord[] {
  return staffRegistry.filter((s) => s.id === level)
}

// Fungsi bantuan: format nama untuk display
export function formatStaffName(staff: StaffRecord): string {
  return `${staff.position}: ${staff.name}`
}