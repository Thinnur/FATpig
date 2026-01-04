// src/types/database.ts

export interface UserProfile {
  id: string; // UUID sekarang string, bukan number
  email: string;
  nama: string;
  tema: "ungu" | "hijau" | "biru" | "pink" | "orange";
  dark_mode: boolean;
  avatar: string;
  akumulasi_sisa: boolean; // Fitur akumulasi sisa amplop
  bahasa_suara: string; // Voice recognition language (e.g., 'id-ID', 'en-US')
}

export interface Rekening {
  id: number;
  user_id: string; // UUID
  nama: string;
  tipe: "cash" | "bank" | "ewallet";
  saldo: number;
  is_deleted: boolean; // Soft delete flag
  deleted_at: string | null; // Soft delete timestamp
}

export interface PosAnggaran {
  id: number;
  user_id: string; // UUID
  kategori: string;
  jumlah: number;
  // 'terpakai' tidak disimpan di DB, tapi dihitung di frontend
  terpakai?: number;
  batas_nominal: number;
  tipe_batas: "Tidak Ada" | "Harian" | "Mingguan" | "Weekday" | "Weekend";
  is_sisa_amplop: boolean;
  limit_set_date: string | null;
}

export interface Transaksi {
  id: number;
  user_id: string; // UUID
  keterangan: string;
  nominal: number;
  kategori: string;
  rekening_id: number | null;
  tipe: "pengeluaran" | "pemasukan";
  created_at: string;
}
