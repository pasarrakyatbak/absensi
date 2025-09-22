// =================== Config ===================
const API_URL = "https://script.google.com/macros/s/AKfycby4z2qZ24SrJkcyGpybH29lSUC_3_z1LG-7wSmTzpaOEXrwjXf0Cl3hqkg95qAxPj1-/exec";
const LAPAK_PER_PAGE = 10;

let lapakData = [];
let currentLapakId = null;
let absensiMingguan = false;
let currentPage = 1;
let lastScrollY = 0;

// =================== DOM Elements ===================
const darkSwitch = document.getElementById("darkSwitch");
const lapakPageSelect = document.getElementById("lapakPageSelect");
const searchInput = document.getElementById("searchInput");
const modalAbsenBtn = document.getElementById("modalAbsenBtn");
const modalHapusBtn = document.getElementById("modalHapusBtn");

// =================== Loader ===================
function showAbsensiLoading(show, text = "Sedang menyimpan data...") {
    const loader = document.getElementById("absensiLoading");
    const loadingText = document.getElementById("absensiLoadingText");
    if (!loader || !loadingText) return;
    loader.style.display = show ? "flex" : "none";
    loadingText.textContent = text;
}

// =================== Load Lapak ===================
async function loadLapak() {
    const container = document.getElementById("lapakContainer");
    if (!container) return;

    showAbsensiLoading(true, "Sedang memuat data lapak...");

    try {
        const res = await fetch(API_URL + "?action=lapakHariIni");
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        const json = await res.json();
        console.log("Response API loadLapak:", json);

        if (!json.success) {
            container.innerHTML = `<p class="text-center text-danger">Gagal load data: ${json.message || 'Unknown error'}</p>`;
            return;
        }

        lapakData = Array.isArray(json.data) ? json.data : [];
        currentPage = 1;

        if (!lapakData.length) {
            container.innerHTML = `<p class="text-center">Tidak ada data lapak.</p>`;
        } else {
            renderLapak(lapakData);
        }

        updateSummary();
        updateAbsensiInfo();

    } catch (err) {
        console.error("Error loadLapak:", err);
        container.innerHTML = `<p class="text-center text-danger">Error saat load data: ${err.message}</p>`;
    } finally {
        showAbsensiLoading(false);
    }
}

// =================== Render Lapak ===================
function renderLapak(data) {
    const container = document.getElementById("lapakContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
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
        const noLapak = lapak?.noLapak ?? "-";
        const namaLapak = lapak?.nama ?? "Tanpa Nama";
        const status = String(lapak?.statusAbsensi || "").toLowerCase();
        const hadir = status.includes("hadir");

        const card = document.createElement("div");
        card.className = "col-md-4 col-sm-6 mb-3";

        card.innerHTML = `
        <div class="card lapak-card shadow-sm ${hadir ? 'hadir' : 'belum'}"
             data-no-lapak="${noLapak}" data-nama-lapak="${namaLapak}">
            
            <span class="lapak-badge ${hadir ? 'bg-success' : 'bg-danger'}">
                ${hadir ? 'Sudah Absen' : 'Belum Absen'}
            </span>

            <div class="card-body text-center">
                <h5 class="card-title">Lapak ${noLapak}</h5>
                <p class="card-text">${namaLapak.split('(')[0].trim()}</p>
                <p class="card-subtext">(${namaLapak.split('(')[1]?.replace(')', '').trim() || ''})</p>
            </div>
        </div>
        `;

        const cardEl = card.querySelector(".lapak-card");
        if (cardEl) {
            cardEl.addEventListener("click", () => openAbsensiModal(noLapak, namaLapak));
        }

        container.appendChild(card);
    });
}

// =================== Page Change ===================
if (lapakPageSelect) {
    lapakPageSelect.addEventListener("change", () => {
        currentPage = parseInt(lapakPageSelect.value) || 1;
        renderLapak(lapakData);
    });
}

// =================== Search ===================
if (searchInput) {
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = lapakData.filter(l => {
            return String(l.noLapak).toLowerCase().includes(query) ||
                (l.nama || "").toLowerCase().includes(query);
        });
        currentPage = 1;
        renderLapak(filtered);
    });
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
    const hadir = String(lapak?.statusAbsensi || "").toLowerCase().includes("hadir");

    info.textContent = `Absen untuk Lapak ${noLapak} - ${namaLapak}`;
    statusLabel.innerHTML = hadir
        ? '<span class="badge bg-success">Sudah Absen</span>'
        : '<span class="badge bg-danger">Belum Absen</span>';

    container.classList.add("blur");
    document.body.classList.add("modal-open");
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);
    updateBlurOnScroll();
}

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

// =================== Absen / Hapus ===================
async function absenLapak(noLapak) {
    showAbsensiLoading(true, "Menyimpan absensi...");
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "absen", noLapak, password: "panitia123" })
        });
        const json = await res.json();
        if (!json.success) alert(json.message || "❌ Gagal menyimpan absensi.");
        else {
            const lapakIndex = lapakData.findIndex(l => String(l.noLapak) === String(noLapak));
            if (lapakIndex > -1) lapakData[lapakIndex].statusAbsensi = "✅ Hadir";
            renderLapak(lapakData);
            updateSummary();
            updateAbsensiInfo();
        }
    } catch (err) { alert("❌ Gagal menyimpan absensi."); }
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
        if (!json.success) alert(json.message || "❌ Gagal menghapus absensi.");
        else {
            const lapakIndex = lapakData.findIndex(l => String(l.noLapak) === String(noLapak));
            if (lapakIndex > -1) lapakData[lapakIndex].statusAbsensi = "❌ Belum";
            renderLapak(lapakData);
            updateSummary();
            updateAbsensiInfo();
            alert(json.message || "✅ Absensi dihapus.");
        }
    } catch (err) { alert("❌ Gagal menghapus absensi."); }
    showAbsensiLoading(false);
}

// =================== Modal Buttons ===================
if (modalAbsenBtn) modalAbsenBtn.addEventListener("click", async () => {
    if (!currentLapakId) return;
    await absenLapak(currentLapakId);
    closeAbsensiModal();
});

if (modalHapusBtn) modalHapusBtn.addEventListener("click", async () => {
    if (!currentLapakId) return;
    if (confirm("Apakah Anda yakin ingin menghapus absensi lapak ini?")) {
        await hapusAbsensiLapak(currentLapakId);
        closeAbsensiModal();
    }
});

// =================== Dark Mode ===================
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
    if (darkSwitch) darkSwitch.checked = true;
}
if (darkSwitch) {
    darkSwitch.addEventListener("change", () => {
        document.body.classList.toggle("dark", darkSwitch.checked);
        localStorage.setItem("darkMode", darkSwitch.checked ? "true" : "false");
    });
}

// =================== Banner Info ===================
function updateAbsensiInfo() {
    const banner = document.getElementById("absensiInfoBanner");
    if (!banner) return;
    const totalLapak = lapakData.length;
    const totalHadir = lapakData.filter(l => String(l.statusAbsensi || "").toLowerCase().includes("hadir")).length;

    if (totalLapak > 0 && totalLapak === totalHadir) {
        banner.style.display = "none";
        return;
    }

    banner.style.display = "block";
    banner.className = "alert alert-info text-center mb-3";
    banner.textContent = absensiMingguan
        ? "ℹ️ Absensi bisa dilakukan setiap MINGGU."
        : "ℹ️ Absensi bisa dilakukan setiap HARI.";
}

// =================== Summary ===================
function updateSummary() {
    const total = lapakData.length;
    const totalHadir = lapakData.filter(l => String(l.statusAbsensi || "").toLowerCase().includes("hadir")).length;
    const totalBelum = total - totalHadir;
    const persenHadir = total > 0 ? Math.round((totalHadir / total) * 100) : 0;
    const persenBelum = 100 - persenHadir;

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
        <div class="summary-card belum">
            <div class="label">❌ Belum</div>
            <div class="value">${totalBelum}</div>
            <div class="extra">(${persenBelum}%)</div>
        </div>
        <div class="summary-progress mt-3">
            <div class="progress" style="height: 20px; border-radius: 10px; overflow: hidden;">
                <div class="progress-bar bg-success" role="progressbar"
                    style="width: ${persenHadir}%"
                    aria-valuenow="${persenHadir}" aria-valuemin="0" aria-valuemax="100">
                    ${persenHadir > 15 ? persenHadir + "%" : ""}
                </div>
                <div class="progress-bar bg-danger" role="progressbar"
                    style="width: ${persenBelum}%"
                    aria-valuenow="${persenBelum}" aria-valuemin="0" aria-valuemax="100">
                    ${persenBelum > 15 ? persenBelum + "%" : ""}
                </div>
            </div>
        </div>
    `;
}

// =================== Blur on Scroll ===================
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

// =================== Load pertama kali ===================
document.addEventListener("DOMContentLoaded", () => {
    loadLapak();
});
