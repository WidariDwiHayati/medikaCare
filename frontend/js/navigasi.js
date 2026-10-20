// ==========================================
// 1. FUNGSI PENGATUR TRANSISI TAMPILAN (TAB/VIEW)
// ==========================================
// Fungsi ini bertugas untuk mengatur pergantian halaman layaknya Single Page Application (SPA)
function ubahTampilan(menuAktif, viewAktif) {
    // Mendefinisikan daftar ID untuk semua elemen tombol menu navigasi
    const menus = ["menu-input", "menu-riwayat", "menu-prediksi"];
    // Mendefinisikan daftar ID untuk semua elemen kontainer halaman (view)
    const views = ["view-input", "view-riwayat", "view-prediksi"];
    
    // Melakukan perulangan untuk mereset tampilan semua tombol menu ke kondisi tidak aktif
    menus.forEach(id => {
        // Mengambil elemen menu berdasarkan ID masing-masing
        const el = document.getElementById(id);
        if(el) { 
            // Menghapus kelas CSS penanda menu aktif (latar belakang gelap, teks terang)
            el.classList.remove("bg-slate-800", "text-slate-200"); 
            // Menambahkan kelas CSS penanda menu tidak aktif (warna teks menjadi pudar)
            el.classList.add("text-slate-400"); 
        }
    });
    
    // Melakukan perulangan untuk menyembunyikan semua kontainer halaman
    views.forEach(id => {
        // Mengambil elemen halaman berdasarkan ID masing-masing
        const el = document.getElementById(id);
        // Menambahkan kelas utilitas "hidden" (display: none) untuk menyembunyikan elemen
        if(el) el.classList.add("hidden");
    });
    
    // Mengecek apakah elemen menu dan halaman yang ingin diaktifkan benar-benar ada (tidak null)
    if (menuAktif && viewAktif) {
        // Menghapus kelas teks pudar pada menu yang sedang diklik
        menuAktif.classList.remove("text-slate-400"); 
        // Memberikan gaya visual aktif (latar belakang gelap, teks terang) pada menu yang diklik
        menuAktif.classList.add("bg-slate-800", "text-slate-200");
        // Menampilkan halaman yang dituju dengan menghapus kelas "hidden"
        viewAktif.classList.remove("hidden");
    }
}

// ==========================================
// 2. PENDAFTARAN EVENT LISTENER NAVIGASI
// ==========================================
// Mendaftarkan event 'click' pada menu "Input" (jika elemennya ada)
document.getElementById("menu-input")?.addEventListener("click", function() { 
    // Memanggil fungsi ubahTampilan dengan mengirimkan elemen menu ini (this) dan halaman view-input
    ubahTampilan(this, document.getElementById("view-input")); 
});

// Mendaftarkan event 'click' pada menu "Riwayat" (jika elemennya ada)
document.getElementById("menu-riwayat")?.addEventListener("click", function() { 
    // Mengaktifkan tampilan halaman view-riwayat
    ubahTampilan(this, document.getElementById("view-riwayat")); 
    // Memanggil fungsi eksternal muatDataRiwayat() untuk mengambil data tabel terbaru dari database/API
    muatDataRiwayat(); 
});

// Mendaftarkan event 'click' pada menu "Prediksi" (jika elemennya ada)
// (Catatan: Event ini juga didefinisikan di prediksi.js dengan tambahan logika pembersihan grafik)
document.getElementById("menu-prediksi")?.addEventListener("click", function() { 
    // Mengaktifkan tampilan halaman view-prediksi
    ubahTampilan(this, document.getElementById("view-prediksi")); 
});