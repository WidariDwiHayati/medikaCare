// ==========================================
// 1. EVENT LISTENER MENU NAVIGASI PREDIKSI
// ==========================================
// Mendaftarkan event 'click' pada elemen dengan ID 'menu-prediksi' (jika ada)
document.getElementById("menu-prediksi")?.addEventListener("click", function() {
    // Mengubah tampilan UI untuk menampilkan halaman prediksi
    ubahTampilan(this, document.getElementById("view-prediksi"));
    // Mereset teks hasil prediksi ke kondisi awal ("--")
    document.getElementById("angka-prediksi").innerText = "--";
    // Menghapus objek grafik (Chart.js) sebelumnya jika ada agar memori bersih
    if (instanceGrafik) instanceGrafik.destroy();
});


// ==========================================
// 2. EVENT LISTENER TOMBOL PROSES AI (API FETCH)
// ==========================================
// Mendaftarkan event 'click' pada tombol proses AI
document.getElementById("btn-prediksi")?.addEventListener("click", async function() {
    const btn = this; // Menyimpan referensi tombol yang diklik
    const teksAsli = btn.innerText; // Menyimpan teks awal tombol
    btn.innerText = "Memproses AI..."; // Mengubah teks tombol menjadi indikator loading
    btn.disabled = true; // Menonaktifkan tombol agar tidak diklik dua kali

    // Mengambil nilai dari dropdown filter penyakit
    const nilaiPenyakit = document.getElementById("filter-penyakit").value;
    // Memisahkan nilai berdasarkan karakter "|" (Format: KodeICD | NamaPenyakit)
    const potongan = nilaiPenyakit.split("|");
    // Mengambil Kode ICD, menghapus spasi di awal/akhir jika ada
    const kodeIcd = potongan[0] ? potongan[0].trim() : "";
    // Mengambil Nama Penyakit, menghapus spasi di awal/akhir jika ada
    const namaPenyakit = potongan[1] ? potongan[1].trim() : "";
    // Menetapkan periode target prediksi secara statis
    const periode = "Bulan Depan (+30 Hari)";

    try {
        // Melakukan request HTTP GET ke endpoint API backend (Python)
        const response = await fetch(`${API_URL}/api/prediksi?kode_icd=${kodeIcd}&nama_penyakit=${namaPenyakit}&periode_target=${periode}`);
        // Mem-parsing respon dari server menjadi format JSON
        const result = await response.json();
        
        // Jika server mengembalikan error, tampilkan alert dan hentikan proses
        if (result.error) { alert("Error dari Python: " + result.error); return; }
        
        // Jika respon HTTP sukses (status 200-299)
        if (response.ok) {
            // Tampilkan angka estimasi kasus baru ke UI
            document.getElementById("angka-prediksi").innerText = result.estimasi_kasus_baru + " Pasien";
            // Panggil fungsi untuk menggambar grafik tren prediksi
            renderGrafikChartJS(namaPenyakit, result.estimasi_kasus_baru);
            // Panggil fungsi untuk memproses dan menampilkan sebaran data analitik (wilayah & umur)
            renderPanelAnalitik(result.estimasi_kasus_baru, result.data_wilayah || [], result.data_umur || {});
        }
    } catch (error) {
        // Menangkap error jaringan atau server down
        alert("Server AI tidak merespons.");
    } finally {
        // Mengembalikan tombol ke keadaan dan teks semula setelah proses selesai (sukses/gagal)
        btn.innerText = teksAsli; 
        btn.disabled = false;
    }
});


// ==========================================
// 3. VARIABEL GLOBAL GRAFIK
// ==========================================
var instanceGrafik = null; // Menyimpan instance grafik garis (Tren)
var instanceGrafikDemografi = null; // Menyimpan instance grafik batang (Demografi)


// ==========================================
// 4. FUNGSI RENDER GRAFIK TREN PREDIKSI
// ==========================================
function renderGrafikChartJS(namaPenyakit, angkaPrediksi) {
    // Mengambil konteks 2D dari elemen canvas HTML
    const ctx = document.getElementById('grafik-prediksi-canvas').getContext('2d');
    // Mencegah duplikasi dengan menghapus grafik lama jika sudah ada
    if (instanceGrafik) instanceGrafik.destroy();
    
    // Membuat data historis dummy/buatan berdasarkan persentase dari angka prediksi akhir
    const dataHistorisBuatan = [
        Math.floor(angkaPrediksi * 0.4),  // Minggu -4: 40% dari prediksi
        Math.floor(angkaPrediksi * 0.55), // Minggu -3: 55% dari prediksi
        Math.floor(angkaPrediksi * 0.7),  // Minggu -2: 70% dari prediksi
        Math.floor(angkaPrediksi * 0.85), // Minggu -1: 85% dari prediksi
        angkaPrediksi                     // Target Prediksi: 100%
    ];
    
    // Membuat instance grafik baru menggunakan library Chart.js
    instanceGrafik = new Chart(ctx, {
        type: 'line', // Jenis grafik garis
        data: {
            // Label sumbu X
            labels: ['Minggu -4', 'Minggu -3', 'Minggu -2', 'Minggu -1', 'Target Prediksi'],
            datasets: [{
                label: `Proyeksi Tren ${namaPenyakit}`, // Label dataset
                data: dataHistorisBuatan, // Memasukkan data array
                borderColor: '#4f46e5', // Warna garis
                backgroundColor: 'rgba(79, 70, 229, 0.1)', // Warna latar di bawah garis
                borderWidth: 3, // Ketebalan garis
                // Warna dan ukuran titik poin grafik (titik terakhir warna merah/efek highlight)
                pointBackgroundColor: ['#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8', '#ef4444'],
                pointRadius: [4, 4, 4, 4, 8], 
                fill: true, // Mengisi area di bawah garis
                tension: 0.4 // Membuat kurva garis melengkung (tidak kaku)
            }]
        },
        options: { 
            responsive: true, // Grafik responsif
            maintainAspectRatio: false, // Membiarkan grafik menyesuaikan tinggi container
            plugins: { legend: { position: 'bottom' } }, // Posisi legenda di bawah
            scales: { y: { beginAtZero: true } } // Memulai sumbu Y dari angka 0
        }
    });
}


// ==========================================
// 5. FUNGSI RENDER PANEL ANALITIK (WILAYAH & UMUR)
// ==========================================
function renderPanelAnalitik(angkaPrediksi, dataWilayahAsli, dataUmurAsli) {
    const containerWilayah = document.getElementById("konten-kewilayahan");
    // Menampilkan total pemetaan pasien pada judul panel
    document.getElementById("total-pemetaan").innerText = `${angkaPrediksi} Pasien`;
    // Array warna untuk progress bar wilayah
    const warnaProgress = ["bg-red-500", "bg-indigo-500", "bg-emerald-500", "bg-amber-500"];
    containerWilayah.innerHTML = ""; // Kosongkan kontainer sebelum di-render ulang
    
    // --- 5.1. Render Sebaran Wilayah (Largest Remainder Method) ---
    if (!dataWilayahAsli || dataWilayahAsli.length === 0) {
        // Jika data dari API kosong, tampilkan pesan fallback
        containerWilayah.innerHTML = "<p class='text-sm text-slate-400'>Belum ada sebaran wilayah.</p>";
    } else {
        // Menghitung jumlah pasien untuk tiap kecamatan dengan memisah nilai bulat dan sisa desimal
        let alokasi = dataWilayahAsli.map(item => {
            const nilaiEksak = (item.persen / 100) * angkaPrediksi;
            return {
                ...item, // Salin properti asli (kecamatan, persen)
                bagianBulat: Math.floor(nilaiEksak), // Ambil angka bulat hasil pembagian ke bawah
                sisaPecahan: nilaiEksak - Math.floor(nilaiEksak) // Ambil sisa nilai desimal
            };
        });

        // Menghitung total sementara dari nilai yang telah dibulatkan ke bawah
        let totalSementara = alokasi.reduce((sum, item) => sum + item.bagianBulat, 0);
        // Menghitung sisa pasien yang hilang/belum terbagi karena pembulatan ke bawah
        let sisaPasien = angkaPrediksi - totalSementara;

        // Mengurutkan kecamatan berdasarkan nilai sisa pecahan/desimal terbesar (Largest Remainder)
        alokasi.sort((a, b) => b.sisaPecahan - a.sisaPecahan);

        // Mendistribusikan sisa pasien ke kecamatan dengan nilai sisa pecahan terbesar
        for (let i = 0; i < sisaPasien && i < alokasi.length; i++) {
            alokasi[i].bagianBulat += 1;
        }

        // Mengurutkan ulang hasil akhir berdasarkan jumlah pasien terbanyak, jika seri gunakan persentase
        alokasi.sort((a, b) => b.bagianBulat - a.bagianBulat || b.persen - a.persen);

        let nomorUrut = 1;
        alokasi.forEach((item) => {
            // Hanya cetak elemen UI kecamatan yang mendapatkan minimal 1 pasien
            if (item.bagianBulat > 0) {
                // Tentukan rotasi warna progress bar
                const warnaBar = warnaProgress[(nomorUrut - 1) % warnaProgress.length];
                // Highlight warna merah dan teks tebal khusus untuk kecamatan urutan 1
                const teksWarna = nomorUrut === 1 ? "text-red-600 font-bold" : "text-slate-500";
                
                // Menambahkan elemen HTML baris kewilayahan ke dalam kontainer
                containerWilayah.innerHTML += `
                    <div>
                        <div class="flex justify-between text-sm mb-1 font-medium text-slate-700">
                            <span>${nomorUrut}. ${item.kecamatan}</span>
                            <span class="${teksWarna}">${item.bagianBulat} pasien (${item.persen}%)</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-2.5">
                            <div class="${warnaBar} h-2.5 rounded-full" style="width: ${item.persen}%"></div>
                        </div>
                    </div>`;
                nomorUrut++;
            }
        });
        
        // Jika loop selesai tapi kontainer masih kosong (misal prediksi terlalu kecil), berikan info
        if (containerWilayah.innerHTML === "") containerWilayah.innerHTML = "<p class='text-sm text-slate-400'>Angka prediksi terlalu kecil untuk didistribusikan ke wilayah secara spesifik.</p>";
    }

    // --- 5.2. Render Grafik Demografi ---
    const ctxDemo = document.getElementById('grafik-demografi-canvas').getContext('2d');
    // Mencegah duplikasi grafik demografi
    if (instanceGrafikDemografi) instanceGrafikDemografi.destroy();
    
    // Menyusun array nilai umur berurutan (fallback ke 0 jika data tidak ada)
    const arrUmur = [
        dataUmurAsli["Balita (< 5 thn)"] || 0, 
        dataUmurAsli["Anak (5-14 thn)"] || 0,
        dataUmurAsli["Remaja & Dewasa (15-59 thn)"] || 0, 
        dataUmurAsli["Lansia (> 60 thn)"] || 0
    ];
    
    // Membuat grafik batang (bar chart) untuk distribusi umur
    instanceGrafikDemografi = new Chart(ctxDemo, {
        type: 'bar',
        data: {
            labels: ['Balita (< 5)', 'Anak (5-14)', 'Dewasa (15-59)', 'Lansia (> 60)'],
            datasets: [{ 
                data: arrUmur, 
                backgroundColor: ['#e2e8f0', '#ef4444', '#6366f1', '#cbd5e1'], // Kustomisasi warna bar
                borderRadius: 8 // Membuat sudut atas bar menjadi melengkung
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, // Menyembunyikan legenda
            scales: { 
                y: { display: false, max: 100 }, // Sembunyikan garis Y, set maks 100
                x: { grid: { display: false } } // Sembunyikan garis grid X
            } 
        }
    });

    // --- 5.3. Kesimpulan Prioritas Khusus ---
    let persentaseTertinggi = -1; 
    let daftarUmurTertinggi = [];
    
    // Mencari nilai persentase umur tertinggi dari data
    if (dataUmurAsli) {
        for (const val of Object.values(dataUmurAsli)) if (val > persentaseTertinggi) persentaseTertinggi = val;
        // Mengumpulkan kelompok umur apa saja yang memiliki persentase tertinggi (antisipasi jika ada nilai seri)
        for (const [key, val] of Object.entries(dataUmurAsli)) if (val === persentaseTertinggi) daftarUmurTertinggi.push(key);
    }
    
    let teksUmur = "Belum terdeteksi";
    // Formatting teks kelompok umur tertinggi ke dalam bahasa manusia yang luwes
    if (daftarUmurTertinggi.length === 1) teksUmur = daftarUmurTertinggi[0];
    else if (daftarUmurTertinggi.length === 2) teksUmur = daftarUmurTertinggi.join(" dan ");
    else if (daftarUmurTertinggi.length > 2) {
        const itemTerakhir = daftarUmurTertinggi.pop(); // Ambil item terakhir untuk digabungkan dengan "dan"
        teksUmur = daftarUmurTertinggi.join(", ") + ", dan " + itemTerakhir;
    }
    
    // Mengambil wilayah teratas, atau beri fallback teks jika kosong
    const daerahRentan = (dataWilayahAsli && dataWilayahAsli.length > 0) ? dataWilayahAsli[0].kecamatan : "wilayah sekitar";
    
    // Menuliskan kesimpulan prioritas ke dalam UI
    document.getElementById("teks-prioritas").innerHTML = `<strong class="text-slate-800">Prioritas Khusus:</strong> Kelompok <b>${teksUmur} (${persentaseTertinggi > -1 ? persentaseTertinggi : 0}%)</b> terpantau sangat rentan. Alokasikan logistik medis ekstra di puskesmas area <b>${daerahRentan}</b>.`;
}


// ==========================================
// 6. EVENT LISTENER EKSPOR PDF (HTML2PDF)
// ==========================================
document.getElementById("btn-export-pdf")?.addEventListener("click", function() {
    // 6.1. Validasi State Prediksi
    // Cek apakah angka masih default ("--"), artinya prediksi belum dilakukan
    const angka = document.getElementById("angka-prediksi").innerText;
    if (angka === "--") {
        alert("Silakan 'Terapkan Model AI' terlebih dahulu untuk melihat hasil sebelum mencetak laporan!");
        return; // Hentikan proses jika belum ada data
    }

    // 6.2. Manajemen State UI Tombol
    const btn = this;
    const teksAsli = btn.innerText; // Simpan teks 'Ekspor' 
    btn.innerText = "Menyiapkan PDF..."; // Tampilkan indikator loading
    btn.disabled = true;

    // 6.3. Ambil elemen referensi yang akan dicetak sebagai PDF
    const elemenCetak = document.getElementById("area-cetak-prediksi");
    
    // Ambil nama penyakit dari dropdown untuk disisipkan sebagai nama file, fallback ke "Penyakit" jika kosong
    const nilaiPenyakit = document.getElementById("filter-penyakit").value.split("|")[1] || "Penyakit";
    const namaFile = `Laporan_Prediksi_${nilaiPenyakit.trim()}.pdf`;

    // 6.4. Setup Konfigurasi Ekspor (Library html2pdf.js)
    const opsiPdf = {
        margin:       10, // Jarak tepi margin (10mm)
        filename:     namaFile, // Nama file hasil download
        image:        { type: 'jpeg', quality: 0.98 }, // Kompresi gambar menjadi JPEG untuk ukuran file lebih ringan
        // html2canvas membaca struktur HTML menjadi gambar sementara
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' }, // scale 2 agar teks lebih tajam (High Res)
        // jsPDF mengubah gambar tadi menjadi lembaran PDF aktual
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }, // Kertas A4 berorientasi horizontal
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] } // Mencegah potongan halaman di tengah elemen
    };

    // 6.5. Proses Rendering dan Pengunduhan PDF
    html2pdf().set(opsiPdf).from(elemenCetak).save().then(() => {
        // Jika sukses download, kembalikan teks dan fungsi tombol
        btn.innerText = teksAsli;
        btn.disabled = false;
    }).catch(err => {
        // Tangkap error jika terjadi kendala pada peramban/library
        console.error("Gagal membuat PDF:", err);
        alert("Terjadi kesalahan saat membuat PDF.");
        // Kembalikan teks dan fungsi tombol setelah error
        btn.innerText = teksAsli;
        btn.disabled = false;
    });
});