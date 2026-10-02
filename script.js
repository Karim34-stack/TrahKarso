// Ganti dengan URL Google Apps Script Anda
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwSVaFpc5xoWSL2hK6oP2Y9Gij9DIO3Cs1MvLFQtP1KFfvi-MwRYzCJbzKa_CSc1sjcoQ/exec";


let familyData = [];
let isEditMode = false;

document.addEventListener("DOMContentLoaded", fetchFamilyData);

// 1. Fetch Data dari Google Sheets
async function fetchFamilyData() {
    const loadingEl = document.getElementById("loading");
    const containerEl = document.getElementById("tree-container");

    try {
        loadingEl.classList.remove("hidden");
        containerEl.classList.add("hidden");

        const response = await fetch(SCRIPT_URL);
        familyData = await response.json();

        loadingEl.classList.add("hidden");
        containerEl.classList.remove("hidden");

        renderTree();
        populateParentDropdown();
    } catch (error) {
        console.error("Error:", error);
        loadingEl.innerHTML = `<p class="text-red-500">Gagal memuat data dari Google Sheets.</p>`;
    }
}

// 2. Render Silsilah Keluarga
function renderTree() {
    const container = document.getElementById("tree-container");
    container.innerHTML = "";

    if (!familyData || familyData.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 py-8">Belum ada data anggota. Klik "+ Tambah Anggota".</p>`;
        return;
    }

    // Kelompokkan data per generasi
    const generations = {};
    familyData.forEach(member => {
        const gen = member.generasi || 1;
        if (!generations[gen]) generations[gen] = [];
        generations[gen].push(member);
    });

    Object.keys(generations).sort((a, b) => a - b).forEach(gen => {
        const genSection = document.createElement("div");
        genSection.className = "generation-group bg-white p-5 rounded-xl shadow-sm border border-slate-200";

        genSection.innerHTML = `
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-indigo-600">Generasi ${gen}</h3>
                <span class="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-semibold">${generations[gen].length} Anggota</span>
            </div>
            <div class="flex flex-wrap gap-4 justify-center" id="gen-${gen}"></div>
        `;

        container.appendChild(genSection);

        const genContainer = document.getElementById(`gen-${gen}`);
        generations[gen].forEach(m => {
            const ayah = familyData.find(p => p.id == m.ayahId);
            const ayahNama = ayah ? ayah.nama : "-";

            // Default Avatar jika tidak ada foto
            const avatarHtml = m.foto 
                ? `<img src="${m.foto}" class="w-12 h-12 rounded-full object-cover border-2 ${m.gender === 'L' ? 'border-blue-400' : 'border-pink-400'}">`
                : `<div class="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold ${m.gender === 'L' ? 'bg-blue-500' : 'bg-pink-500'}">
                    ${m.gender === 'L' ? '👨' : '👩'}
                   </div>`;

            const card = document.createElement("div");
            card.className = `card-member p-4 rounded-xl border relative w-72 flex flex-col justify-between ${m.gender === 'L' ? 'bg-blue-50/50 border-blue-200' : 'bg-pink-50/50 border-pink-200'}`;
            
            card.innerHTML = `
                <div>
                    <div class="flex items-start gap-3">
                        ${avatarHtml}
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-slate-800 text-sm truncate">${m.nama}</h4>
                            <p class="text-xs text-slate-500 mt-0.5">Ayah: <span class="font-medium">${ayahNama}</span></p>
                        </div>
                    </div>
                    ${m.catatan ? `<p class="text-xs text-slate-600 mt-3 italic bg-white/70 p-2 rounded-lg border border-slate-100">${m.catatan}</p>` : ''}
                </div>

                <!-- Tombol Aksi (Edit & Hapus) -->
                <div class="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-200/60 text-xs">
                    <button onclick="openModalForEdit('${m.id}')" class="text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100">
                        ✏️ Edit
                    </button>
                    <button onclick="deleteMember('${m.id}', '${m.nama}')" class="text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded bg-red-50 hover:bg-red-100">
                        🗑️ Hapus
                    </button>
                </div>
            `;
            genContainer.appendChild(card);
        });
    });
}

// 3. Populate Dropdown Ayah
function populateParentDropdown(excludeId = null) {
    const select = document.getElementById("ayahId");
    select.innerHTML = `<option value="">-- Tidak Ada --</option>`;

    familyData
        .filter(m => m.gender === 'L' && m.id !== excludeId)
        .forEach(m => {
            const option = document.createElement("option");
            option.value = m.id;
            option.textContent = `${m.nama} (Gen ${m.generasi})`;
            select.appendChild(option);
        });
}

// 4. Modal Handlers
function toggleModal(show) {
    document.getElementById("modal").classList.toggle("hidden", !show);
    if (!show) {
        document.getElementById("family-form").reset();
        document.getElementById("image-preview").classList.add("hidden");
    }
}

function openModalForAdd() {
    isEditMode = false;
    document.getElementById("modal-title").textContent = "Tambah Anggota Keluarga";
    document.getElementById("member-id").value = "";
    populateParentDropdown();
    toggleModal(true);
}

function openModalForEdit(id) {
    const member = familyData.find(m => m.id == id);
    if (!member) return;

    isEditMode = true;
    document.getElementById("modal-title").textContent = "Edit Anggota Keluarga";
    document.getElementById("member-id").value = member.id;
    document.getElementById("nama").value = member.nama;
    document.getElementById("gender").value = member.gender;
    document.getElementById("generasi").value = member.generasi;
    document.getElementById("catatan").value = member.catatan || "";
    document.getElementById("foto").value = member.foto || "";

    populateParentDropdown(member.id);
    document.getElementById("ayahId").value = member.ayahId || "";

    if (member.foto) {
        document.getElementById("preview-img").src = member.foto;
        document.getElementById("image-preview").classList.remove("hidden");
    }

    toggleModal(true);
}

// 5. Convert Image File to Base64
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Url = e.target.result;
        document.getElementById("foto").value = base64Url;
        document.getElementById("preview-img").src = base64Url;
        document.getElementById("image-preview").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}

// 6. Form Submit Handler (Create / Update)
async function handleSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan...";

    const payload = {
        action: isEditMode ? "UPDATE" : "CREATE",
        id: document.getElementById("member-id").value || "m_" + Date.now(),
        nama: document.getElementById("nama").value,
        gender: document.getElementById("gender").value,
        generasi: parseInt(document.getElementById("generasi").value),
        ayahId: document.getElementById("ayahId").value,
        catatan: document.getElementById("catatan").value,
        foto: document.getElementById("foto").value
    };

    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        toggleModal(false);
        await fetchFamilyData();
    } catch (error) {
        alert("Gagal menyimpan data.");
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Simpan";
    }
}

// 7. Hapus Anggota
async function deleteMember(id, nama) {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${nama}"?`)) return;

    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "DELETE", id: id })
        });
        await fetchFamilyData();
    } catch (error) {
        alert("Gagal menghapus data.");
        console.error(error);
    }
}
