const API_URL = "https://script.google.com/macros/s/AKfycby4z2qZ24SrJkcyGpybH29lSUC_3_z1LG-7wSmTzpaOEXrwjXf0Cl3hqkg95qAxPj1-/exec";
const darkSwitch = document.getElementById("darkSwitch");
let lapakData = [];
let currentLapakId = null;
let absensiMingguan = false;
let lastScrollY = 0;
let currentPage = 1;
const itemsPerPage = 10;

// =================== Loader ===================
function showAbsensiLoading(show, text = "Sedang menyimpan data...") {
    const loader = document.getElementById("absensiLoading");
    const loadingText = document.getElementById("absensiLoadingText");
    if (!loader || !loadingText) return;

    loader.classList.toggle("d-flex", show);
    loader.classList.toggle("d-none", !show);
    loadingText.textContent = text;
}

// =================== Render daftar lapak ===================
function renderLapak(data) {
    const container = document.getElementById("lapakContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = `<p class="text-center text-muted">Tidak ada lapak ditemukan.</p>`;
        return;
    }

    data.forEach(lapak => {
        const col = document.createElement("div");
        col.className = "col-md-4";
        col.innerHTML = `
            <div class="card lapak-card mb-3 p-3" data-no-lapak="${lapak.noLapak}" style="cursor:pointer;">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="card-title mb-0">Lapak ${lapak.noLapak}</h5>
                    <span class="badge ${lapak.statusAbsensi === '✅ Hadir' ? 'bg-success' : 'bg-danger'}">
                        ${lapak.statusAbsensi || 'Belum Absen'}
                    </span>
                </div>
                <p class="card-text mb-1"><strong>Nama:</strong> ${lapak.nama || '-'}</p>
                <p class="card-text"><strong>Barang:</strong> ${lapak.barang || '-'}</p>
            </div>
        `;
        col.querySelector(".lapak-card").addEventListener("click", () => {
            openAbsensiModal(lapak.noLapak, lapak.nama || '');
        });
        container.appendChild(col);
    });
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
        renderLapakPage(lapakData, 1);
        updateSummary();
        updateAbsensiInfo();
        showAbsensiLoading(false);
    } catch (err) {
        document.getElementById("lapakContainer").innerHTML =
            `<p class="text-center text-danger">Error loadLapak: ${err}</p>`;
        showAbsensiLoading(false);
    }
}

// =================== Render lapak per page ===================
function renderLapakPage(data, page = 1) {
    const totalPages = Math.ceil(data.length / itemsPerPage);
    currentPage = page;

    // Update dropdown
    const pageSelect = document.getElementById("lapakPageSelect");
    if (pageSelect) {
        pageSelect.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const start = (i - 1) * itemsPerPage + 1;
            const end = Math.min(i * itemsPerPage, data.length);
            const option = document.createElement("option");
            option.value = i;
            option.textContent = `${start}-${end}`;
            if (i === page) option.selected = true;
            pageSelect.appendChild(option);
        }
        pageSelect.onchange = () => renderLapakPage(data, parseInt(pageSelect.value));
    }

    const startIndex = (page - 1) * itemsPerPage;
    const pagedData = data.slice(startIndex, startIndex + itemsPerPage);
    renderLapak(pagedData);
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
    const hadir = lapak?.statusAbsensi === "✅ Hadir";

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

    setTimeout(() => {
        if (!modal.classList.contains("show")) modal.style.display = "none";
    }, 250);

    lastScrollY = 0;
}

// =================== Absen ke server ===================
async function absenLapak(noLapak) {
    showAbsensiLoading(true, "Menyimpan absensi...");

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "absen", noLapak, password: "panitia123" })
        });
        const json = await res.json();

        if (!json.success) {
            alert(json.message || "❌ Gagal menyimpan absensi.");
        } else {
            const lapakIndex = lapakData.findIndex(l => String(l.noLapak) === String(noLapak));
            if (lapakIndex > -1) lapakData[lapakIndex].statusAbsensi = "✅ Hadir";
            renderLapak(lapakData);
            updateSummary();
            updateAbsensiInfo();
        }
    } catch (err) {
        alert("❌ Gagal menyimpan absensi.");
    }

    showAbsensiLoading(false);
}

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

    const totalLapak = lapakData.length;
    const totalHadir = lapakData.filter(l => l.statusAbsensi === "✅ Hadir").length;

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
    const totalHadir = lapakData.filter(l => l.statusAbsensi === "✅ Hadir").length;
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

// =================== Tombol Absen Modal ===================
const modalAbsenBtn = document.getElementById("modalAbsenBtn");
if (modalAbsenBtn) {
    modalAbsenBtn.addEventListener("click", async () => {
        if (!currentLapakId) return;
        await absenLapak(currentLapakId);
        closeAbsensiModal();
    });
}

// =================== Blur dinamis scroll ===================
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

// =================== Search Lapak ===================
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = lapakData.filter(lapak => {
            return String(lapak.noLapak).toLowerCase().includes(query) ||
                (lapak.nama || "").toLowerCase().includes(query);
        });
        renderLapakPage(filtered, 1); // selalu mulai dari halaman 1
    });
}

// =================== Load pertama kali ===================
loadLapak();
