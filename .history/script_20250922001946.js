const API_URL = "https://script.google.com/macros/s/AKfycby4z2qZ24SrJkcyGpybH29lSUC_3_z1LG-7wSmTzpaOEXrwjXf0Cl3hqkg95qAxPj1-/exec";
let lapakData = [];
let currentLapakId = null;

// Cek hari
const isSunday = new Date().getDay() === 0; // 0 = Minggu

// Load semua lapak
async function loadLapak() {
    try {
        const res = await fetch(API_URL + "?
        const json = await raction=allLapak"); // ganti endpoint ke allLapakes.json();
        if (!json.success) {
            alert(json.message);
            return;
        }
        lapakData = json.data;
        renderLapak(lapakData);
    } catch (err) {
        alert("Error loadLapak: " + err);
    }
}

// Render card lapak
function renderLapak(data) {
    const container = document.getElementById("lapakContainer");
    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = `<p class="text-center">Tidak ada data lapak.</p>`;
        return;
    }

    data.forEach(lapak => {
        const statusHadir = lapak.statusAbsensi.includes("✅");

        const card = document.createElement("div");
        card.className = "col-md-4 col-sm-6 mb-3";
        card.innerHTML = `
            <div class="card lapak-card shadow-sm ${statusHadir ? 'disabled' : ''}" 
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
            if (isSunday) {
                // klik → buka modal
                cardEl.addEventListener("click", () => openAbsensiModal(lapak.noLapak, lapak.nama));

                // double click → absen langsung
                cardEl.addEventListener("dblclick", () => absenLapak(lapak.noLapak));
            } else {
                // hari selain Minggu → nonaktifkan absen
                cardEl.style.cursor = "not-allowed";
            }
        }

        container.appendChild(card);
    });
}

// Modal
function openAbsensiModal(lapakId, lapakName) {
    const modal = document.getElementById("absensiModal");
    const info = document.getElementById("absensiInfo");
    currentLapakId = lapakId;
    if (info) info.textContent = `Absensi untuk Lapak ${lapakId} - ${lapakName}`;
    modal.style.display = "flex";
}
function closeAbsensiModal() {
    const modal = document.getElementById("absensiModal");
    if (modal) modal.style.display = "none";
}

// Loader
function showAbsensiLoading(show, text = "Sedang menyimpan data...") {
    const loader = document.getElementById("absensiLoading");
    const loadingText = document.getElementById("absensiLoadingText");
    if (!loader || !loadingText) return;
    if (show) {
        loader.style.display = "flex";
        loadingText.textContent = text;
    } else {
        loader.style.display = "none";
    }
}

// Absen dari modal
document.getElementById("modalAbsenBtn").addEventListener("click", () => {
    if (currentLapakId) absenLapak(currentLapakId);
    closeAbsensiModal();
});

// Fungsi absen optimistik + refresh otomatis
async function absenLapak(noLapak) {
    if (!isSunday) {
        alert("❌ Absensi hanya bisa dilakukan hari Minggu.");
        return;
    }

    const card = document.querySelector(`.lapak-card[data-no-lapak="${noLapak}"]`);
    if (!card) return;
    const statusText = card.querySelector(".status-text");

    const oldText = statusText.textContent;
    const oldClass = statusText.className;

    // Optimistik UI
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
            // rollback UI jika gagal
            statusText.textContent = oldText;
            statusText.className = oldClass;
            card.classList.remove("disabled");
            alert(json.message || "❌ Gagal menyimpan absensi.");
        } else {
            // Refresh otomatis
            const lapakIndex = lapakData.findIndex(l => String(l.noLapak) === String(noLapak));
            if (lapakIndex > -1) {
                lapakData[lapakIndex].statusAbsensi = "✅ Hadir";
                renderLapak(lapakData);
            }
        }
    } catch (err) {
        statusText.textContent = oldText;
        statusText.className = oldClass;
        card.classList.remove("disabled");
        alert("❌ Gagal menyimpan absensi.");
    }
}

// Search filter
document.getElementById("searchInput").addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = lapakData.filter(l =>
        l.noLapak.toString().toLowerCase().includes(keyword) ||
        l.nama.toLowerCase().includes(keyword)
    );
    renderLapak(filtered);
});

// Load pertama
loadLapak();
