# BatikLens - Monolithic Architecture (React + Flask + MySQL)

Proyek ini telah direvamp menjadi arsitektur "Monolitik", di mana Anda bisa mendeploy seluruh aplikasi front-end (React) dan back-end (Flask) dari satu tempat yang sama, memanfaatkan **MySQL** sebagai database aslinya.

## Syarat Sistem
Pastikan Anda sudah menginstal:
1. **Node.js** (untuk mem-build React)
2. **Python 3.9+** (untuk menjalankan Flask)
3. **MySQL Server** (XAMPP / MySQL Workbench / native)

---

## Langkah Menjalankan di Laptop Anda (Lokal / Prod)

### 1. Build Frontend (React)
Pertama, kita harus mengompilasi kode React (`/src`) menjadi file statis (`HTML/CSS/JS`) agar dapat dibaca (di-serve) langsung oleh Flask.
Buka terminal di root (folder utama proyek ini):
```bash
npm install
npm run build
```
*(Perintah ini akan membuat folder baru bernama `dist` di root proyek).*

### 2. Siapkan Database MySQL
1. Buka MySQL Anda (misalnya lewat XAMPP phpMyAdmin).
2. Buat sebuah database baru bernama `batiklens`.

### 3. Jalankan Backend (Flask)
Di terminal, pindah ke folder `backend` atau tetap di root. Kita akan setup virtual environment Python dan menginstal requirements:
```bash
# Jika Anda di root, masuk ke folder backend dulu
cd backend

# (Opsional) Buat virtual environment
python -m venv venv
# Aktifkan di windows:
venv\Scripts\activate
# Aktifkan di Mac/Linux:
source venv/bin/activate

# Install dependency backend
pip install -r requirements.txt
```

### 4. Konfigurasi Koneksi MySQL
Buka file `backend/app.py`, lihat pada baris 16:
```python
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql+pymysql://root:@localhost/batiklens')
```
Pastikan username `root`, password ` ` (kosong), port `localhost`, dan nama database `batiklens` sesuai dengan MySQL lokal Anda.

### 5. Start Monolithic Server
Karena kita menggunakan `Flask-SQLAlchemy`, skema tabel-tabel MySQL akan otomatis dibentuk saat Anda menjalankan aplikasi pertama kali!
```bash
python app.py
```
Aplikasi Anda sekarang aktif di: **http://localhost:5000** 🎉

> **Info Penting**: 
> - Tidak perlu lagi menjalankan Node server (`npm run dev`) saat di prod.
> - Cukup 1 server (Flask) yang berjalan di `localhost:5000`. Flask secara otomatis akan menampilkan UI dari `dist` dan menangani `/api/*`.
> - Tabel otomatis terbuat di MySQL dan akun admin default (`admin` / `admin123`) sudah disiapkan secara sistem.
# Koriel_Lens
