const API_URL = "https://script.google.com/macros/s/AKfycby4z2qZ24SrJkcyGpybH29lSUC_3_z1LG-7wSmTzpaOEXrwjXf0Cl3hqkg95qAxPj1-/exec";
const darkSwitch = document.getElementById("darkSwitch");
let lapakData = [];
let currentLapakId = null;

// =================== Konfigurasi ===================
const HANYA_MINGGU = ; // 🔄 ubah true = hanya Minggu, false = setiap hari
const today = new Date();
const isSunday = today.getDay() === 0; // 0 = Minggu

// =================== Loader ===================
function showAbsensiLoading(show, text = "Sedang menyimpan data...") {
    const loader = document.getElementById("absensiLoading");
    const loadingText = document.getElementById("absensiLoadingText");
    if (!loader || !loadingText) return;

    if (show) {
        loader.classList.remove("d-none");
        loader.classList.add("d-flex");
    } else {
        loader.classList.remove("d-flex");
        loader.classList.add("d-none");
    }
    loadingText.textContent = text;
}

// =================== Load semua lapak ===================
async function loadLapak() {
    showAbsensiLoading(true, "Sedang memuat data lapak...");

    try {
        const res = await fetch(API_URL + "?action=listLapak");
        const json = await res.json();

        if (!json.success) {
            document.getElementById("lapakContainer").innerHTML =
                `<p class="text-center text-danger">Gagal load data: ${json.message}</p>`;
            showAbsensiLoading(false);
            return;
        }

        lapakData = json.data.map(lapak => ({
            noLapak: lapak.no || "-",
            nama: lapak.nama || "Tanpa Nama",
            statusAbsensi: lapak.statusAbsensi || ""
        }));

        renderLapak(lapakData);
        updateSummary();
        updateAbsensiInfo();
        showAbsensiLoading(false);

    } catch (err) {
        document.getElementById("lapakContainer").innerHTML =
            `<p class="text-center text-danger">Error loadLapak: ${err}</p>`;
        showAbsensiLoading(false);
    }
}

// =================== Render lapak ===================
function renderLapak(data) {
    const container = document.getElementById("lapakContainer");
    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = `<p class="text-center">Tidak ada data lapak.</p>`;
        return;
    }

    data.forEach(lapak => {
        const statusHadir = (lapak.statusAbsensi || "").includes("✅");

        const card = document.createElement("div");
        card.className = "col-md-4 col-sm-6 mb-3";
        card.innerHTML = `
            <div class="card lapak-card shadow-sm ${statusHadir ? 'hadir' : 'belum'} ${statusHadir ? 'disabled' : ''}" 
                 data-no-lapak="${lapak.noLapak}" data-nama-lapak="${lapak.nama}">
                <div class="card-body text-center">
                    <h5 class="card-title">Lapak ${lapak.noLapak}</h5>
                    <p class="card-text">${lapak.nama}</p>
                    <p class="status-text ${statusHadir ? 'text-success' : 'text-danger'}">
                        ${statusHadir ? "✅ Hadir" : "❌ Belum"}
                    </p>
                </div>
            </div>
        `;

        const cardEl = card.querySelector(".lapak-card");

        if (!statusHadir && cardEl) {
            if (!HANYA_MINGGU || isSunday) {
                // absensi aktif
                cardEl.addEventListener("click", () => openAbsensiModal(lapak.noLapak, lapak.nama));
                cardEl.addEventListener("dblclick", () => absenLapak(lapak.noLapak));
            } else {
                // absensi non-aktif
                cardEl.style.cursor = "not-allowed";
            }
        }

        container.appendChild(card);
    });
}

// =================== Absen ke server ===================
async function absenLapak(noLapak) {
    if (HANYA_MINGGU && !isSunday) {
        alert("❌ Absensi hanya bisa dilakukan hari Minggu.");
        return;
    }

    showAbsensiLoading(true, "Menyimpan absensi...");

    const card = document.querySelector(`.lapak-card[data-no-lapak="${noLapak}"]`);
    if (!card) {
        showAbsensiLoading(false);
        return;
    }
    const statusText = card.querySelector(".status-text");

    const oldText = statusText.textContent;
    const oldClass = statusText.className;

    // update UI sementara
    statusText.textContent = "✅ Hadir";
    statusText.classList.remove("text-danger");
    statusText.classList.add("text-success");
    card.classList.add("disabled");

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "absen",
                noLapak,
                password: "panitia123"
            })
        });
        const json = await res.json();

        if (!json.success) {
            // rollback kalau gagal
            statusText.textContent = oldText;
            statusText.className = oldClass;
            card.classList.remove("disabled");
            alert(json.message || "❌ Gagal menyimpan absensi.");
        } else {
            const lapakIndex = lapakData.findIndex(l => String(l.noLapak) === String(noLapak));
            if (lapakIndex > -1) {
                lapakData[lapakIndex].statusAbsensi = "✅ Hadir";
                renderLapak(lapakData);
                updateSummary();
                updateAbsensiInfo();
            }
        }
    } catch (err) {
        statusText.textContent = oldText;
        statusText.className = oldClass;
        card.classList.remove("disabled");
        alert("❌ Gagal menyimpan absensi.");
    }

    showAbsensiLoading(false);
}

// =================== Banner Info Absensi ===================
function updateAbsensiInfo() {
    const banner = document.getElementById("absensiInfoBanner");
    if (!banner) return;

    const totalLapak = lapakData.length;
    const totalHadir = lapakData.filter(l => (l.statusAbsensi || "").includes("✅")).length;

    if (totalLapak > 0 && totalLapak === totalHadir) {
        banner.style.display = "none"; // semua hadir, sembunyikan
        return;
    }

    banner.style.display = "block";
    if (HANYA_MINGGU) {
        if (isSunday) {
            banner.className = "alert alert-success text-center mb-3";
            banner.textContent = "✅ Absensi AKTIF hari ini (Minggu)";
        } else {
            banner.className = "alert alert-warning text-center mb-3";
            banner.textContent = "⚠️ Absensi hanya dibuka setiap Minggu.";
        }
    } else {
        banner.className = "alert alert-info text-center mb-3";
        banner.textContent = "ℹ️ Absensi bisa dilakukan setiap hari.";
    }
}

// =================== Summary ===================
function updateSummary() {
    const total = lapakData.length;
    const totalHadir = lapakData.filter(l => (l.statusAbsensi || "").includes("✅")).length;
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
    `;

    const progressContainer = document.createElement("div");
    progressContainer.className = "summary-progress mt-3";
    progressContainer.innerHTML = `
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
    `;
    summaryEl.appendChild(progressContainer);
}

// =================== Load pertama kali ===================
loadLapak();
