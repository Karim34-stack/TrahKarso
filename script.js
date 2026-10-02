const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxARfYWxML4Hk8Zi8iuzUrmf_Gzmxgbg9i7x2JalYVaCGh4D6vZl4PbeiEaTbdJvicJEg/exec"; // Ganti dengan URL Apps Script Anda

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
        populateParentDropdowns();
    } catch (error) {
        console.error("Error:", error);
        loadingEl.innerHTML = `<p class="text-red-500">Gagal memuat data dari Google Sheets.</p>`;
    }
}

// Helper untuk mengecek apakah statusnya Pasangan
function isPasanganMember(member) {
    return member.isPasangan === true || member.isPasangan === "TRUE" || member.isPasangan === "true";
}

// 2. Render Silsilah (Hanya Anggota Utama di Pohon, Pasangan di dalam Card)
function renderTree() {
    const container = document.getElementById("tree-container");
    container.innerHTML = "";

    // Filter hanya anggota utama (bukan pasangan terpisah) untuk dirender di pohon
    const mainMembers = familyData.filter(m => !isPasanganMember(m));

    if (!mainMembers || mainMembers.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 py-8">Belum ada data anggota. Klik "+ Tambah Anggota Utama".</p>`;
        return;
    }

    // Kelompokkan per generasi
    const generations = {};
    mainMembers.forEach(member => {
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
                <span class="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-semibold">${generations[gen].length} Anggota Keturunan</span>
            </div>
            <div class="flex flex-wrap gap-6 justify-center" id="gen-${gen}"></div>
        `;

        container.appendChild(genSection);

        const genContainer = document.getElementById(`gen-${gen}`);
        generations[gen].forEach(m => {
            const ayah = familyData.find(p => p.id == m.ayahId);
            const ibu = familyData.find(p => p.id == m.ibuId);
            const ayahNama = ayah ? ayah.nama : "-";
            const ibuNama = ibu ? ibu.nama : "";

            // Cari pasangan dari anggota ini
            const pasangan = familyData.find(p => p.pasanganId == m.id || (m.pasanganId && p.id == m.pasanganId));

            // Avatar Utama
            const mainAvatarHtml = m.foto 
                ? `<img src="${m.foto}" class="w-12 h-12 rounded-full object-cover border-2 ${m.gender === 'L' ? 'border-blue-400' : 'border-pink-400'}">`
                : `<div class="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold ${m.gender === 'L' ? 'bg-blue-500' : 'bg-pink-500'}">
                    ${m.gender === 'L' ? '👨' : '👩'}
                   </div>`;

            // Avatar Pasangan (Jika ada)
            let pasanganHtml = "";
            if (pasangan) {
                const pasanganAvatar = pasangan.foto
                    ? `<img src="${pasangan.foto}" class="w-10 h-10 rounded-full object-cover border-2 ${pasangan.gender === 'L' ? 'border-blue-400' : 'border-pink-400'}">`
                    : `<div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${pasangan.gender === 'L' ? 'bg-blue-500' : 'bg-pink-500'}">
                        ${pasangan.gender === 'L' ? '👨' : '👩'}
                       </div>`;

                pasanganHtml = `
                    <div class="flex items-center gap-2 mt-3 pt-2 border-t border-dashed border-slate-300 bg-white/60 p-2 rounded-lg">
                        <span class="text-xs font-semibold text-rose-500">❤️ Pasangan:</span>
                        ${pasanganAvatar}
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-xs text-slate-800 truncate">${pasangan.nama}</p>
                        </div>
                        <button onclick="openModalForEdit('${pasangan.id}')" class="text-xs text-indigo-600 hover:underline">Edit</button>
                        <button onclick="deleteMember('${pasangan.id}', '${pasangan.nama}')" class="text-xs text-red-500 hover:underline">Hapus</button>
                    </div>
                `;
            } else {
                pasanganHtml = `
                    <div class="mt-2 text-right">
                        <button onclick="openModalForAddPasangan('${m.id}')" class="text-xs text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md font-medium transition">
                            + Tambah Pasangan
                        </button>
                    </div>
                `;
            }

            const card = document.createElement("div");
            card.className = `card-member p-4 rounded-xl border relative w-80 flex flex-col justify-between ${m.gender === 'L' ? 'bg-blue-50/50 border-blue-200' : 'bg-pink-50/50 border-pink-200'}`;
            
            card.innerHTML = `
                <div>
                    <!-- Info Utama -->
                    <div class="flex items-start gap-3">
                        ${mainAvatarHtml}
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-slate-800 text-base truncate">${m.nama}</h4>
                            <p class="text-xs text-slate-500 mt-0.5">Ayah: <span class="font-medium">${ayahNama}</span> ${ibuNama ? `/ Ibu: ${ibuNama}` : ''}</p>
                        </div>
                    </div>

                    ${m.catatan ? `<p class="text-xs text-slate-600 mt-2 italic bg-white/70 p-2 rounded-lg border border-slate-100">${m.catatan}</p>` : ''}

                    <!-- Section Pasangan -->
                    ${pasanganHtml}
                </div>

                <!-- Tombol Aksi (+ Anak, Edit, Hapus) -->
                <div class="flex justify-between items-center mt-4 pt-2 border-t border-slate-200/60 text-xs">
                    <button onclick="openModalForAddChild('${m.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1 rounded-md shadow-sm transition">
                        👶 + Anak
                    </button>
                    <div class="flex gap-1">
                        <button onclick="openModalForEdit('${m.id}')" class="text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100">
                            ✏️ Edit
                        </button>
                        <button onclick="deleteMember('${m.id}', '${m.nama}')" class="text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded bg-red-50 hover:bg-red-100">
                            🗑️ Hapus
                        </button>
                    </div>
                </div>
            `;
            genContainer.appendChild(card);
        });
    });
}

// 3. Populate Dropdown Ayah & Ibu
function populateParentDropdowns(excludeId = null) {
    const selectAyah = document.getElementById("ayahId");
    const selectIbu = document.getElementById("ibuId");
    const selectPasangan = document.getElementById("pasanganId");

    selectAyah.innerHTML = `<option value="">-- Tidak Ada --</option>`;
    selectIbu.innerHTML = `<option value="">-- Tidak Ada --</option>`;
    selectPasangan.innerHTML = `<option value="">-- Tidak Ada --</option>`;

    familyData.forEach(m => {
        if (m.id === excludeId) return;

        const option = document.createElement("option");
        option.value = m.id;
        option.textContent = `${m.nama} (Gen ${m.generasi})`;

        if (m.gender === 'L') {
            selectAyah.appendChild(option.cloneNode(true));
        } else {
            selectIbu.appendChild(option.cloneNode(true));
        }
        selectPasangan.appendChild(option.cloneNode(true));
    });
}

// 4. Modal Handlers
function toggleModal(show) {
    document.getElementById("modal").classList.toggle("hidden", !show);
    if (!show) {
        document.getElementById("family-form").reset();
        document.getElementById("image-preview").classList.add("hidden");
        document.getElementById("isPasangan").value = "false";
        document.getElementById("pasangan-field-container").classList.add("hidden");
        document.getElementById("orangtua-container").classList.remove("hidden");
    }
}

function openModalForAdd() {
    isEditMode = false;
    document.getElementById("modal-title").textContent = "Tambah Anggota Utama";
    document.getElementById("member-id").value = "";
    document.getElementById("isPasangan").value = "false";
    populateParentDropdowns();
    toggleModal(true);
}

// Tambah Anak otomatis mengisi Ayah/Ibu dan Generasi + 1
function openModalForAddChild(parentId) {
    const parent = familyData.find(m => m.id == parentId);
    if (!parent) return;

    openModalForAdd();
    document.getElementById("modal-title").textContent = `Tambah Anak dari ${parent.nama}`;
    document.getElementById("generasi").value = (parseInt(parent.generasi) || 1) + 1;

    // Tentukan posisi Ayah / Ibu berdasarkan gender orang tua
    if (parent.gender === 'L') {
        document.getElementById("ayahId").value = parent.id;
        // Jika Ayah punya pasangan, otomatis penuhi Ibu
        const spouse = familyData.find(p => p.pasanganId == parent.id || p.id == parent.pasanganId);
        if (spouse) document.getElementById("ibuId").value = spouse.id;
    } else {
        document.getElementById("ibuId").value = parent.id;
        const spouse = familyData.find(p => p.pasanganId == parent.id || p.id == parent.pasanganId);
        if (spouse) document.getElementById("ayahId").value = spouse.id;
    }
}

// Tambah Pasangan yang menempel di card
function openModalForAddPasangan(mainMemberId) {
    const mainMember = familyData.find(m => m.id == mainMemberId);
    if (!mainMember) return;

    isEditMode = false;
    document.getElementById("modal-title").textContent = `Tambah Pasangan untuk ${mainMember.nama}`;
    document.getElementById("member-id").value = "";
    document.getElementById("isPasangan").value = "true";
    document.getElementById("generasi").value = mainMember.generasi;
    
    // Set Jenis Kelamin Berlawanan
    document.getElementById("gender").value = mainMember.gender === 'L' ? 'P' : 'L';

    populateParentDropdowns();
    
    // Tampilkan field pasangan dan kunci nilainya
    document.getElementById("pasangan-field-container").classList.remove("hidden");
    document.getElementById("pasanganId").value = mainMember.id;
    document.getElementById("orangtua-container").classList.add("hidden");

    toggleModal(true);
}

function openModalForEdit(id) {
    const member = familyData.find(m => m.id == id);
    if (!member) return;

    isEditMode = true;
    const isPas = isPasanganMember(member);
    document.getElementById("modal-title").textContent = isPas ? "Edit Data Pasangan" : "Edit Anggota Keluarga";
    document.getElementById("member-id").value = member.id;
    document.getElementById("isPasangan").value = isPas ? "true" : "false";
    document.getElementById("nama").value = member.nama;
    document.getElementById("gender").value = member.gender;
    document.getElementById("generasi").value = member.generasi;
    document.getElementById("catatan").value = member.catatan || "";
    document.getElementById("foto").value = member.foto || "";

    populateParentDropdowns(member.id);

    if (isPas) {
        document.getElementById("pasangan-field-container").classList.remove("hidden");
        document.getElementById("pasanganId").value = member.pasanganId || "";
        document.getElementById("orangtua-container").classList.add("hidden");
    } else {
        document.getElementById("pasangan-field-container").classList.add("hidden");
        document.getElementById("orangtua-container").classList.remove("hidden");
        document.getElementById("ayahId").value = member.ayahId || "";
        document.getElementById("ibuId").value = member.ibuId || "";
    }

    if (member.foto) {
        document.getElementById("preview-img").src = member.foto;
        document.getElementById("image-preview").classList.remove("hidden");
    }

    toggleModal(true);
}

// 5. Upload File Handling (Base64)
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

// 6. Submit Handler
async function handleSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan...";

    const isPas = document.getElementById("isPasangan").value === "true";

    const payload = {
        action: isEditMode ? "UPDATE" : "CREATE",
        id: document.getElementById("member-id").value || "m_" + Date.now(),
        nama: document.getElementById("nama").value,
        gender: document.getElementById("gender").value,
        generasi: parseInt(document.getElementById("generasi").value),
        ayahId: isPas ? "" : document.getElementById("ayahId").value,
        ibuId: isPas ? "" : document.getElementById("ibuId").value,
        pasanganId: isPas ? document.getElementById("pasanganId").value : "",
        catatan: document.getElementById("catatan").value,
        foto: document.getElementById("foto").value,
        isPasangan: isPas
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

// 7. Delete Member
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
