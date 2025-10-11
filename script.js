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

    let existingToast = Array.from(container.children).find(toast =>
        toast.querySelector("span")?.textContent === message
    );

    if (existingToast) {
        clearTimeout(existingToast.dismissTimer);
        existingToast.dismissTimer = setTimeout(() => existingToast.remove(), duration);
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span><button class="toast-close">&times;</button>`;
    container.appendChild(toast);

    toast.querySelector(".toast-close").addEventListener("click", () => {
        clearTimeout(toast.dismissTimer);
        toast.remove();
    });

    setTimeout(() => toast.classList.add("show"), 50);
    toast.dismissTimer = setTimeout(() => toast.remove(), duration);
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
            badgeClass = "bg-izin";  // badge warna kuning cerah
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

// =================== Animate badge ===================
function animateBadgeChange(badgeEl, newHTML) {
    if (!badgeEl) return;
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
    else if (status.includes("izin")) badgeHTML = '<span class="badge bg-izin">Izin</span>';

    statusLabel.innerHTML = badgeHTML;

    // === Set dropdown sesuai status ===
    if (status.includes("izin")) {
        absensiKategoriSelect.value = "izin";
    } else {
        absensiKategoriSelect.value = "berangkat";
    }
    container.classList.add("blur");
    document.body.classList.add("modal-open");
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);

    updateModalButtons();
    updateBlurOnScroll();
}

if (absensiKategoriSelect) {
    absensiKategoriSelect.addEventListener("change", () => updateModalButtons());
}

// =================== Modal Buttons ===================
function updateModalButtons() {
    if (!currentLapakId) return;
    const lapak = lapakData.find(l => String(l.noLapak) === String(currentLapakId));
    const status = String(lapak?.statusAbsensi || "").toLowerCase();
    const kategori = absensiKategoriSelect?.value || "berangkat";

    if (kategori === "berangkat") {
        // Absen disabled kalau sudah hadir ATAU sudah izin
        modalAbsenBtn.disabled = status.includes("hadir") || status.includes("izin");
        modalAbsenBtn.classList.remove("d-none");
        modalIzinBtn.classList.add("d-none");
    } else {
        // Izin disabled kalau sudah izin ATAU sudah hadir
        modalIzinBtn.disabled = status.includes("izin") || status.includes("hadir");
        modalIzinBtn.classList.remove("d-none");
        modalAbsenBtn.classList.add("d-none");
    }
    // Atur tombol Hapus
    if (kategori === "berangkat") {
        // Hapus absen hanya aktif kalau status hadir
        modalHapusBtn.disabled = !status.includes("hadir");
    } else {
        // Hapus izin hanya aktif kalau status izin
        modalHapusBtn.disabled = !status.includes("izin");
    }
}

function updateModalStatusLabel() {
    const statusLabel = document.getElementById("modalStatusLabel");
    if (!statusLabel || !currentLapakId) return;

    const lapak = lapakData.find(l => String(l.noLapak) === String(currentLapakId));
    const status = String(lapak?.statusAbsensi || "").toLowerCase();

    let badgeHTML = '<span class="badge bg-danger">Belum Absen</span>';
    if (status.includes("hadir")) badgeHTML = '<span class="badge bg-success">Sudah Absen</span>';
    else if (status.includes("izin")) badgeHTML = '<span class="badge bg-izin">Izin</span>';

    animateBadgeChange(statusLabel, badgeHTML);
}

// =================== Close Modal ===================
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

// =================== Absensi/Izin/Hapus ===================
async function updateStatusLapak(noLapak, action, newStatus, successAction, failAction) {
    const isDelete = action.includes("hapus");
    showAbsensiLoading(true, `${isDelete ? "Menghapus" : "Menyimpan"} ${successAction.toLowerCase()}...`);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action, noLapak, password: "panitia123" })
        });
        const json = await res.json();

        if (!json.success) {
            showToast(json.message || failAction, "error");
        } else {
            const lapakIndex = lapakData.findIndex(l => String(l.noLapak) === String(noLapak));
            if (lapakIndex > -1) lapakData[lapakIndex].statusAbsensi = newStatus;

            renderLapak(lapakData);
            updateSummary();
            updateAbsensiInfo();
            updateModalStatusLabel();
            showToast(`${successAction} Lapak ${noLapak} berhasil.`, "success");
        }
    } catch (err) {
        console.error(err);
        showToast(`Terjadi kesalahan saat ${failAction.toLowerCase()}.`, "error");
    }
    showAbsensiLoading(false);
}

function absenLapak(noLapak) { return updateStatusLapak(noLapak, "absen", "✅ Hadir", "Absensi", "Gagal menyimpan absensi"); }
function hapusAbsensiLapak(noLapak) { return updateStatusLapak(noLapak, "hapusAbsensi", "Belum", "Penghapusan absensi", "Gagal menghapus absensi"); }
function izinLapak(noLapak) { return updateStatusLapak(noLapak, "izin", "📝 Izin", "Izin", "Gagal menyimpan izin"); }
function hapusIzinLapak(noLapak) { return updateStatusLapak(noLapak, "hapusIzin", "Belum", "Penghapusan izin", "Gagal menghapus izin"); }

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

const modalHapusBtn = document.getElementById("modalHapusBtn");
if (modalHapusBtn) modalHapusBtn.addEventListener("click", async () => {
    if (!currentLapakId) return;
    const lapak = lapakData.find(l => String(l.noLapak) === String(currentLapakId));
    const namaLapak = lapak?.nama || "Tanpa Nama";
    const kategori = absensiKategoriSelect?.value || "berangkat";
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
        customClass: { confirmButton: 'btn btn-danger mx-2', cancelButton: 'btn btn-secondary mx-2' },
        buttonsStyling: false
    });

    if (result.isConfirmed) {
        if (kategori === "berangkat") await hapusAbsensiLapak(currentLapakId);
        else await hapusIzinLapak(currentLapakId);
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
        ❌ Tidak Hadir: ${totalBelum}.
        ${absensiMingguan ? "<br>Absensi bisa dilakukan setiap MINGGU." : "<br>Absensi bisa dilakukan setiap HARI."}
    `;
}

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
            <div class="label">❌ Tidak Hadir</div>
            <div class="value">${totalBelum}</div>
            <div class="extra">(${persenBelum}%)</div>
        </div>
    `;
}

// =================== Scroll blur ===================
function updateBlurOnScroll() {
    const modal = document.getElementById("absensiModal");
    const container = document.querySelector(".container");
    if (!modal || !container) return;

    lastScrollY = window.scrollY;
    container.style.filter = `blur(${Math.min(lastScrollY / 50, 5)}px)`;
}

// =================== Search lapak ===================
const searchInput = document.getElementById("lapakSearchInput");
if (searchInput) {
    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase();
        const filtered = lapakData.filter(l =>
            String(l.noLapak).toLowerCase().includes(keyword) ||
            (l.nama || "").toLowerCase().includes(keyword)
        );
        currentPage = 1;
        renderLapak(filtered);
    });
}

// =================== CSS tambahan ===================
const style = document.createElement("style");
style.innerHTML = `
.bg-izin { background-color: #FFD966; color: #000; }
.lapak-card.izin { border: 2px solid #FFD966; }
`;
document.head.appendChild(style);

// =================== FITUR ABSENSI MASSAL PER HALAMAN ===================
const absenSemuaBtn = document.createElement("button");
absenSemuaBtn.id = "absenSemuaBtn";
absenSemuaBtn.className = "btn btn-primary my-2 w-100";
absenSemuaBtn.textContent = "✅ Absen Semua di Halaman Ini";

const periksaBtn = document.createElement("button");
periksaBtn.id = "periksaBtn";
periksaBtn.className = "btn btn-warning my-2 w-100";
periksaBtn.textContent = "🔍 Periksa Tidak Hadir di Halaman Ini";

const headerContainer = document.querySelector(".sticky-header") || document.body;
headerContainer.appendChild(absenSemuaBtn);
headerContainer.appendChild(periksaBtn);

// === FUNGSI: Ambil data lapak di halaman aktif ===
function getCurrentPageLapak() {
    const startIndex = (currentPage - 1) * LAPAK_PER_PAGE;
    const endIndex = startIndex + LAPAK_PER_PAGE;
    return lapakData.slice(startIndex, endIndex);
}

// === FITUR 1: ABSEN MASSAL (abaikan izin) ===
absenSemuaBtn.addEventListener("click", async () => {
    const currentLapaks = getCurrentPageLapak();

    // Hanya yang belum absen dan bukan izin
    const belumAbsen = currentLapaks.filter(l => {
        const status = String(l.statusAbsensi || "").toLowerCase();
        return status === "" || status === "tidak hadir" || status === "alpha";
    });

    if (!belumAbsen.length) {
        showToast("Semua lapak di halaman ini sudah absen atau izin.", "info");
        return;
    }

    const konfirmasi = await Swal.fire({
        title: "Konfirmasi Absensi Massal",
        html: `
            Akan melakukan absensi otomatis untuk <strong>${belumAbsen.length}</strong> lapak di halaman ini.<br>
            (Lapak dengan status <b>Izin</b> tidak akan diubah)
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Absen Semua",
        cancelButtonText: "Batal",
        customClass: {
            confirmButton: "btn btn-success mx-2",
            cancelButton: "btn btn-secondary mx-2"
        },
        buttonsStyling: false
    });

    if (!konfirmasi.isConfirmed) return;

    showAbsensiLoading(true, "Sedang melakukan absensi massal...");

    for (const lapak of belumAbsen) {
        await absenLapak(lapak.noLapak);
        await new Promise(r => setTimeout(r, 300)); // jeda untuk hindari overload server
    }

    showAbsensiLoading(false);
    showToast(`✅ ${belumAbsen.length} lapak berhasil diabsen otomatis.`, "success");
});

// === FITUR 2: PERIKSA LAPAK TIDAK HADIR ===
periksaBtn.addEventListener("click", () => {
    const currentLapaks = getCurrentPageLapak();

    // Filter lapak yang belum absen atau tidak hadir
    const belumAbsen = currentLapaks.filter(l => {
        const status = String(l.statusAbsensi || "").toLowerCase();
        return (
            status === "" ||
            status.includes("belum") ||
            status.includes("tidak hadir") ||
            status.includes("alpha")
        );
    });

    // === Tampilkan hasil ===
    if (belumAbsen.length === 0) {
        showToast("Semua lapak sudah absen ✅", "success");
    } else {
        const listLapak = belumAbsen.map(l => `• ${l.namaLapak}`).join("<br>");
        showToast(
            `Lapak yang belum absen/tidak hadir:<br>${listLapak}`,
            "warning",
            6000
        );
    }
});

    if (!belumAbsen.length) {
        Swal.fire({
            title: "Semua Hadir atau Izin ✅",
            text: "Tidak ada lapak yang belum absen di halaman ini.",
            icon: "success",
            confirmButtonText: "Oke"
        });
        return;
    }

    const listHTML = belumAbsen.map(
        l => `<li><strong>Lapak ${l.noLapak}</strong> - ${l.nama || "Tanpa Nama"}</li>`
    ).join("");

    Swal.fire({
        title: "❌ Lapak Belum Absen",
        html: `
            <p>Ditemukan <strong>${belumAbsen.length}</strong> lapak yang belum absen di halaman ini:</p>
            <ul style="text-align:left;max-height:200px;overflow-y:auto;">${listHTML}</ul>
        `,
        icon: "warning",
        confirmButtonText: "Tutup"
    });
});

// =================== Inisialisasi ===================
document.addEventListener("DOMContentLoaded", loadLapak);
