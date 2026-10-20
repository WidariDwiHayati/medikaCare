// ==========================================
// 1. VARIABEL GLOBAL & REFERENSI DOM
// ==========================================
// Menetapkan URL utama backend API secara global ke dalam objek window agar bisa diakses dari file JS lain
window.API_URL = "https://medika-care.vercel.app/";

// Mengambil referensi elemen form login dari DOM
const formLogin = document.getElementById("form-login");
// Mengambil referensi elemen untuk menampilkan pesan error saat login gagal
const loginError = document.getElementById("login-error");
// Mengambil referensi kontainer halaman (layar) login
const halamanLogin = document.getElementById("halaman-login");
// Mengambil referensi kontainer halaman utama aplikasi (dashboard)
const halamanDashboard = document.getElementById("halaman-dashboard");


// ==========================================
// 2. EVENT LISTENER FORM LOGIN
// ==========================================
// Menambahkan event yang akan dipicu saat form login disubmit
formLogin.addEventListener("submit", async (e) => {
    // Mencegah browser melakukan reload halaman secara otomatis (behavior default form)
    e.preventDefault();
    
    // Mengambil nilai teks dari input username
    const username = document.getElementById("input-username").value;
    // Mengambil nilai teks dari input password
    const password = document.getElementById("input-password").value;
    
    try {
        // Melakukan request HTTP POST ke endpoint login di backend menggunakan fetch
        const response = await fetch(`${API_URL}/api/login`, {
            method: "POST", // Metode POST untuk mengirim data sensitif
            headers: { "Content-Type": "application/json" }, // Memberi tahu server format data adalah JSON
            body: JSON.stringify({ username, password }) // Mengubah objek kredensial menjadi string JSON
        });
        
        // Mem-parsing respon dari server ke dalam bentuk objek JSON
        const result = await response.json();
        
        // Mengecek apakah flag 'sukses' dari server bernilai true
        if (result.sukses) {
            // Sembunyikan elemen pesan error jika sebelumnya tampil
            loginError.classList.add("hidden");
            // Menyimpan data profil user yang login ke penyimpanan lokal browser (localStorage) agar sesi bertahan
            localStorage.setItem("userMedikaCare", JSON.stringify(result.data));
            // Memanggil fungsi untuk menampilkan antarmuka dashboard sesuai data user
            tampilkanDashboard(result.data);
        } else {
            // Jika login gagal (password salah / user tidak ada), tampilkan elemen error
            loginError.classList.remove("hidden");
            // Isi teks error sesuai pesan dari server, atau gunakan pesan default jika kosong
            loginError.innerText = result.pesan || result.detail || "Terjadi kesalahan pada server.";
        }
    } catch (error) {
        // Menangkap error jika server mati atau ada gangguan koneksi internet
        alert("Gagal menghubungi server backend. Pastikan Uvicorn menyala.");
    }
});


// ==========================================
// 3. FUNGSI MENAMPILKAN DASHBOARD & HAK AKSES (RBAC)
// ==========================================
function tampilkanDashboard(userData) {
    // Menyembunyikan layar halaman login
    halamanLogin.classList.add("hidden");
    // Menampilkan layar halaman utama dashboard
    halamanDashboard.classList.remove("hidden");
    
    // Mengubah teks profil dengan nama lengkap user yang sedang aktif
    document.getElementById("nama-user-aktif").innerText = userData.nama_lengkap;
    // Mengubah teks role (peran) user yang sedang aktif
    document.getElementById("role-user-aktif").innerText = userData.role;

    // --- Role-Based Access Control (Manajemen Akses Berdasarkan Peran) ---
    // Jika peran pengguna adalah "manajer"
    if (userData.role === "manajer") {
        // Tampilkan menu Prediksi AI
        document.getElementById("menu-prediksi").classList.remove("hidden");
        // Sembunyikan menu Input Data Kunjungan (manajer hanya bisa melihat/menganalisis, bukan menginput)
        document.getElementById("menu-input").classList.add("hidden");
        // Pindahkan tampilan aktif secara otomatis ke tab Prediksi
        ubahTampilan(document.getElementById("menu-prediksi"), document.getElementById("view-prediksi"));
    } 
    // Jika peran pengguna BUKAN "manajer" (misal: admin, petugas)
    else {
        // Sembunyikan menu Prediksi AI (petugas tidak berhak mengakses analitik/prediksi)
        document.getElementById("menu-prediksi").classList.add("hidden");
        // Tampilkan menu Input Data
        document.getElementById("menu-input").classList.remove("hidden");
        // Pindahkan tampilan aktif secara otomatis ke tab Input
        ubahTampilan(document.getElementById("menu-input"), document.getElementById("view-input"));
    }
}


// ==========================================
// 4. FUNGSI LOGOUT (KELUAR)
// ==========================================
function logout() {
    // Menghapus data sesi pengguna dari penyimpanan lokal browser
    localStorage.removeItem("userMedikaCare");
    // Mengosongkan form input password demi keamanan agar tidak tersisa
    document.getElementById("input-password").value = "";
    // Menyembunyikan layar halaman dashboard
    halamanDashboard.classList.add("hidden");
    // Menampilkan kembali layar halaman login
    halamanLogin.classList.remove("hidden");
}


// ==========================================
// 5. PEMERIKSAAN SESI SAAT HALAMAN DIMUAT
// ==========================================
// Menambahkan event yang dieksekusi setiap kali browser selesai memuat struktur halaman (refresh)
window.onload = () => {
    // Mencoba mengambil data sesi login dari localStorage
    const sesiAktif = localStorage.getItem("userMedikaCare");
    // Jika sesi ditemukan (user belum logout)
    if (sesiAktif) 
        // Parsing data string menjadi objek dan langsung tampilkan dashboard tanpa perlu login ulang
        tampilkanDashboard(JSON.parse(sesiAktif));
};
