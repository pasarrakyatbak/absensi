const API_URL = "PASTE_URL_WEBAPP_DEPLOY"; // ganti sesuai URL WebApp Google Apps Script
let lapakData = [];
let currentLapakId = null;

// Load semua lapak hari ini
async function loadLapak() {
    try {
        const res = await fetch(API_URL + "?action=getLapakHariIni");
        const json = await res.json();
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
        card.className = "col-md-4 col-sm-6";
        card.innerHTML = `
      <div class="card lapak-card shadow-sm ${statusHadir ? 'disabled' : ''}" 
           data-no-lapak="${lapak.noLapak}" data-nama-lapak="${lapak.nama}">
        <div class="card-body text-center">
          <h5 class="card-title">Lapak ${lapak.noLapak}</h5>
          <p class="card-text">${lapak.nama}</p>
          <p class="status-text ${statusHadir ? 'text-success' : 'text-danger'}">${lapak.statusAbsensi}</p>
        </div>
      </div>
    `;

        const cardBody = card.querySelector(".lapak-card");
        if (!statusHadir) {
            // Double-click → langsung absen
            cardBody.addEventListener("dblclick", () => absenLapak(cardBody.dataset.noLapak));

            // Klik normal → buka modal
            cardBody.addEventListener("click", () => openAbsensiModal(cardBody.dataset.noLapak, cardBody.dataset.namaLapak));
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

// Loading
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

// Fungsi absen (ubah UI langsung)
async function absenLapak(noLapak) {
    const card = document.querySelector(`.lapak-card[data-no-lapak="${noLapak}"]`);
    if (!card) return;
    const statusText = card.querySelector(".status-text");

    try {
        showAbsensiLoading(true);
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "absen", noLapak })
        });
        const json = await res.json();

        if (json.success) {
            statusText.textContent = "✅ Hadir";
            statusText.classList.remove("text-danger");
            statusText.classList.add("text-success");
            card.classList.add("disabled");
        } else {
            alert(json.message);
        }
    } catch (err) {
        console.error("Error absen:", err);
        alert("❌ Gagal menyimpan absensi.");
    } finally {
        setTimeout(() => showAbsensiLoading(false), 300);
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
