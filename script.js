// Ganti dengan Web App URL dari Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbzAEj0C85OfjBYUR1Hw6dByEYRLWAcg427YVG5mPgD486aSUpdT_mMN8U4Za7u_fdj68A/exec";

let familyData = [];
let isAdmin = false;

document.addEventListener("DOMContentLoaded", () => {
  loadDataFromSheet();
});

// 1. Ambil Data dari Google Sheets via API
function loadDataFromSheet() {
  showLoading(true);
  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      familyData = data || [];
      renderTree();
    })
    .catch(err => {
      console.error(err);
      alert("Gagal memuat data dari Spreadsheet.");
    })
    .finally(() => showLoading(false));
}

function showLoading(isLoading) {
  const container = document.getElementById("familyTree");
  if (isLoading) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px; width: 100%;">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
        <p style="margin-top:10px; color: var(--text-muted);">Memuat data dari database...</p>
      </div>`;
  }
}

// 2. Render Pohon Silsilah (Keturunan Asli)
function renderTree() {
  const container = document.getElementById("familyTree");
  container.innerHTML = "";

  if (familyData.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>Belum ada data keluarga di Spreadsheet.</p>";
    return;
  }

  const roots = familyData.filter(m => !m.parentId || m.parentId === 0);
  if (roots.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>Data akar utama tidak ditemukan.</p>";
    return;
  }

  const ul = document.createElement("ul");
  roots.forEach(root => {
    ul.appendChild(createTreeNode(root));
  });
  container.appendChild(ul);
}

function createTreeNode(member) {
  const li = document.createElement("li");

  const adminActionsHTML = isAdmin ? `
    <div class="admin-card-actions" onclick="event.stopPropagation()">
      <button class="btn-icon" onclick="openEditModal(${member.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
      <button class="btn-icon danger" onclick="deleteMember(${member.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
    </div>
  ` : '';

  const spouseBadge = (member.pasangan && member.pasangan.length > 0)
    ? `<div class="spouse-count-badge"><i class="fa-solid fa-heart"></i> ${member.pasangan.length} Pasangan</div>`
    : '';

  li.innerHTML = `
    <div class="card" onclick="showDetail(${member.id})">
      ${adminActionsHTML}
      <img src="${member.photo}" class="card-img" alt="${member.nama}" onerror="this.src='https://via.placeholder.com/64?text=Foto'"/>
      <div class="card-name">${member.nama}</div>
      <div class="card-badge">${member.gender === 'L' ? 'Keturunan (L)' : 'Keturunan (P)'}</div>
      <div class="card-phone"><i class="fa-solid fa-phone"></i> ${member.phone || '-'}</div>
      ${spouseBadge}
    </div>
  `;

  const children = familyData.filter(m => Number(m.parentId) === Number(member.id));
  if (children.length > 0) {
    const ul = document.createElement("ul");
    children.forEach(child => {
      ul.appendChild(createTreeNode(child));
    });
    li.appendChild(ul);
  }

  return li;
}

// 3. Tampilkan Breakdown Detail Anggota
function showDetail(id) {
  const member = familyData.find(m => Number(m.id) === Number(id));
  if (!member) return;

  document.getElementById("detailName").innerText = member.nama;

  let pasanganHTML = "<i>Tidak ada data pasangan.</i>";
  if (member.pasangan && member.pasangan.length > 0) {
    pasanganHTML = member.pasangan.map((p, idx) => `
      <div class="spouse-section">
        <div class="spouse-title">Pasangan ${idx + 1}: ${p.nama}</div>
        <div><b>No HP:</b> ${p.phone || '-'}</div>
        <div><b>Biografi:</b> ${p.bio || '-'}</div>
      </div>
    `).join('');
  }

  const children = familyData.filter(m => Number(m.parentId) === Number(member.id));
  let childrenHTML = "<i>Tidak ada keturunan langsung.</i>";
  if (children.length > 0) {
    childrenHTML = "<ul class='detail-sub-list'>" + children.map(c => `<li><b>${c.nama}</b> (${c.gender === 'L' ? 'Laki-laki' : 'Perempuan'})</li>`).join('') + "</ul>";
  }

  let grandchildren = [];
  children.forEach(c => {
    const gChildren = familyData.filter(m => Number(m.parentId) === Number(c.id));
    grandchildren = grandchildren.concat(gChildren);
  });
  let grandChildrenHTML = "<i>Tidak ada cucu.</i>";
  if (grandchildren.length > 0) {
    grandChildrenHTML = "<ul class='detail-sub-list'>" + grandchildren.map(gc => `<li><b>${gc.nama}</b></li>`).join('') + "</ul>";
  }

  const body = document.getElementById("detailBody");
  body.innerHTML = `
    <div style="text-align:center; margin-bottom:15px;">
      <img src="${member.photo}" style="width:90px; height:90px; border-radius:50%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/90?text=Foto'"/>
      <h4 style="margin-top:8px;">${member.nama}</h4>
      <p style="font-size:0.85rem; color:var(--text-muted);"><i class="fa-solid fa-phone"></i> ${member.phone || 'Tidak ada No. HP'}</p>
    </div>
    
    <div style="margin-bottom:15px;">
      <h5 style="margin-bottom:4px;">Biografi:</h5>
      <p style="font-size:0.9rem; color:#475569;">${member.bio || '-'}</p>
    </div>

    <hr style="margin:15px 0; border:none; border-top:1px solid var(--border);"/>

    <h5 style="margin-bottom:8px;">Breakdown Pasangan:</h5>
    ${pasanganHTML}

    <h5 style="margin-bottom:8px; margin-top:15px;">Daftar Anak (Keturunan Asli):</h5>
    ${childrenHTML}

    <h5 style="margin-bottom:8px; margin-top:15px;">Daftar Cucu:</h5>
    ${grandChildrenHTML}
  `;

  document.getElementById("detailModal").classList.add("active");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function toggleAdminModal() {
  if (isAdmin) {
    isAdmin = false;
    document.getElementById("adminBtnText").innerText = "Login Admin";
    alert("Anda telah keluar dari mode Admin.");
    renderTree();
  } else {
    document.getElementById("adminModal").classList.add("active");
  }
}

function loginAdmin() {
  const pin = document.getElementById("adminPin").value;
  if (pin === "1234") {
    isAdmin = true;
    document.getElementById("adminBtnText").innerText = "Logout Admin";
    closeModal("adminModal");
    document.getElementById("adminPin").value = "";
    alert("Login Admin Berhasil!");
    renderTree();
  } else {
    alert("PIN Admin Salah!");
  }
}

function openAddModal() {
  document.getElementById("formTitle").innerText = "Tambah Anggota Keluarga";
  document.getElementById("memberForm").reset();
  document.getElementById("memberId").value = "";
  document.getElementById("spousesContainer").innerHTML = "";
  populateParentDropdown();
  document.getElementById("formModal").classList.add("active");
}

function openEditModal(id) {
  const member = familyData.find(m => Number(m.id) === Number(id));
  if (!member) return;

  document.getElementById("formTitle").innerText = "Edit Anggota Keluarga";
  document.getElementById("memberId").value = member.id;
  document.getElementById("fieldName").value = member.nama;
  document.getElementById("fieldGender").value = member.gender;
  document.getElementById("fieldPhone").value = member.phone || "";
  document.getElementById("fieldPhoto").value = member.photo || "";
  document.getElementById("fieldBio").value = member.bio || "";

  populateParentDropdown(member.id);
  document.getElementById("fieldParent").value = member.parentId || "";

  const container = document.getElementById("spousesContainer");
  container.innerHTML = "";
  if (member.pasangan) {
    member.pasangan.forEach(p => addSpouseField(p.nama, p.phone, p.bio));
  }

  document.getElementById("formModal").classList.add("active");
}

function populateParentDropdown(currentId = null) {
  const select = document.getElementById("fieldParent");
  select.innerHTML = '<option value="">-- Orang Tua Akar / Utama --</option>';
  
  familyData.forEach(m => {
    if (Number(m.id) !== Number(currentId)) {
      select.innerHTML += `<option value="${m.id}">${m.nama}</option>`;
    }
  });
}

function addSpouseField(nama = '', phone = '', bio = '') {
  const container = document.getElementById("spousesContainer");
  const div = document.createElement("div");
  div.className = "spouse-form-box";
  div.innerHTML = `
    <button type="button" class="btn-icon danger" style="position:absolute; top:5px; right:5px;" onclick="this.parentElement.remove()">&times;</button>
    <div class="form-group" style="margin-bottom:6px;">
      <label>Nama Pasangan</label>
      <input type="text" class="spouse-nama" value="${nama}" placeholder="Nama Pasangan" required />
    </div>
    <div class="form-row">
      <div class="form-group" style="margin-bottom:0;">
        <input type="text" class="spouse-phone" value="${phone}" placeholder="No HP Pasangan" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <input type="text" class="spouse-bio" value="${bio}" placeholder="Biografi Pasangan" />
      </div>
    </div>
  `;
  container.appendChild(div);
}

// 4. Simpan Data ke Google Sheets
function saveMember(e) {
  e.preventDefault();

  const id = document.getElementById("memberId").value;
  const nama = document.getElementById("fieldName").value;
  const gender = document.getElementById("fieldGender").value;
  const parentId = document.getElementById("fieldParent").value;
  const phone = document.getElementById("fieldPhone").value;
  const photo = document.getElementById("fieldPhoto").value;
  const bio = document.getElementById("fieldBio").value;

  const spousesArr = [];
  document.querySelectorAll(".spouse-form-box").forEach(box => {
    spousesArr.push({
      nama: box.querySelector(".spouse-nama").value,
      phone: box.querySelector(".spouse-phone").value,
      bio: box.querySelector(".spouse-bio").value
    });
  });

  const payload = {
    action: "save",
    data: {
      id: id ? Number(id) : null,
      nama: nama,
      gender: gender,
      parentId: parentId ? Number(parentId) : "",
      phone: phone,
      photo: photo,
      bio: bio,
      pasangan: spousesArr
    }
  };

  const submitBtn = e.target.querySelector("button[type='submit']");
  submitBtn.innerText = "Menyimpan...";
  submitBtn.disabled = true;

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(res => {
      alert(res.message);
      closeModal("formModal");
      loadDataFromSheet();
    })
    .catch(err => alert("Gagal menyimpan data: " + err))
    .finally(() => {
      submitBtn.innerText = "Simpan Data";
      submitBtn.disabled = false;
    });
}

// 5. Hapus Data dari Google Sheets
function deleteMember(id) {
  if (!isAdmin) return alert("Akses ditolak! Login sebagai Admin terlebih dahulu.");

  if (confirm("Apakah Anda yakin ingin menghapus data anggota ini dari Google Sheets?")) {
    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "delete", id: id, pin: "1234" })
    })
      .then(res => res.json())
      .then(res => {
        alert(res.message);
        if (res.success) loadDataFromSheet();
      })
      .catch(err => alert("Gagal menghapus data: " + err));
  }
}
