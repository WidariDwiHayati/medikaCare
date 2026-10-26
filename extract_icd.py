# Mengimpor modul 're' (Regular Expression) untuk mencari teks dengan pola tertentu
import re
# Mengimpor modul 'json' untuk membaca, memanipulasi, dan menulis data dalam format JSON
import json

# ==========================================
# 1. KONFIGURASI NAMA FILE
# ==========================================
# Menentukan nama file SQL sumber yang berisi data mentah penyakit (ICD)
nama_file_sql = "tb_icd.sql"
# Menentukan lokasi dan nama file JSON sebagai hasil output (disimpan di folder 'data')
nama_file_output = "data/icd_extracted.json"

# Memulai blok try-except untuk menangani kemungkinan error jika file SQL tidak ditemukan
try:
    # Membuka file SQL dalam mode baca ('r') menggunakan format encoding standar 'utf-8'
    with open(nama_file_sql, 'r', encoding='utf-8') as file:
        # Membaca seluruh isi teks di dalam file tersebut dan menyimpannya ke variabel 'content'
        content = file.read()

    # ==========================================
    # 2. PROSES EKSTRAKSI DENGAN REGEX
    # ==========================================
    # Menentukan pola regex untuk menangkap data di dalam query INSERT SQL.
    # Penjelasan Pola: 
    # \(      -> Mencari karakter tanda kurung buka "("
    # \d+,    -> Mencari angka (ID) berapapun panjangnya, diikuti tanda koma
    # \s*     -> Mengabaikan spasi kosong jika ada
    # '([^']+)' -> Mengambil semua teks di dalam tanda kutip tunggal pertama (CODE ICD)
    # , \s*   -> Mengabaikan koma dan spasi pemisah
    # '([^']+)' -> Mengambil semua teks di dalam tanda kutip tunggal kedua (STR/Nama Penyakit)
    pola_regex = r"\(\d+,\s*'([^']+)',\s*'([^']+)'"
    
    # Mengeksekusi pencarian regex pada variabel 'content', menghasilkan list berisi tuple pasangan (code, str)
    hasil_ekstraksi = re.findall(pola_regex, content)

    # Membuat list kosong untuk menampung hasil ekstraksi yang sudah dirapikan
    data_icd = []
    
    # Melakukan perulangan untuk setiap pasangan kode dan nama penyakit dari hasil regex
    for code, str_val in hasil_ekstraksi:
        # Menambahkan data ke dalam list dalam bentuk dictionary/objek JSON
        data_icd.append({
            "code": code,    # Menyimpan kode ICD
            "str": str_val   # Menyimpan nama penyakit
        })

    # ==========================================
    # 3. PENYIMPANAN DATA KE JSON
    # ==========================================
    # Membuka atau membuat file output JSON baru dalam mode tulis ('w')
    with open(nama_file_output, 'w', encoding='utf-8') as json_file:
        # Menyimpan struktur list dictionary 'data_icd' ke dalam file JSON
        # indent=4 digunakan agar format file JSON rapi secara hierarki (tidak menyatu dalam 1 baris)
        json.dump(data_icd, json_file, indent=4)

    # Menampilkan pesan sukses ke terminal beserta jumlah total data yang berhasil diekstrak
    print(f"Berhasil mengekstrak {len(data_icd)} data penyakit!")
    # Menampilkan lokasi file output berhasil disimpan
    print(f"File tersimpan di: {nama_file_output}")

# Menangkap error khusus jika nama_file_sql tidak ditemukan di direktori saat script dijalankan
except FileNotFoundError:
    # Menampilkan pesan peringatan kepada user agar mengecek kembali nama/lokasi file SQL
    print(f"Error: File {nama_file_sql} tidak ditemukan. Pastikan namanya benar.")