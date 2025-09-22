const API_URL = "PASTE_URL_WEBAPP_DEPLOY"; // ganti dengan URL WebApp Google Apps Script

let lapakData = [];

// Fetch data lapak hari ini
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

// Render lapak dalam bentuk card
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
      <div class="card lapak-card shadow-sm ${statusHadir ? 'disabled' : ''}" data-no-lapak="${lapak.noLapak}">
        <div class="card-body text-center">
          <h5 class="card-title">Lapak ${lapak.noLapak}</h5>
          <p class="card-text">${lapak.nama}</p>
          <p class="status-text ${statusHadir ? 'text-success' : 'text-danger'}">
            ${lapak.statusAbsensi}
          </p>
        </div>
      </div>
    `;

        // Klik card untuk absen jika belum hadir
        if (!statusHadir) {
            card.querySelector(".lapak-card").addEventListener("click", () => absenLapakFast(card.querySelector(".lapak-card")));
        }

        container.appendChild(card);
    });
}

// Fungsi absen cepat (langsung ubah UI)
async function absenLapakFast(card) {
    const noLapak = card.dataset.noLapak;
    const statusText = card.querySelector(".status-text");

    try {
        const res = await fetch(API_URL + "?action=handleAbsensi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noLapak })
        });
        const json = await res.json();

        if (json.success) {
            // langsung ubah UI tanpa reload
            statusText.textContent = "✅ Hadir";
            statusText.classList.remove("text-danger");
            statusText.classList.add("text-success");
            card.classList.add("disabled");
        } else {
            alert(json.message);
        }
    } catch (err) {
        alert("Error absen: " + err);
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
