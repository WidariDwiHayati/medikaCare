# ==========================================
# 1. IMPORT MODUL & KONFIGURASI
# ==========================================
# Mengimpor modul random untuk menghasilkan nilai acak (nama, umur, jenis kelamin)
import random
# Mengimpor modul json untuk membaca data referensi wilayah dan penyakit
import json
# Mengimpor objek date (tanggal) dan timedelta (selisih waktu) untuk manipulasi kalender
from datetime import date, timedelta
# Mengimpor sesi database, model tabel (User, KunjunganPasien), dan fungsi pembuat tabel dari modul backend
from backend.database import SessionLocal, User, KunjunganPasien, create_tables

# ==========================================
# 2. FUNGSI UTAMA GENERATOR DATA
# ==========================================
def buat_data_dummy():
    # Membuka sesi komunikasi dengan database SQLite
    create_tables()  # Memastikan seluruh tabel sudah dibuat sebelum menyuntikkan data
    
    db = SessionLocal()
    
    try:
        # --- 2.1. Baca Data Referensi (ICD & Wilayah) ---
        # Membuka dan memuat file JSON yang berisi hasil ekstraksi kode ICD-10
        with open("data/icd_extracted.json", "r", encoding="utf-8") as f:
            penyakit_list = json.load(f)

        # Menentukan daftar kode penyakit spesifik agar data terpusat dan model AI punya tren yang jelas
        kode_fokus = ["A91", "J06.9", "A09", "I10", "E11.9"]
        # Menyaring list penyakit, hanya mengambil objek penyakit yang kodenya ada di dalam 'kode_fokus'
        penyakit_fokus = [p for p in penyakit_list if p["code"] in kode_fokus]
        
        # Fallback: Jika kode fokus gagal ditemukan (misal format file JSON berbeda), gunakan 10 data pertama
        if not penyakit_fokus:
            penyakit_fokus = penyakit_list[:10]

        # Membuka dan memuat data hierarki wilayah Jawa Tengah dari file JSON
        with open("data/jateng.json", "r", encoding="utf-8") as f:
            wilayah_jateng = json.load(f)
            
        # Mengambil daftar nama seluruh kabupaten/kota sebagai list keys
        daftar_kabupaten = list(wilayah_jateng.keys())

        # --- 2.2. Setup Akun Pengguna Standar ---
        # Mengecek apakah akun dengan username "staf" sudah ada di database
        staf = db.query(User).filter(User.username == "staf").first()
        if not staf:
            # Jika belum, buat objek User baru dengan role 'staf' dan simpan ke session
            staf = User(nama_lengkap="Santi", username="staf", password_hash="sandi123", role="staf")
            db.add(staf)
            
        # Mengecek apakah akun dengan username "manajer" sudah ada di database
        manajer = db.query(User).filter(User.username == "manajer").first()
        if not manajer:
            # Jika belum, buat objek User baru dengan role 'manajer'
            manajer = User(nama_lengkap="Joko", username="manajer", password_hash="joko123", role="manajer")
            db.add(manajer)
            
        # Menyimpan (commit) pembuatan akun-akun tersebut secara permanen ke database
        db.commit()
        # Mengambil ulang objek staf dari database untuk mendapatkan ID aslinya (di-generate oleh SQLite)
        staf = db.query(User).filter(User.username == "staf").first()

        # --- 2.3. Eksekusi Generate Kunjungan (Dummy Data) ---
        # Mendefinisikan pilihan jenis kelamin
        kelamin_list = ["Laki-laki", "Perempuan"]
        # Mendefinisikan kategori umur (hanya sebagai referensi, script menggunakan angka acak di bawahnya)
        umur_list = ["Balita (< 5 thn)", "Anak (5-14 thn)", "Remaja & Dewasa (15-59 thn)", "Lansia (> 60 thn)"]
        # Mengambil tanggal hari ini
        hari_ini = date.today()
        # Inisialisasi variabel penghitung total data yang berhasil dibuat
        jumlah_data = 0

        print("Menyuntikkan data AI, harap tunggu...")
        
        # Looping mundur selama 365 hari (1 tahun ke belakang) untuk membuat data historis
        for mundur in range(365): 
            # Menghitung tanggal iterasi saat ini (hari ini dikurangi sekian hari)
            tanggal_riwayat = hari_ini - timedelta(days=mundur)
            
            # Untuk setiap harinya, buat antara 15 sampai 30 baris data kunjungan secara acak
            for _ in range(random.randint(15, 30)):
                # Memilih satu penyakit secara acak dari daftar 'penyakit_fokus'
                pilih_penyakit = random.choice(penyakit_fokus)
                # Menetapkan data wilayah statis ke Kabupaten Banyumas
                pilih_kab = "Kabupaten Banyumas"
                # Memilih satu kecamatan secara acak dari list kecamatan milik Kabupaten Banyumas
                pilih_kec = random.choice(wilayah_jateng[pilih_kab])
                
                # Membentuk objek baris data baru untuk tabel KunjunganPasien
                kunjungan = KunjunganPasien(
                    user_id=staf.id, # Dikaitkan dengan ID akun staf yang dibuat di atas
                    tanggal_kunjungan=tanggal_riwayat,
                    kode_icd=pilih_penyakit["code"],
                    nama_penyakit=pilih_penyakit["str"],
                    # Menghasilkan nama pasien palsu (contoh: "Pasien 4192")
                    nama_pasien=f"Pasien {random.randint(1000, 9999)}", 
                    jenis_kelamin=random.choice(kelamin_list),
                    umur=random.randint(1, 80), # Memilih angka umur acak dari 1 hingga 80 tahun
                    kecamatan=pilih_kec,
                    kabupaten_kota=pilih_kab
                )
                # Memasukkan baris data ke dalam antrean penyimpanan session database
                db.add(kunjungan)
                # Menambah angka konter jumlah data
                jumlah_data += 1
                
        # Menyimpan secara massal (commit) seluruh ribuan baris data kunjungan ke dalam database SQLite
        db.commit()
        # Menampilkan pesan konfirmasi keberhasilan beserta jumlah akhirnya
        print(f"SELESAI! {jumlah_data} baris data berhasil dibuat untuk melatih AI.")

    # Menangkap error apa pun (misal file JSON hilang, database terkunci)
    except Exception as e:
        print(f"Error: {e}")
        # Membatalkan seluruh operasi insert yang belum di-commit untuk menjaga integritas database
        db.rollback()
    finally:
        # Menutup sesi database tanpa peduli operasinya sukses atau gagal agar memori terbebas
        db.close()

# ==========================================
# 3. TITIK MASUK (ENTRY POINT) PROGRAM
# ==========================================
# Memastikan fungsi buat_data_dummy() hanya dijalankan jika file ini dieksekusi langsung
# (tidak berjalan otomatis jika file ini di-import oleh file Python lain)
if __name__ == "__main__":
    buat_data_dummy()