// Fungsi absen dengan optimistik UI update
async function absenLapak(noLapak) {
  const card = document.querySelector(`.lapak-card[data-no-lapak="${noLapak}"]`);
  if (!card) return;
  const statusText = card.querySelector(".status-text");

  // Simpan status lama untuk rollback jika gagal
  const oldText = statusText.textContent;
  const oldClass = statusText.className;

  // Optimistik update: langsung hijau
  statusText.textContent = "✅ Hadir";
  statusText.classList.remove("text-danger");
  statusText.classList.add("text-success");
  card.classList.add("disabled");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "absen", noLapak })
    });
    const json = await res.json();

    if (!json.success) {
      // rollback UI
      statusText.textContent = oldText;
      statusText.className = oldClass;
      card.classList.remove("disabled");
      alert(json.message || "❌ Gagal menyimpan absensi.");
    }
  } catch (err) {
    // rollback UI
    statusText.textContent = oldText;
    statusText.className = oldClass;
    card.classList.remove("disabled");
    console.error("Error absen:", err);
    alert("❌ Gagal menyimpan absensi.");
  }
}
