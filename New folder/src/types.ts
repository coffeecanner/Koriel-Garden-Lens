export interface User {
  id_staff?: number;
  id_admin?: number;
  username: string;
  name: string;
  role: "ADMIN" | "STAFF";
  no_telp_staff?: string;
}

export interface AdminModel {
  id_admin: number;
  username: string;
  password?: string;
  nama_admin: string;
}

export interface StaffModel {
  id_staff: number;
  username: string;
  password?: string;
  nama_staff: string;
  no_telp_staff: string;
  id_admin: number;
}

export interface KonsumenModel {
  id_konsumen: number;
  tanggal: string;
  nama_konsumen: string;
  no_telp_konsumen: string;
  id_staff: number;
}

export interface GambarBungaTropisModel {
  id_gambar: number;
  file_gambar_bunga_tropis: string; // Base64 or Unsplash URL
  tanggal_foto: string;
  id_staff: number;
}

export interface HasilSinkronisasiModel {
  id_sinkronisasi: number;
  nama_spesies: string;
  karakteristik_perawatan: string;
  tanggal_sinkronisasi: string;
  galeri_gambar?: string[];
}

export interface HasilIdentifikasiModel {
  id_hasil: number;
  label_kelas: string;
  tanggal_identifikasi: string;
  deskripsi_karakteristik: string;
  hasil_akurasi: number;
  id_gambar: number;
  id_sinkronisasi: number | null;
}

export interface LaporanModel {
  id_laporan: number;
  tanggal_laporan: string;
  file_dokumen: string;
  id_admin?: number | null;
  id_staff?: number | null;
  id_sinkronisasi: number;
}
