# ==========================================
# 1. IMPORT LIBRARY & MODUL
# ==========================================
# Mengimpor pandas untuk manipulasi dan analisis data terstruktur (Dataframe)
import pandas as pd
# Mengimpor numpy untuk komputasi numerik dan operasi array matematis
import numpy as np
# Mengimpor algoritma Linear Regression dari library Machine Learning Scikit-Learn
from sklearn.linear_model import LinearRegression
# Mengimpor modul Session dari SQLAlchemy untuk interaksi dengan database
from sqlalchemy.orm import Session
# Mengimpor modul database (buatan sendiri) untuk mengakses struktur tabel (KunjunganPasien)
from backend import database


# ==========================================
# 2. FUNGSI UTAMA PREDIKSI AI
# ==========================================
def jalankan_prediksi(db: Session, kode_icd_target: str, nama_penyakit_target: str, periode_target: str):
    # Mengambil (query) data historis dari tabel KunjunganPasien yang kode ICD-nya cocok dengan target yang dicari
    data_historis = db.query(database.KunjunganPasien).filter(
        database.KunjunganPasien.kode_icd == kode_icd_target
    ).all()

    # Validasi awal: Regresi linier membutuhkan minimal sekumpulan titik data untuk menarik garis tren.
    # Jika data kurang dari 3 baris, kembalikan nilai prediksi 0 dan data kosong untuk mencegah error kalkulasi
    if len(data_historis) < 3:
        return {"estimasi": 0, "wilayah": [], "umur": {}}

    # --- 1. PREDIKSI REGRESI LINIER ---
    
    # Mengekstrak tanggal kunjungan dari tiap baris database dan memberikan bobot "jumlah" = 1 (1 pasien)
    df = pd.DataFrame([{"tanggal": d.tanggal_kunjungan, "jumlah": 1} for d in data_historis])
    
    # Mengonversi kolom 'tanggal' menjadi tipe data datetime bawaan pandas agar mudah diurutkan
    df['tanggal'] = pd.to_datetime(df['tanggal'])
    # Mengurutkan data secara kronologis dari tanggal terlama ke terbaru
    df = df.sort_values('tanggal')
    
    # Mengelompokkan data berdasarkan hari yang sama, lalu menjumlahkan kolom 'jumlah' (total kasus per hari)
    df_harian = df.groupby('tanggal').sum().reset_index()
    # Membuat kolom baru 'waktu_index' berurutan dari 1, 2, 3... sebagai representasi sumbu X pada kurva tren
    df_harian['waktu_index'] = np.arange(1, len(df_harian) + 1)

    # Menentukan variabel independen (X) berupa indeks waktu (hari ke-1, ke-2, dst)
    X = df_harian[['waktu_index']].values
    # Menentukan variabel dependen (y) berupa jumlah kasus per hari tersebut
    y = df_harian['jumlah'].values
    
    # Menginisialisasi model Machine Learning Regresi Linier
    model = LinearRegression()
    # Melatih model dengan data (Mencari garis lurus terbaik yang mewakili tren data historis)
    model.fit(X, y)

    # Menentukan berapa langkah ke depan yang akan diprediksi (30 hari jika periode bulan depan, jika tidak 90 hari)
    langkah_ke_depan = 30 if "Bulan" in periode_target else 90
    
    # Melakukan prediksi untuk titik waktu (X baru) di masa depan (panjang data historis + langkah ke depan)
    estimasi = model.predict([[len(df_harian) + langkah_ke_depan]])
    # Mengambil nilai hasil prediksi, memastikannya tidak minus (max dengan 0), dan membulatkannya menjadi bilangan bulat
    hasil_estimasi = int(max(0, round(estimasi[0])))


    # --- 2. AGREGASI DEMOGRAFI & WILAYAH ---
    
    # Menyiapkan kamus/dictionary kosong untuk menghitung sebaran wilayah
    wilayah_dict = {}
    # Menyiapkan dictionary dengan 4 kategori kelompok rentang umur beserta nilai awal 0
    umur_dict = {
        "Balita (< 5 thn)": 0,
        "Anak (5-14 thn)": 0,
        "Remaja & Dewasa (15-59 thn)": 0,
        "Lansia (> 60 thn)": 0
    }
    
    # Mendapatkan total seluruh pasien dengan menghitung panjang baris data yang ada
    total_pasien = len(data_historis)

    # Melakukan perulangan (loop) untuk setiap satu data kunjungan
    for data in data_historis:
        # 1. Agregasi Kewilayahan: Menggabungkan nama kecamatan dan kabupaten (contoh: "Coblong, Kota Bandung")
        nama_wilayah_lengkap = f"{data.kecamatan}, {data.kabupaten_kota}"
        # Jika nama wilayah sudah ada di dict, tambahkan 1. Jika belum, buat key baru berisikan 0 lalu tambah 1.
        wilayah_dict[nama_wilayah_lengkap] = wilayah_dict.get(nama_wilayah_lengkap, 0) + 1
        
        # 2. Pengelompokan Umur secara Otomatis: Mengambil angka umur dari database
        umur_angka = data.umur
        
        # Mengklasifikasikan usia pasien ke dalam kategori yang sesuai berdasarkan range
        if umur_angka < 5:
            kat_umur = "Balita (< 5 thn)"
        elif 5 <= umur_angka <= 14:
            kat_umur = "Anak (5-14 thn)"
        elif 15 <= umur_angka <= 59:
            kat_umur = "Remaja & Dewasa (15-59 thn)"
        else:
            kat_umur = "Lansia (> 60 thn)"
            
        # Menambahkan jumlah hitungan 1 pada kategori umur yang terpilih
        umur_dict[kat_umur] = umur_dict.get(kat_umur, 0) + 1

    # Mengurutkan sebaran wilayah dari pasien terbanyak hingga paling sedikit (descending / reverse=True)
    wilayah_tertinggi = sorted(wilayah_dict.items(), key=lambda x: x[1], reverse=True)
    
    # Mengonversi jumlah pasien per wilayah menjadi nilai persentase (dibagi total pasien dikali 100) dan dibulatkan
    data_wilayah = [{"kecamatan": k, "persen": int(round((v/total_pasien)*100))} for k, v in wilayah_tertinggi]
    
    # Mengonversi jumlah pasien per kategori umur menjadi nilai persentase secara proporsional
    # Menggunakan kondisi "if total_pasien > 0" untuk mencegah error pembagian dengan nol (ZeroDivisionError)
    data_umur = {k: int(round((v/total_pasien)*100)) if total_pasien > 0 else 0 for k, v in umur_dict.items()}

    # --- 3. PENGEMBALIAN DATA ---
    # Membungkus ketiga hasil analisis utama ke dalam satu kamus (dictionary) untuk dikembalikan ke API FastAPI
    return {
        "estimasi": hasil_estimasi, # Int: Angka hasil proyeksi kasus baru
        "wilayah": data_wilayah,    # List of Dicts: Array kecamatan dan persentasenya
        "umur": data_umur           # Dict: Kategori usia dan persentasenya
    }