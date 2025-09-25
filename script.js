const API_URL = "https://script.google.com/macros/s/AKfycby4z2qZ24SrJkcyGpybH29lSUC_3_z1LG-7wSmTzpaOEXrwjXf0Cl3hqkg95qAxPj1-/exec";
const darkSwitch = document.getElementById("darkSwitch");
const lapakPageSelect = document.getElementById("lapakPageSelect");

let lapakData = [];
let currentLapakId = null;
let absensiMingguan = false;
let lastScrollY = 0;
let currentPage = 1;
const LAPAK_PER_PAGE = 10;
const absensiKategoriSelect = document.getElementById("absensiKategoriSelect");
const modalAbsenBtn = document.getElementById("modalAbsenBtn");
const modalIzinBtn = document.getElementById("modalIzinBtn");

// =================== Loader ===================
function showAbsensiLoading(show, text = "Sedang menyimpan data...") {
    const loader = document.getElementById("absensiLoading");
    const loadingText = document.getElementById("absensiLoadingText");
    if (!loader || !loadingText) return;
    loader.classList.toggle("d-flex", show);
    loader.classList.toggle("d-none", !show);
    loadingText.textContent = text;
}

// =================== Toast ===================
function showToast(message, type = "success", duration = 3000) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span><button class="toast-close">&times;</button>`;

    container.appendChild(toast);

    // close button
    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.remove();
    });

    // show
    setTimeout(() => toast.classList.add("show"), 50);

    // auto remove
    setTimeout(() => toast.remove(), duration);
}


// =================== Load semua lapak ===================
async function loadLapak() {
    showAbsensiLoading(true, "Sedang memuat data lapak...");
    try {
        const res = await fetch(API_URL + "?action=lapakHariIni");
        const json = await res.json();

        if (!json.success) {
            document.getElementById("lapakContainer").innerHTML =
                `<p class="text-center text-danger">Gagal load data: ${json.message}</p>`;
            showAbsensiLoading(false);
            return;
        }

        lapakData = json.data || [];
        currentPage = 1;
        renderLapak(lapakData);
        updateSummary();
        updateAbsensiInfo();
    } catch (err) {
        console.error(err);
        document.getElementById("lapakContainer").innerHTML =
            `<p class="text-center text-danger">Error loadLapak: ${err}</p>`;
    }
    showAbsensiLoading(false);
}

// =================== Render lapak ===================
function renderLapak(data) {
    const container = document.getElementById("lapakContainer");
    container.innerHTML = "";

    if (!data.length) {
        container.innerHTML = `<p class="text-center">Tidak ada data lapak.</p>`;
        if (lapakPageSelect) lapakPageSelect.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(data.length / LAPAK_PER_PAGE);

    if (lapakPageSelect) {
        lapakPageSelect.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const start = (i - 1) * LAPAK_PER_PAGE + 1;
            const end = Math.min(i * LAPAK_PER_PAGE, data.length);
            const option = document.createElement("option");
            option.value = i;
            option.textContent = `${start} - ${end}`;
            if (i === currentPage) option.selected = true;
            lapakPageSelect.appendChild(option);
        }
    }

    const startIndex = (currentPage - 1) * LAPAK_PER_PAGE;
    const endIndex = startIndex + LAPAK_PER_PAGE;
    const pageData = data.slice(startIndex, endIndex);

    pageData.forEach(lapak => {
        const noLapak = lapak.noLapak || "-";
        const namaLapak = lapak.nama || "Tanpa Nama";
        const status = String(lapak.statusAbsensi || "").toLowerCase();

        let badgeText = "Belum Absen";
        let badgeClass = "bg-danger";
        let cardClass = "belum";

        if (status.includes("hadir")) {
            badgeText = "✅ Sudah Absen";
            badgeClass = "bg-success";
            cardClass = "hadir";
        } else if (status.includes("izin")) {
            badgeText = "📝 Izin";
            badgeClass = "bg-warning";
            cardClass = "izin";
        }

        const card = document.createElement("div");
        card.className = "col-md-4 col-sm-6 mb-3";
        card.innerHTML = `
            <div class="card lapak-card shadow-sm ${cardClass}" 
                 data-no-lapak="${noLapak}" data-nama-lapak="${namaLapak}">
                
                <span class="lapak-badge ${badgeClass}">
                    ${badgeText}
                </span>

                <div class="card-body text-center">
                    <h5 class="card-title">Lapak ${noLapak}</h5>
                    <p class="card-text">${namaLapak.split('(')[0].trim()}</p>
                    <p class="card-subtext">(${namaLapak.split('(')[1]?.replace(')', '').trim() || ''})</p>
                </div>
            </div>
        `;

        const cardEl = card.querySelector(".lapak-card");
        if (cardEl) cardEl.addEventListener("click", () => openAbsensiModal(noLapak, namaLapak));

        container.appendChild(card);
    });
}

// =================== Ganti halaman ===================
if (lapakPageSelect) {
    lapakPageSelect.addEventListener("change", () => {
        currentPage = parseInt(lapakPageSelect.value) || 1;
        renderLapak(lapakData);
    });
}
function animateBadgeChange(badgeEl, newHTML) {
    if (!badgeEl) return;

    // Buat animasi fade out → ganti content → fade in
    badgeEl.style.transition = "transform 0.2s ease, opacity 0.2s ease";
    badgeEl.style.opacity = "0";
    badgeEl.style.transform = "scale(0.8)";

    setTimeout(() => {
        badgeEl.innerHTML = newHTML;
        badgeEl.style.opacity = "1";
        badgeEl.style.transform = "scale(1)";
    }, 200);
}

// =================== Modal ===================
function openAbsensiModal(noLapak, namaLapak) {
    currentLapakId = noLapak;
    const modal = document.getElementById("absensiModal");
    const info = document.getElementById("absensiInfo");
    const statusLabel = document.getElementById("modalStatusLabel");
    const container = document.querySelector(".container");
    if (!modal || !info || !container || !statusLabel) return;

    const lapak = lapakData.find(l => String(l.noLapak) === String(noLapak));
    const status = String(lapak?.statusAbsensi || "").toLowerCase();

    info.textContent = `Absen untuk Lapak ${noLapak} - ${namaLapak}`;

    let badgeHTML = '<span class="badge bg-danger">Belum Absen</span>';
    if (status.includes("hadir")) badgeHTML = '<span class="badge bg-success">Sudah Absen</span>';
    else if (status.includes("izin")) badgeHTML = '<span class="badge bg-warning">Izin</span>';

    statusLabel.innerHTML = badgeHTML;

    container.classList.add("blur");
    document.body.classList.add("modal-open");
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);

    updateModalButtons(); // <-- update tombol sesuai status
    updateBlurOnScroll();
}
if (absensiKategoriSelect) {
    absensiKategoriSelect.addEventListener("change", () => {
        updateModalButtons(); // otomatis cek status lapak saat kategori ganti
    });
}
if (modalAbsenBtn) modalAbsenBtn.addEventListener("click", async () => {
    if (!currentLapakId) return;

    const lapak = lapakData.find(l => String(l.noLapak) === String(currentLapakId));
    if (String(lapak?.statusAbsensi || "").toLowerCase().includes("izin")) {
        showToast("Lapak ini sudah melakukan izin, tidak bisa absen.", "error");
        return;
    }

    await absenLapak(currentLapakId);
    closeAbsensiModal();
});

function closeAbsensiModal() {
    const modal = document.getElementById("absensiModal");
    const container = document.querySelector(".container");
    if (!modal || !container) return;

    modal.classList.remove("show");
    container.classList.remove("blur");
    container.style.filter = "";
    document.body.classList.remove("modal-open");

    setTimeout(() => { if (!modal.classList.contains("show")) modal.style.display = "none"; }, 250);
    lastScrollY = 0;
}
function updateModalButtons() {
    if (!currentLapakId) return;

    const lapak = lapakData.find(l => String(l.noLapak) === String(currentLapakId));
    const status = String(lapak?.statusAbsensi || "").toLowerCase();
    const kategori = absensiKategoriSelect?.value || "berangkat";

    if (kategori === "berangkat") {
        // Jika sudah izin, tombol absen dinonaktifkan
        if (status.includes("izin")) {
            modalAbsenBtn.disabled = true;
            modalAbsenBtn.title = "Lapak ini sudah melakukan izin, tidak bisa absen";
        } else {
            modalAbsenBtn.disabled = false;
            modalAbsenBtn.title = "";
        }

        modalAbsenBtn.classList.remove("d-none");
        modalIzinBtn.classList.add("d-none");
    } else if (kategori === "izin") {
        modalIzinBtn.classList.remove("d-none");
        modalAbsenBtn.classList.add("d-none");
    }
}
function updateModalStatusLabel() {
    const statusLabel = document.getElementById("modalStatusLabel");
    if (!statusLabel || !currentLapakId) return;

    const lapak = lapakData.find(l => String(l.noLapak) === String(currentLapakId));
    const kategori = absensiKategoriSelect?.value || "berangkat";
    let status = String(lapak?.statusAbsensi || "").toLowerCase();

    let badgeHTML = '<span class="badge bg-danger">Belum Absen</span>';
    if (kategori === "berangkat") {
        if (status.includes("hadir")) badgeHTML = '<span class="badge bg-success">Sudah Absen</span>';
        else if (status.includes("izin")) badgeHTML = '<span class="badge bg-warning">Izin</span>';
    } else if (kategori === "izin") {
        if (status.includes("izin")) badgeHTML = '<span class="badge bg-warning">Izin</span>';
        else if (status.includes("hadir")) badgeHTML = '<span class="badge bg-success">Sudah Absen</span>';
    }

    animateBadgeChange(statusLabel, badgeHTML);
}
// =================== Absen & Hapus Absensi ===================
async function absenLapak(noLapak) {
    showAbsensiLoading(true, "Menyimpan absensi...");
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "absen", noLapak, password: "panitia123" })
        });
        const json = await res.json();
        if (!json.success) showToast(json.message || "Gagal menyimpan absensi.", "error");
        else {
            const lapakIndex = lapakData.findIndex(l => String(l.noLapak) === String(noLapak));
            if (lapakIndex > -1) lapakData[lapakIndex].statusAbsensi = "✅ Hadir";
            renderLapak(lapakData);
            updateSummary();
            updateAbsensiInfo();
            updateModalStatusLabel(); // badge animasi
            showToast(`Absensi Lapak ${noLapak} berhasil disimpan.`, "success");
        }
    } catch {
        showToast("Terjadi kesalahan saat menyimpan absensi.", "error");
    }
    showAbsensiLoading(false);
}
async function hapusAbsensiLapak(noLapak) {
    showAbsensiLoading(true, "Menghapus absensi...");
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "hapusAbsensi", noLapak, password: "panitia123" })
        });
        const json = await res.json();
        if (!json.success) showToast(json.message || "Gagal menghapus absensi.", "error");
        else {
            const lapakIndex = lapakData.findIndex(l => String(l.noLapak) === String(noLapak));
            if (lapakIndex > -1) lapakData[lapakIndex].statusAbsensi = "Belum";
            renderLapak(lapakData);
            updateSummary();
            updateAbsensiInfo();
            updateModalStatusLabel(); // badge animasi
            showToast(`Absensi Lapak ${noLapak} berhasil dihapus.`, "success");
        }
    } catch (err) {
        console.error(err);
        showToast("Terjadi kesalahan saat menghapus absensi.", "error");
    }
    showAbsensiLoading(false);
}

async function hapusIzinLapak(noLapak) {
    showAbsensiLoading(true, "Menghapus izin...");
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "hapusIzin", noLapak, password: "panitia123" })
        });
        const json = await res.json();
        if (!json.success) showToast(json.message || "Gagal menghapus izin.", "error");
        else {
            const lapakIndex = lapakData.findIndex(l => String(l.noLapak) === String(noLapak));
            if (lapakIndex > -1) lapakData[lapakIndex].statusAbsensi = "Belum";
            renderLapak(lapakData);
            updateSummary();
            updateAbsensiInfo();
            updateModalStatusLabel(); // badge animasi
            showToast(`Izin Lapak ${noLapak} berhasil dihapus.`, "success");
        }
    } catch (err) {
        console.error(err);
        showToast("Terjadi kesalahan saat menghapus izin.", "error");
    }
    showAbsensiLoading(false);
}

// =================== Modal Buttons ===================
if (modalAbsenBtn) modalAbsenBtn.addEventListener("click", async () => {
    if (!currentLapakId) return;
    await absenLapak(currentLapakId);
    closeAbsensiModal();
});

const modalHapusBtn = document.getElementById("modalHapusBtn");
if (modalHapusBtn) modalHapusBtn.addEventListener("click", async () => {
    if (!currentLapakId) return;

    const lapak = lapakData.find(l => String(l.noLapak) === String(currentLapakId));
    const namaLapak = lapak?.nama || "Tanpa Nama";
    const kategori = absensiKategoriSelect?.value || "berangkat"; // default berangkat

    const actionText = kategori === "berangkat" ? "absensi" : "izin";

    const result = await Swal.fire({
        title: `Konfirmasi Hapus ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
        html: `
            Kamu akan menghapus ${actionText} untuk:<br><br>
            <strong>Lapak ${currentLapakId} - ${namaLapak}</strong><br><br>
            ${actionText.charAt(0).toUpperCase() + actionText.slice(1)} bisa ditambahkan kembali nanti jika diperlukan.
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Hapus ${actionText}`,
        cancelButtonText: 'Batal',
        customClass: {
            confirmButton: 'btn btn-danger mx-2',
            cancelButton: 'btn btn-secondary mx-2'
        },
        buttonsStyling: false
    });

    if (result.isConfirmed) {
        if (kategori === "berangkat") await hapusAbsensiLapak(currentLapakId);
        else if (kategori === "izin") await hapusIzinLapak(currentLapakId);
        closeAbsensiModal();
    }
});


// =================== Dark mode ===================
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
    darkSwitch.checked = true;
}
darkSwitch.addEventListener("change", () => {
    document.body.classList.toggle("dark", darkSwitch.checked);
    localStorage.setItem("darkMode", darkSwitch.checked ? "true" : "false");
});

// =================== Banner info ===================
function updateAbsensiInfo() {
    const banner = document.getElementById("absensiInfoBanner");
    if (!banner) return;

    const total = lapakData.length;
    const totalHadir = lapakData.filter(l => String(l.statusAbsensi || "").toLowerCase().includes("hadir")).length;
    const totalIzin = lapakData.filter(l => String(l.statusAbsensi || "").toLowerCase().includes("izin")).length;
    const totalBelum = total - totalHadir - totalIzin;

    if (total > 0 && totalBelum === 0) {
        banner.style.display = "none";
        return;
    }

    banner.style.display = "block";
    banner.className = "alert alert-info text-center mb-3";
    banner.innerHTML = `
        ℹ️ Status Absensi Hari Ini: 
        ✅ Hadir: ${totalHadir} | 
        📝 Izin: ${totalIzin} | 
        ❌ Belum: ${totalBelum}.
        ${absensiMingguan ? "<br>Absensi bisa dilakukan setiap MINGGU." : "<br>Absensi bisa dilakukan setiap HARI."}
    `;
}
//update kategori
if (absensiKategoriSelect) {
    absensiKategoriSelect.addEventListener("change", () => {
        const kategori = absensiKategoriSelect.value;
        if (kategori === "berangkat") {
            modalAbsenBtn.classList.remove("d-none");
            modalIzinBtn.classList.add("d-none");
        } else {
            modalAbsenBtn.classList.add("d-none");
            modalIzinBtn.classList.remove("d-none");
        }
    });
}

if (modalAbsenBtn) modalAbsenBtn.addEventListener("click", async () => {
    if (!currentLapakId) return;
    await absenLapak(currentLapakId);
    closeAbsensiModal();
});

if (modalIzinBtn) modalIzinBtn.addEventListener("click", async () => {
    if (!currentLapakId) return;
    await izinLapak(currentLapakId);
    closeAbsensiModal();
});

// =================== Summary ===================
function updateSummary() {
    const total = lapakData.length;
    const totalHadir = lapakData.filter(l => String(l.statusAbsensi || "").toLowerCase().includes("hadir")).length;
    const totalIzin = lapakData.filter(l => String(l.statusAbsensi || "").toLowerCase().includes("izin")).length;
    const totalBelum = total - totalHadir - totalIzin;

    const persenHadir = total > 0 ? Math.round((totalHadir / total) * 100) : 0;
    const persenIzin = total > 0 ? Math.round((totalIzin / total) * 100) : 0;
    const persenBelum = 100 - persenHadir - persenIzin;

    const summaryEl = document.getElementById("lapakSummary");
    if (!summaryEl) return;

    summaryEl.innerHTML = `
        <div class="summary-card total">
            <div class="label">Total Lapak</div>
            <div class="value">${total}</div>
        </div>
        <div class="summary-card hadir">
            <div class="label">✅ Hadir</div>
            <div class="value">${totalHadir}</div>
            <div class="extra">(${persenHadir}%)</div>
        </div>
        <div class="summary-card izin">
            <div class="label">📝 Izin</div>
            <div class="value">${totalIzin}</div>
            <div class="extra">(${persenIzin}%)</div>
        </div>
        <div class="summary-card belum">
            <div class="label">❌ Belum</div>
            <div class="value">${totalBelum}</div>
            <div class="extra">(${persenBelum}%)</div>
        </div>
        <div class="summary-progress mt-3">
            <div class="progress" style="height: 20px; border-radius: 10px; overflow: hidden;">
                <div class="progress-bar bg-success" style="width: ${persenHadir}%">${persenHadir > 15 ? persenHadir + "%" : ""}</div>
                <div class="progress-bar bg-warning" style="width: ${persenIzin}%">${persenIzin > 15 ? persenIzin + "%" : ""}</div>
                <div class="progress-bar bg-danger" style="width: ${persenBelum}%">${persenBelum > 15 ? persenBelum + "%" : ""}</div>
            </div>
        </div>
    `;
}

// =================== Blur on scroll ===================
function updateBlurOnScroll() {
    const container = document.querySelector(".container");
    const modal = document.getElementById("absensiModal");
    if (!container || !modal) return;

    if (modal.classList.contains("show")) {
        const scrollY = window.scrollY || window.pageYOffset;
        const diff = Math.abs(scrollY - lastScrollY);
        container.style.filter = `blur(${6 + diff * 0.02}px)`;
        lastScrollY = scrollY;
    } else {
        container.style.filter = '';
        lastScrollY = 0;
    }
}
window.addEventListener("scroll", updateBlurOnScroll);

// =================== Search ===================
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = lapakData.filter(l => {
            const noLapak = String(l.noLapak).toLowerCase();
            const nama = (l.nama || "").toLowerCase();
            return noLapak.includes(query) || nama.includes(query);
        });
        currentPage = 1;
        renderLapak(filtered);

        if (filtered.length === 0) {
            const container = document.getElementById("lapakContainer");
            container.innerHTML = `<p class="text-center text-warning">Tidak ada lapak yang sesuai dengan kata kunci "${searchInput.value}".</p>`;
            if (lapakPageSelect) lapakPageSelect.innerHTML = "";
        }
    });
}
async function izinLapak(noLapak) {
    showAbsensiLoading(true, "Menyimpan izin...");
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "izin", noLapak, password: "panitia123" })
        });
        const json = await res.json();
        if (!json.success) showToast(json.message || "Gagal menyimpan izin.", "error");
        else {
            const lapakIndex = lapakData.findIndex(l => String(l.noLapak) === String(noLapak));
            if (lapakIndex > -1) lapakData[lapakIndex].statusAbsensi = "📝 Izin";
            renderLapak(lapakData);
            updateSummary();
            updateAbsensiInfo();
            updateModalStatusLabel(); // badge animasi
            showToast(`Izin Lapak ${noLapak} berhasil disimpan.`, "success");
        }
    } catch {
        showToast("Terjadi kesalahan saat menyimpan izin.", "error");
    }
    showAbsensiLoading(false);
}

// =================== Load pertama kali ===================
loadLapak();
