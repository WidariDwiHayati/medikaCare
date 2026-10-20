// ==========================================
// 1. VARIABEL GLOBAL
// ==========================================
// Mendeklarasikan array kosong pada object window untuk menyimpan cache data riwayat sementara
window.dataRiwayatGlobal = [];

// ==========================================
// 2. PENANGANAN FORM (TAMBAH & EDIT DATA KUNJUNGAN)
// ==========================================
// Mengambil referensi elemen formulir kunjungan dari DOM
const formKunjungan = document.getElementById("form-kunjungan");
// Memastikan elemen form ada sebelum mendaftarkan event listener
if (formKunjungan) {
    // Menambahkan event saat formulir di-submit (tombol simpan diklik)
    formKunjungan.addEventListener("submit", async (e) => {
        // Mencegah halaman termuat ulang (reload) secara default saat submit
        e.preventDefault();
        
        // Mengambil data sesi user yang sedang login dari localStorage
        const userData = JSON.parse(localStorage.getItem("userMedikaCare"));
        // Mengambil nilai string input penyakit dari formulir
        const inputPenyakitLengkap = document.getElementById("input-penyakit").value;
        
        // Inisialisasi variabel default untuk kode ICD dan nama penyakit
        let kodeIcd = "UMUM"; 
        let namaPenyakit = inputPenyakitLengkap;
        
        // Jika string input penyakit mengandung karakter pemisah "|"
        if (inputPenyakitLengkap.includes("|")) {
            // Memecah string menjadi array berdasarkan tanda "|"
            const potongan = inputPenyakitLengkap.split("|");
            // Mengambil potongan pertama sebagai Kode ICD dan membersihkan spasinya
            kodeIcd = potongan[0].trim(); 
            // Mengambil potongan kedua sebagai Nama Penyakit dan membersihkan spasinya
            namaPenyakit = potongan[1].trim();
        }

        // Menyusun objek JSON (payload) yang akan dikirim ke server/database
        const payload = {
            user_id: userData.id, // ID pengguna dari localStorage
            tanggal_kunjungan: document.getElementById("input-tanggal").value, // Tanggal berobat
            kode_icd: kodeIcd, // Hasil parsing Kode ICD
            nama_penyakit: namaPenyakit, // Hasil parsing Nama Penyakit
            nama_pasien: document.getElementById("input-nama").value, // Nama lengkap pasien
            jenis_kelamin: document.getElementById("input-kelamin").value, // Jenis kelamin
            umur: parseInt(document.getElementById("input-umur").value), // Mengonversi string umur menjadi angka (Integer)
            kabupaten_kota: document.getElementById("input-kabupaten").value, // Wilayah Kabupaten/Kota
            kecamatan: document.getElementById("input-kecamatan").value // Wilayah Kecamatan
        };

        try {
            // Mengecek apakah form sedang dalam mode "Edit" (memiliki ID tersembunyi)
            const editId = document.getElementById("edit-id").value;
            // Menentukan metode HTTP: PUT untuk update data, POST untuk buat data baru
            const metode = editId ? "PUT" : "POST";
            // Menentukan URL endpoint tujuan berdasarkan ada tidaknya ID edit
            const endpoint = editId ? `${API_URL}/api/kunjungan/${editId}` : `${API_URL}/api/kunjungan`;

            // Melakukan HTTP Request ke backend (API) dengan metode, header, dan body yang sesuai
            const response = await fetch(endpoint, {
                method: metode,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            // Mengurai (parsing) respon server ke bentuk JSON
            const result = await response.json();

            // Jika respon HTTP status 200-299 (Berhasil)
            if (response.ok) {
                // Menampilkan alert sukses
                alert("BERHASIL: " + (result.pesan || "Data tersimpan."));
                // Mengosongkan isian form
                formKunjungan.reset();
                // Mengembalikan nilai input tanggal ke tanggal hari ini secara otomatis
                document.getElementById("input-tanggal").valueAsDate = new Date();
                
                // Jika sedang dalam proses edit, kembalikan tampilan form ke mode normal (Tambah)
                if (editId) {
                    document.getElementById("edit-id").value = ""; // Hapus ID edit
                    const btnSimpan = document.getElementById("btn-simpan-form");
                    btnSimpan.innerText = "Simpan Data Kunjungan"; // Kembalikan teks tombol awal
                    // Mengubah warna tombol kembali ke mode default (gelap) dari warna amber (kuning)
                    btnSimpan.classList.replace("bg-amber-600", "bg-slate-900");
                    btnSimpan.classList.replace("hover:bg-amber-700", "hover:bg-slate-800");
                    // Pindah secara otomatis ke tab/menu Riwayat setelah edit berhasil
                    document.getElementById("menu-riwayat").click();
                    // Sembunyikan tombol "Batal Edit"
                    document.getElementById("btn-batal-edit").classList.add("hidden");
                }
            } else {
                alert("GAGAL: Terjadi kesalahan validasi data."); // Respon server mengindikasikan gagal
            }
        } catch (error) {
            alert("Terjadi kesalahan sistem saat menyimpan data."); // Menangkap error koneksi
        }
    });
}

// Menyetel default nilai input tanggal menjadi hari ini (saat file pertama kali dimuat)
const inputTanggal = document.getElementById("input-tanggal");
if(inputTanggal) inputTanggal.valueAsDate = new Date();

// ==========================================
// 3. FUNGSI MEMUAT DATA RIWAYAT (TABEL)
// ==========================================
async function muatDataRiwayat() {
    const tbody = document.getElementById("tabel-riwayat-body");
    if (!tbody) return; // Hentikan fungsi jika tabel tidak ditemukan di DOM
    
    // Tampilkan pesan loading di dalam tabel
    tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400">Sedang mengambil data dari server...</td></tr>`;
    try {
        // Melakukan request GET ke endpoint riwayat kunjungan
        const response = await fetch(`${API_URL}/api/riwayat`);
        const data = await response.json(); // Parsing hasil respon
        
        window.dataRiwayatGlobal = data; // Simpan data ke variabel global agar bisa dipakai fitur edit/filter
        tbody.innerHTML = ""; // Bersihkan pesan loading
        
        // Tampilkan pesan kosong jika tidak ada data dari database
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400">Belum ada data kunjungan.</td></tr>`;
            return;
        }

        // Loop melalui masing-masing baris data dari database
        data.forEach(item => {
            // Memformat string tanggal (ISO) menjadi format bahasa Indonesia (Misal: 15 Okt 2026)
            const tglObj = new Date(item.tanggal_kunjungan);
            const tglRapi = tglObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            
            // Singkat teks Jenis Kelamin
            const jk = item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';
            
            // Buat elemen baris <tr> baru untuk ditambahkan ke tabel
            const tr = document.createElement("tr");
            tr.className = "hover:bg-slate-50 transition";
            // Menyusun sel (kolom) HTML dengan template literal, menyisipkan data ke dalamnya
            tr.innerHTML = `
                <td class="px-6 py-4 font-medium text-slate-800">${tglRapi}</td>
                <td class="px-6 py-4 font-bold text-indigo-700">${item.nama_pasien}</td>
                <td class="px-6 py-4">
                    <span class="font-bold text-slate-700">${item.kode_icd}</span><br>
                    <span class="text-xs text-slate-500">${item.nama_penyakit}</span>
                </td>
                <td class="px-6 py-4">${item.umur} Thn</td>
                <td class="px-6 py-4 font-bold">${jk}</td>
                <td class="px-6 py-4">
                    <span class="font-medium text-slate-700">${item.kecamatan}</span><br>
                    <span class="text-xs text-slate-500">${item.kabupaten_kota}</span>
                </td>
                <td class="px-6 py-4 text-center flex justify-center gap-2">
                    <!-- Tombol Edit & Hapus, menyematkan ID data ke fungsi onclick -->
                    <button onclick="siapkanEdit(${item.id})" class="text-amber-600 hover:text-amber-800 text-xs font-bold px-2 py-1 border border-amber-200 hover:bg-amber-50 rounded transition">Edit</button>
                    <button onclick="hapusData(${item.id})" class="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 border border-red-200 hover:bg-red-50 rounded transition">Hapus</button>
                </td>
            `;
            // Masukkan baris tersebut ke dalam tbody tabel
            tbody.appendChild(tr);
        });
        
        // Panggil fungsi pencarian untuk menerapkan filter (jika sebelumnya ada filter yang aktif)
        jalankanFilterTabel();
    } catch (error) {
        // Tampilkan pesan error pada baris tabel jika gagal memuat
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-red-500">Gagal memuat data. Periksa koneksi backend.</td></tr>`;
    }
}

// ==========================================
// 4. FUNGSI MEMUAT DATA WILAYAH (AUTOCOMPLETE)
// ==========================================
let dataWilayahGlobal = {};
async function muatDataWilayah() {
    try {
        // Mengambil daftar struktur kewilayahan (Provinsi Jateng JSON) dari API
        const response = await fetch(`${API_URL}/api/wilayah`);
        dataWilayahGlobal = await response.json(); // Mengisi variabel wilayah
        
        // Mencari key kabupaten yang mengandung kata "BANYUMAS" (tidak peduli besar/kecil hurufnya)
        const keyBanyumas = Object.keys(dataWilayahGlobal).find(k => k.toUpperCase().includes("BANYUMAS"));
        
        if (keyBanyumas) {
            // Otomatis memilih "Banyumas" di kolom input Kabupaten
            document.getElementById("input-kabupaten").value = keyBanyumas;
            
            // Ambil elemen datalist khusus kecamatan
            const datalistKecamatan = document.getElementById("daftar-kecamatan");
            const inputKecamatan = document.getElementById("input-kecamatan");
            
            if (datalistKecamatan && inputKecamatan) {
                datalistKecamatan.innerHTML = ""; // Bersihkan list/opsi sebelumnya
                
                // Tambahkan nama-nama kecamatan wilayah banyumas sebagai tag <option> pada datalist
                dataWilayahGlobal[keyBanyumas].forEach(kecamatan => {
                    const option = document.createElement("option"); 
                    option.value = kecamatan; 
                    datalistKecamatan.appendChild(option);
                });
                
                // Ubah petunjuk teks pada input kecamatan menandakan opsi siap dipilih
                inputKecamatan.placeholder = "Pilih atau ketik Kecamatan...";
            }
        }
    } catch (error) { 
        // Tangani masalah saat gagal memuat json wilayah
        console.error("Gagal memuat data wilayah:", error); 
        document.getElementById("input-kecamatan").placeholder = "Gagal memuat data wilayah.";
    }
}

// Eksekusi fungsi wilayah secara langsung saat script dibaca (First Load)
muatDataWilayah();

// ==========================================
// 5. FUNGSI HAPUS DATA KUNJUNGAN
// ==========================================
async function hapusData(id) {
    // Tampilkan pop-up peringatan standar browser sebelum menghapus
    const konfirmasi = confirm("Apakah Anda yakin ingin menghapus data kunjungan ini?");
    if (!konfirmasi) return; // Hentikan eksekusi jika diklik "Cancel"

    try {
        // Lakukan request HTTP metode DELETE ke backend dengan menyematkan ID data
        const response = await fetch(`${API_URL}/api/kunjungan/${id}`, { method: "DELETE" });
        const result = await response.json();
        
        if (response.ok) {
            // Kosongkan form input cari riwayat jika data sukses dihapus
            const inputCari = document.getElementById("input-cari-riwayat");
            if(inputCari) inputCari.value = "";
            // Muat ulang isi tabel untuk menghilangkan baris data yang terhapus dari UI
            muatDataRiwayat();
            alert("Data berhasil dihapus!");
        } else { alert("Gagal menghapus: " + result.error); }
    } catch (error) { alert("Terjadi kesalahan pada server."); }
}

// ==========================================
// 6. FUNGSI MENGISI FORM (MODE EDIT)
// ==========================================
function siapkanEdit(id) {
    // Mencari detail data spesifik dari dataRiwayatGlobal berdasarkan ID
    const item = window.dataRiwayatGlobal.find(x => x.id === id);
    if (!item) return; // Jika tidak ketemu (tidak logis), batalkan proses

    // Simulasikan klik pada menu Input agar halaman otomatis pindah ke tampilan Form
    document.getElementById("menu-input").click();
    
    // Isikan nilai detail pasien ke masing-masing kotak formulir
    document.getElementById("edit-id").value = item.id;
    document.getElementById("input-tanggal").value = item.tanggal_kunjungan;
    document.getElementById("input-nama").value = item.nama_pasien;
    // Menggabungkan kembali kode dan nama dengan "|" sesuai format dropdown form 
    document.getElementById("input-penyakit").value = `${item.kode_icd} | ${item.nama_penyakit}`;
    document.getElementById("input-kelamin").value = item.jenis_kelamin;
    document.getElementById("input-umur").value = item.umur;
    document.getElementById("input-kabupaten").value = item.kabupaten_kota;
    
    // Paksa tembak (trigger) event "input" agar daftar kecamatan terbarui sesuai kabupaten terkait
    document.getElementById("input-kabupaten").dispatchEvent(new Event('input')); 
    
    // Isikan nama kecamatan
    document.getElementById("input-kecamatan").value = item.kecamatan;
    
    // Ubah tulisan, warna, dan status tombol dari mode simpan ke mode ubah/edit (Warna Kuning Amber)
    const btnSimpan = document.getElementById("btn-simpan-form");
    btnSimpan.innerText = "Simpan Perubahan";
    btnSimpan.classList.replace("bg-slate-900", "bg-amber-600");
    btnSimpan.classList.replace("hover:bg-slate-800", "hover:bg-amber-700");
    
    // Munculkan (hapus kelas hidden) tombol "Batal Edit" di sebelah tombol simpan
    document.getElementById("btn-batal-edit").classList.remove("hidden");
}

// ==========================================
// 7. FUNGSI PEMBATALAN MODE EDIT
// ==========================================
function batalkanEdit() {
    // Mengosongkan kembali isi seluruh input form
    document.getElementById("form-kunjungan").reset();
    document.getElementById("edit-id").value = ""; // Menghilangkan penanda ID
    document.getElementById("input-tanggal").valueAsDate = new Date(); // Reset tanggal ke hari ini

    // Mengembalikan tombol Submit (Ubah Perubahan) ke mode Tambah (Simpan Data) dengan warna normal (Gelap)
    const btnSimpan = document.getElementById("btn-simpan-form");
    btnSimpan.innerText = "Simpan Data Kunjungan";
    btnSimpan.classList.replace("bg-amber-600", "bg-slate-900");
    btnSimpan.classList.replace("hover:bg-amber-700", "hover:bg-slate-800");

    // Sembunyikan lagi tombol "Batal Edit"
    document.getElementById("btn-batal-edit").classList.add("hidden");
    
    // Pindah kembali otomatis ke tab menu Riwayat
    document.getElementById("menu-riwayat").click();
}

// ==========================================
// 8. FUNGSI PENCARIAN & FILTER TABEL
// ==========================================
function jalankanFilterTabel() {
    // Ambil string kata kunci pencarian global dari form pencarian atas tabel dan jadikan huruf kecil (lowercase)
    const kataKunciGlobal = (document.getElementById("input-cari-riwayat")?.value || "").toLowerCase();
    
    // Cari semua input filter spesifik (untuk masing-masing kolom)
    const inputKolom = document.querySelectorAll('.filter-kolom');
    
    // Ambil semua elemen baris (<tr>) dari tabel riwayat
    const barisTabel = document.querySelectorAll("#tabel-riwayat-body tr");
    
    barisTabel.forEach(baris => {
        // Jangan eksekusi pencarian pada baris "Pesan Info" yang tidak memiliki kolom lengkap (misal pesan belum ada data)
        if (baris.children.length === 1) return; 
        
        // Ambil dan ubah ke huruf kecil seluruh teks dari satu baris secara menyeluruh (untuk pencarian global)
        const teksBaris = baris.textContent.toLowerCase();
        
        // Cek apakah string dari pencarian global tersebut ditemukan dalam string panjang baris ini
        let lolosGlobal = teksBaris.includes(kataKunciGlobal);
        let lolosKolom = true;
        
        // Cek secara terpisah untuk setiap input pencarian kolom individual
        inputKolom.forEach(input => {
            const indeks = input.getAttribute('data-col'); // Indeks kolom (misal: 0 untuk tanggal, 1 untuk nama)
            const nilaiCari = input.value.toLowerCase(); // Nilai dari input kolom tersebut
            
            // Jika ada teks di input kolom tsb
            if (nilaiCari !== "" && indeks !== null) {
                const sel = baris.children[indeks]; // Mengambil cell/td spesifik pada indeks yang diincar
                if (sel) {
                    const teksSel = sel.textContent.toLowerCase();
                    // Jika teks cell tidak sesuai dengan isian pencarian kolom, batalkan kelolosannya
                    if (!teksSel.includes(nilaiCari)) lolosKolom = false;
                }
            }
        });
        
        // Sembunyikan baris (display: none) jika gagal melewati salah satu aturan filter, sebaliknya kembalikan display kosong agar tampil
        baris.style.display = (lolosGlobal && lolosKolom) ? "" : "none";
    });
}

// ==========================================
// 9. EVENT LISTENER UNTUK FILTER DAN DEPENDENT DROPDOWN
// ==========================================

// Daftar trigger/pemicu jika ada pengetikan di input pencarian atas tabel
document.getElementById("input-cari-riwayat")?.addEventListener("input", jalankanFilterTabel);

// Memastikan DOM siap, kemudian tempelkan trigger pada setiap input filter kolom
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.filter-kolom').forEach(input => {
        // Jalankan filter tiap kali user mengetik
        input.addEventListener("input", jalankanFilterTabel);
        // Jalankan filter tiap kali input bertipe Dropdown mengubah pilihannya
        input.addEventListener("change", jalankanFilterTabel);
    });
});

// Penanganan interaktif agar nilai kecamatan menyesuaikan dengan kabupaten yang baru diubah
document.getElementById("input-kabupaten")?.addEventListener("input", function() {
    const kabupatenTerpilih = this.value; // Dapatkan kabupaten yang baru diketik/dipilih
    const datalistKecamatan = document.getElementById("daftar-kecamatan"); 
    const inputKecamatan = document.getElementById("input-kecamatan");
    
    // Reset isi pilihan kecamatan jika ganti kabupaten
    datalistKecamatan.innerHTML = ""; 
    inputKecamatan.value = "";
    
    // Jika kabupaten yang diketik valid (ada di dalam database JSON yang dimuat)
    if (dataWilayahGlobal[kabupatenTerpilih]) {
        inputKecamatan.placeholder = "Pilih atau ketik Kecamatan...";
        // Buatkan kembali opsi list kecamatan untuk kabupaten terpilih
        dataWilayahGlobal[kabupatenTerpilih].forEach(kecamatan => {
            const option = document.createElement("option"); 
            option.value = kecamatan; 
            datalistKecamatan.appendChild(option);
        });
    } else { 
        // Ubah placeholder jika kabupaten yang diketik belum selesai atau tidak terdaftar
        inputKecamatan.placeholder = "Pilih Kabupaten dulu..."; 
    }
});