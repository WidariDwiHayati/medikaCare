# ==========================================
# 1. IMPORT LIBRARY ORM & UTILITIES
# ==========================================
# Mengimpor komponen inti SQLAlchemy untuk membuat koneksi dan mendefinisikan tipe data kolom
from sqlalchemy import create_engine, Column, Integer, String, Date, DateTime, ForeignKey
# Mengimpor komponen ORM SQLAlchemy untuk pemetaan objek dan relasi antar tabel
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
# Mengimpor modul datetime untuk pencatatan waktu otomatis (timestamp)
import datetime


# ==========================================
# 2. KONFIGURASI DATABASE SQLITE
# ==========================================
# Menentukan lokasi penyimpanan file database SQLite (berada di dalam folder 'data')
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://neondb_owner:npg_N30OAaPqrsdw@ep-summer-waterfall-a1yl626f-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Menginisialisasi 'engine' sebagai jembatan komunikasi antara aplikasi backend dan file SQLite
engine = create_engine(
    # connect_args khusus SQLite agar bisa diakses oleh banyak thread (dibutuhkan oleh FastAPI)
    SQLALCHEMY_DATABASE_URL
)

# Membuat pabrik sesi (session factory) untuk mengatur transaksi ke database
# autocommit=False agar perubahan tidak langsung tersimpan sebelum di-commit secara manual
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Membuat class dasar (Base) yang akan diwarisi oleh semua class model tabel di bawahnya
Base = declarative_base()


# ==========================================
# 3. DEFINISI MODEL TABEL (SCHEMA)
# ==========================================

# --- 3.1. Tabel USERS (Pengguna/Staf) ---
class User(Base):
    # Menentukan nama tabel fisik di dalam database
    __tablename__ = "USERS"
    
    # Kolom ID sebagai Primary Key, bertipe Integer, dan diindeks untuk pencarian cepat
    id = Column(Integer, primary_key=True, index=True)
    # Kolom untuk menyimpan nama lengkap pengguna
    nama_lengkap = Column(String)
    # Kolom username (harus unik/tidak boleh sama antar user)
    username = Column(String, unique=True, index=True)
    # Kolom untuk menyimpan kata sandi (disarankan dalam bentuk hash untuk keamanan)
    password_hash = Column(String)
    # Kolom role untuk manajemen hak akses (contoh: 'staf' atau 'manajer')
    role = Column(String) 
    # Kolom waktu pembuatan akun, terisi otomatis dengan waktu UTC saat ini
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Mendefinisikan relasi "One-to-Many" dengan tabel KunjunganPasien
    # back_populates menghubungkan properti ini dengan properti 'pencatat' di tabel KunjunganPasien
    kunjungan = relationship("KunjunganPasien", back_populates="pencatat")


# --- 3.2. Tabel KUNJUNGAN_PASIEN (Rekam Medis) ---
class KunjunganPasien(Base):
    __tablename__ = "KUNJUNGAN_PASIEN"
    
    # Kolom ID unik untuk setiap catatan kunjungan
    id = Column(Integer, primary_key=True, index=True)
    # Kolom Foreign Key yang merujuk ke ID di tabel USERS (menandakan siapa staf yang menginput)
    user_id = Column(Integer, ForeignKey("USERS.id"))
    # Kolom tanggal kunjungan berobat pasien bertipe Date (tanpa informasi jam)
    tanggal_kunjungan = Column(Date)
    
    # Kolom khusus untuk menyimpan kode standar klasifikasi penyakit ICD-10 (contoh: 'R10.0')
    kode_icd = Column(String)       
    # Kolom untuk menyimpan nama/deskripsi penyakit (contoh: 'Acute abdomen')
    nama_penyakit = Column(String)  
    
    # Kolom identitas dan demografi pasien
    nama_pasien = Column(String)    
    jenis_kelamin = Column(String)
    umur = Column(Integer)        
    
    # Kolom data kewilayahan pasien
    kecamatan = Column(String)
    kabupaten_kota = Column(String)
    
    # Kolom waktu pencatatan data ke dalam sistem, terisi otomatis
    input_pada = Column(DateTime, default=datetime.datetime.utcnow)

    # Relasi balik "Many-to-One" ke tabel User (mengambil profil User yang sesuai dengan user_id)
    pencatat = relationship("User", back_populates="kunjungan")


# --- 3.3. Tabel HASIL_PREDIKSI (Log AI) ---
class HasilPrediksi(Base):
    __tablename__ = "HASIL_PREDIKSI"
    
    # Kolom ID hasil perhitungan prediksi
    id = Column(Integer, primary_key=True, index=True)
    
    # Menyimpan parameter penyakit yang diprediksi oleh AI
    kode_icd = Column(String)
    nama_penyakit = Column(String)
    
    # Menyimpan target waktu prediksi (contoh format: '2026-10')
    periode_target = Column(String) 
    # Menyimpan angka bulat hasil proyeksi/estimasi jumlah pasien dari model AI
    estimasi_jumlah = Column(Integer)
    # Menyimpan cap waktu kapan kalkulasi prediksi ini dieksekusi
    dihitung_pada = Column(DateTime, default=datetime.datetime.utcnow)


# ==========================================
# 4. FUNGSI UTILITAS DATABASE
# ==========================================

# Fungsi untuk mengeksekusi pembuatan seluruh tabel di database fisik
def create_tables():
    # Menginstruksikan engine untuk membuat semua tabel yang mewarisi class 'Base' 
    # (Hanya akan membuat tabel jika belum eksis di dalam database)
    Base.metadata.create_all(bind=engine)

# Fungsi Dependency Injection (Generator) untuk mendapatkan sesi database di endpoint API
def get_db():
    # Membuat satu instansi sesi database baru
    db = SessionLocal()
    try:
        # Mengirim (yield) sesi tersebut untuk digunakan oleh request HTTP di FastAPI
        yield db
    finally:
        # Memastikan sesi selalu ditutup (closed) setelah request selesai untuk mencegah kebocoran memori (memory leak)
        db.close()