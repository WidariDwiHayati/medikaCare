# ==========================================
# 1. IMPORT LIBRARY & MODUL
# ==========================================
# Mengimpor FastAPI untuk membuat web server/API, dan Depends untuk Dependency Injection (seperti koneksi database)
from fastapi import FastAPI, Depends
# Mengimpor Session dari SQLAlchemy untuk mengelola transaksi dengan database ORM
from sqlalchemy.orm import Session
# Mengimpor BaseModel dari Pydantic untuk membuat skema validasi data (struktur JSON)
from pydantic import BaseModel
# Mengimpor modul datetime untuk menangani tipe data tanggal dan waktu
import datetime
# Mengimpor middleware CORS agar API bisa diakses dari domain/port yang berbeda (seperti aplikasi frontend terpisah)
from fastapi.middleware.cors import CORSMiddleware
# Mengimpor modul json untuk membaca/menulis file berformat JSON
import json
# Mengimpor modul os untuk berinteraksi dengan sistem operasi (misal mengecek keberadaan file)
import os

# Mengimpor pengaturan database dan model tabel dari folder 'backend' (diasumsikan sudah dibuat)
from backend import database
# Mengimpor modul AI buatan sendiri dari folder 'backend' untuk logika prediksi
from backend import ai_model


# ==========================================
# 2. INISIALISASI APLIKASI FASTAPI
# ==========================================
# Membuat instance atau objek utama aplikasi FastAPI dengan judul dokumentasi "Backend MedikaCare"
app = FastAPI(title="Backend MedikaCare")

# Menambahkan middleware CORS ke dalam aplikasi
app.add_middleware(
    CORSMiddleware,
    # Mengizinkan semua origin (domain/port) mengakses API ini (Catatan: gunakan list domain spesifik untuk produksi)
    allow_origins=["*"], 
    # Mengizinkan pengiriman kredensial seperti cookies atau header otentikasi
    allow_credentials=True,
    # Mengizinkan semua metode HTTP (GET, POST, PUT, DELETE, OPTIONS, dll)
    allow_methods=["*"], 
    # Mengizinkan semua jenis HTTP header dalam request
    allow_headers=["*"],
)


# ==========================================
# 3. SCHEMA & ENDPOINT AUTENTIKASI (LOGIN)
# ==========================================

# Membuat skema Pydantic untuk memvalidasi struktur data JSON yang diterima saat user login
class LoginInput(BaseModel):
    username: str # Username bertipe string wajib diisi
    password: str # Password bertipe string wajib diisi

# Mendefinisikan endpoint HTTP POST pada rute "/api/login"
@app.post("/api/login")
def verifikasi_login(data: LoginInput, db: Session = Depends(database.get_db)):
    # Mencari data user pertama di tabel User yang kolom usernamenya sama dengan input
    user = db.query(database.User).filter(database.User.username == data.username).first()
    
    # Memeriksa apakah user tidak ditemukan ATAU password (hash) di database tidak cocok dengan input
    if not user or user.password_hash != data.password:
        # Kembalikan respon gagal jika validasi tidak lolos
        return {"sukses": False, "pesan": "Kata sandi salah atau akun tidak ditemukan."}
        
    # Jika lolos validasi, kembalikan respon sukses beserta detail profil user (untuk disimpan di frontend)
    return {
        "sukses": True, 
        "data": {
            "id": user.id,
            "nama_lengkap": user.nama_lengkap,
            "role": user.role # Role digunakan frontend untuk menentukan menu (manajer/staf)
        }
    }


# ==========================================
# 4. SCHEMA VALIDASI INPUT KUNJUNGAN
# ==========================================
# Skema ini digunakan untuk memastikan data JSON yang dikirim Frontend saat input kunjungan sudah lengkap dan formatnya benar
class KunjunganInput(BaseModel):
    user_id: int                    # ID staf/petugas yang menginput data
    tanggal_kunjungan: datetime.date # Tanggal dengan format kalender (YYYY-MM-DD)
    kode_icd: str                   # Kode klasifikasi penyakit (ICD-10)
    nama_penyakit: str              # Nama/Diagnosis penyakit
    nama_pasien: str                # Nama lengkap pasien
    jenis_kelamin: str              # Laki-laki / Perempuan
    umur: int                       # Usia pasien dalam angka
    kecamatan: str                  # Wilayah kecamatan
    kabupaten_kota: str             # Wilayah kabupaten/kota


# ==========================================
# 5. ENDPOINT UTAMA (API ROUTES)
# ==========================================

# Endpoint GET dasar (root) untuk mengecek apakah server Uvicorn/FastAPI berjalan dengan baik (Health Check)
@app.get("/")
def cek_server():
    return {"status": "Server berjalan dengan baik!", "sistem": "MedikaCare API"}

# Endpoint POST untuk membuat/menyimpan data kunjungan baru ke dalam database
@app.post("/api/kunjungan", status_code=201) # status_code 201 menandakan "Created" (Data berhasil dibuat)
def simpan_data_kunjungan(data: KunjunganInput, db: Session = Depends(database.get_db)):
    # Membuat objek baris data baru menggunakan model SQLAlchemy 'KunjunganPasien'
    db_kunjungan = database.KunjunganPasien(
        user_id=data.user_id,
        tanggal_kunjungan=data.tanggal_kunjungan,
        kode_icd=data.kode_icd,
        nama_penyakit=data.nama_penyakit,
        nama_pasien=data.nama_pasien,  
        jenis_kelamin=data.jenis_kelamin,
        umur=data.umur,                
        kecamatan=data.kecamatan,
        kabupaten_kota=data.kabupaten_kota
    )
    # Menambahkan antrean objek data baru ke dalam sesi database
    db.add(db_kunjungan)
    # Menyimpan permanen perubahan ke dalam database fisik (SQLite)
    db.commit()
    # Menyegarkan objek untuk mendapatkan data terbaru hasil auto-generate (seperti ID dari database)
    db.refresh(db_kunjungan)
    
    # Mengembalikan pesan konfirmasi dan ID data yang baru saja dibuat
    return {"pesan": "Data kunjungan berhasil disimpan!", "id_baru": db_kunjungan.id}

# Endpoint GET untuk mengambil seluruh daftar riwayat kunjungan pasien
@app.get("/api/riwayat")
def lihat_riwayat(db: Session = Depends(database.get_db)):
    # Mengambil data dari tabel KunjunganPasien, diurutkan menurun (desc) berdasarkan tanggal, dan dibatasi 100 baris terbaru
    riwayat = db.query(database.KunjunganPasien).order_by(database.KunjunganPasien.tanggal_kunjungan.desc()).limit(100).all()
    # Mengembalikan list objek riwayat (FastAPI otomatis mengubahnya menjadi array JSON)
    return riwayat


# ==========================================
# 6. ENDPOINT DATA REFERENSI (JSON)
# ==========================================

# Endpoint GET untuk mengambil kamus data ICD-10
@app.get("/api/icd")
def get_daftar_icd():
    # Menentukan path (lokasi) file JSON statis
    lokasi_file = "data/icd_extracted.json"
    # Memeriksa apakah file tersebut benar-benar ada di dalam direktori
    if os.path.exists(lokasi_file):
        # Membuka file dalam mode read ("r") dengan format encoding standar utf-8
        with open(lokasi_file, "r", encoding="utf-8") as f:
            # Mem-parsing dan mengembalikan isi file sebagai JSON
            return json.load(f)
    # Jika file tidak ada, kembalikan array kosong
    return []

# Endpoint GET untuk mengambil struktur data wilayah Provinsi Jawa Tengah
@app.get("/api/wilayah")
def get_wilayah():
    lokasi_file = "data/jateng.json"
    if os.path.exists(lokasi_file):
        with open(lokasi_file, "r", encoding="utf-8") as f:
            return json.load(f)
    # Jika file tidak ada, kembalikan objek/dictionary kosong
    return {}


# ==========================================
# 7. ENDPOINT PREDIKSI AI (MACHINE LEARNING)
# ==========================================

# Endpoint GET untuk melakukan kalkulasi prediksi penyakit berbasis AI
@app.get("/api/prediksi")
def get_prediksi_penyakit(kode_icd: str, nama_penyakit: str, periode_target: str, db: Session = Depends(database.get_db)):
    try:
        # Memanggil fungsi eksternal dari modul ai_model yang telah kita buat sebelumnya
        # Mengirimkan session database dan parameter pencarian
        hasil_ai = ai_model.jalankan_prediksi(
            db=db, 
            kode_icd_target=kode_icd, 
            nama_penyakit_target=nama_penyakit,
            periode_target=periode_target
        )
        
        # Menyusun respon JSON terstruktur dari output kamus (dictionary) model AI
        return {
            "kode_icd": kode_icd,
            "nama_penyakit": nama_penyakit,
            "periode_target": periode_target,
            "estimasi_kasus_baru": hasil_ai["estimasi"], # Hasil prediksi angka regresi
            "data_wilayah": hasil_ai["wilayah"],         # Distribusi probabilitas wilayah rentan
            "data_umur": hasil_ai["umur"],               # Distribusi probabilitas kelompok umur rentan
            "status": "Sukses kalkulasi AI"
        }
    except Exception as e:
        # Menangkap error eksekusi AI dan mengembalikannya sebagai JSON agar tidak membuat server down
        return {"error": str(e)}


# ==========================================
# 8. ENDPOINT MANAJEMEN DATA (UBAH & HAPUS)
# ==========================================

# Endpoint DELETE untuk menghapus satu baris data kunjungan berdasarkan ID
@app.delete("/api/kunjungan/{id}")
def hapus_kunjungan(id: int, db: Session = Depends(database.get_db)):
    # Mencari data kunjungan yang memiliki ID sesuai parameter URL
    data = db.query(database.KunjunganPasien).filter(database.KunjunganPasien.id == id).first()
    # Jika tidak ditemukan, kembalikan pesan error
    if not data:
        return {"error": "Data tidak ditemukan"}
    
    # Jika ditemukan, hapus data dari session database
    db.delete(data)
    # Simpan perubahan/eksekusi penghapusan permanen ke database
    db.commit()
    return {"pesan": "Data berhasil dihapus"}


# Endpoint PUT untuk memperbarui (edit) seluruh kolom pada data kunjungan tertentu berdasarkan ID
@app.put("/api/kunjungan/{id}")
def update_kunjungan(id: int, data: KunjunganInput, db: Session = Depends(database.get_db)):
    # 1. Mencari data target di database berdasarkan parameter ID di URL
    kunjungan_db = db.query(database.KunjunganPasien).filter(database.KunjunganPasien.id == id).first()
    
    # Jika id tidak ditemukan di tabel, tolak operasi
    if not kunjungan_db:
        return {"error": "Data tidak ditemukan"}
    
    # 2. Menimpa (override) nilai pada baris lama dengan data JSON baru yang lolos validasi (data)
    kunjungan_db.tanggal_kunjungan = data.tanggal_kunjungan
    kunjungan_db.kode_icd = data.kode_icd
    kunjungan_db.nama_penyakit = data.nama_penyakit
    kunjungan_db.nama_pasien = data.nama_pasien
    kunjungan_db.jenis_kelamin = data.jenis_kelamin
    kunjungan_db.umur = data.umur
    kunjungan_db.kecamatan = data.kecamatan
    kunjungan_db.kabupaten_kota = data.kabupaten_kota
    
    # 3. Menyimpan permanen segala perubahan nilai-nilai properti tersebut ke dalam database (UPDATE table)
    db.commit()
    
    return {"pesan": "Data kunjungan berhasil diperbarui!"}