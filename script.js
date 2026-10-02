// Ganti dengan URL Google Apps Script Anda
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwSVaFpc5xoWSL2hK6oP2Y9Gij9DIO3Cs1MvLFQtP1KFfvi-MwRYzCJbzKa_CSc1sjcoQ/exec";

let familyData = [];

// Muat data saat halaman pertama kali diakses
document.addEventListener("DOMContentLoaded", () => {
    fetchFamilyData();
});

// Ambil data dari Google Sheets
async function fetchFamilyData() {
    const loadingEl = document.getElementById("loading");
    const containerEl = document.getElementById("tree-container");

    try {
        loadingEl.innerHTML = `<p class="text-indigo-600">Sedang mengambil data dari Google Sheets...</p>`;
        const response = await fetch(SCRIPT_URL);
        familyData = await response.json();
        
        loadingEl.classList.add("hidden");
        containerEl.classList.remove("hidden");
        
        renderTree();
        populateParentDropdown();
    } catch (error) {
        console.error("Error fetching data:", error);
        loadingEl.innerHTML = `<p class="text-red-500">Gagal memuat data. Pastikan URL Script sudah benar.</p>`;
    }
}

// Tampilkan Silsilah Berdasarkan Generasi
function renderTree() {
    const container = document.getElementById("tree-container");
    container.innerHTML = "";

    if (familyData.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400">Belum ada data keluarga. Klik "+ Tambah Anggota".</p>`;
        return;
    }

    // Kelompokkan berdasarkan generasi
    const generations = {};
    familyData.forEach(member => {
        const gen = member.generasi || 1;
        if (!generations[gen]) generations[gen] = [];
        generations[gen].push(member);
    });

    // Urutkan generasi dari teratas (1, 2, dst)
    Object.keys(generations).sort((a, b) => a - b).forEach(gen => {
        const genSection = document.createElement("div");
        genSection.className = "generation-group bg-white p-4 rounded-xl shadow-sm border border-slate-200";

        genSection.innerHTML = `
            <h3 class="text-sm font-semibold uppercase tracking-wider text-indigo-500 mb-3">Generasi ${gen}</h3>
            <div class="flex flex-wrap gap-4 justify-center" id="gen-${gen}"></div>
        `;

        container.appendChild(genSection);

        const genContainer = document.getElementById(`gen-${gen}`);
        generations[gen].forEach(m => {
            const ayah = familyData.find(p => p.id == m.ayahId);
            const ayahNama = ayah ? ayah.nama : "-";

            const card = document.createElement("div");
            card.className = `card-member p-4 rounded-lg border w-64 ${m.gender === 'L' ? 'bg-blue-50 border-blue-200' : 'bg-pink-50 border-pink-200'}`;
            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${m.gender === 'L' ? 'bg-blue-500' : 'bg-pink-500'}">
                        ${m.gender === 'L' ? '👨' : '👩'}
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800">${m.nama}</h4>
                        <p class="text-xs text-slate-500">Ayah: ${ayahNama}</p>
                    </div>
                </div>
                ${m.catatan ? `<p class="text-xs text-slate-600 mt-2 italic bg-white/60 p-2 rounded">${m.catatan}</p>` : ''}
            `;
            genContainer.appendChild(card);
        });
    });
}

// Isi dropdown Ayah pada modal
function populateParentDropdown() {
    const select = document.getElementById("ayahId");
    select.innerHTML = `<option value="">-- Tidak Ada / Orang Tua Utama --</option>`;
    
    familyData.filter(m => m.gender === 'L').forEach(m => {
        const option = document.createElement("option");
        option.value = m.id;
        option.textContent = `${m.nama} (Gen ${m.generasi})`;
        select.appendChild(option);
    });
}

// Toggle Modal
function toggleModal(show) {
    const modal = document.getElementById("modal");
    if (show) modal.classList.remove("hidden");
    else modal.classList.add("hidden");
}

// Simpan Data Baru
async function handleSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan...";

    const payload = {
        id: "m_" + Date.now(),
        nama: document.getElementById("nama").value,
        gender: document.getElementById("gender").value,
        generasi: parseInt(document.getElementById("generasi").value),
        ayahId: document.getElementById("ayahId").value,
        catatan: document.getElementById("catatan").value
    };

    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        // Reset & Refresh
        document.getElementById("family-form").reset();
        toggleModal(false);
        await fetchFamilyData();
    } catch (error) {
        alert("Gagal menyimpan data ke Google Sheets");
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Simpan";
    }
}
