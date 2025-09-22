const API_URL = "https://script.google.com/macros/s/AKfycby4z2qZ24SrJkcyGpybH29lSUC_3_z1LG-7wSmTzpaOEXrwjXf0Cl3hqkg95qAxPj1-/exec";
let lapakData = [];
let currentLapakId = null;

// Cek hari
const isSunday = new Date().getDay() === 0; // 0 = Minggu

// Loader
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

// Load semua lapak
async function loadLapak() {
    showAbsensiLoading(true, "Sedang memuat data lapak...");

    try {
        const res = await fetch(API_URL + "?action=listLapak");
        const json = await res.json();

        console.log("DEBUG JSON:", json); // cek struktur data

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
        showAbsensiLoading(false);

    } catch (err) {
        document.getElementById("lapakContainer").innerHTML =
            `<p class="text-center text-danger">Error loadLapak: ${err}</p>`;
        showAbsensiLoading(false);
    }
}

// Render lapak
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
            if (isSunday) {
                cardEl.addEventListener("click", () => openAbsensiModal(lapak.noLapak, lapak.nama));
                cardEl.addEventListener("dblclick", () => absenLapak(lapak.noLapak));
            } else {
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

// Absen dari modal
document.getElementById("modalAbsenBtn").addEventListener("click", () => {
    if (currentLapakId) absenLapak(currentLapakId);
    closeAbsensiModal();
});

// Absen ke server
async function absenLapak(noLapak) {
    if (!isSunday) {
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

// Search filter
document.getElementById("searchInput").addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = lapakData.filter(l =>
        l.noLapak.toString().toLowerCase().includes(keyword) ||
        l.nama.toLowerCase().includes(keyword)
    );
    renderLapak(filtered);
});
document.getElementById("toggleDarkMode").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", document.body.classList.contains("dark"));
});

// biar ingat preferensi user
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
}

// cek localStorage (biar dark mode tersimpan)
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
    darkSwitch.checked = true;
}

darkSwitch.addEventListener("change", () => {
    if (darkSwitch.checked) {
        document.body.classList.add("dark");
        localStorage.setItem("darkMode", "true");
    } else {
        document.body.classList.remove("dark");
        localStorage.setItem("darkMode", "false");
    }
});

// Load pertama kali
loadLapak();
