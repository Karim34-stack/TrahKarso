// Data awal silsilah keluarga (Garis Keturunan Asli)
let familyData = [
  {
    id: 1,
    nama: "Kakek H. Ahmad",
    gender: "L",
    parentId: null,
    phone: "081234567890",
    photo: "uploads/default.jpg",
    bio: "Pendiri keluarga besar. Suka berkebun dan berorganisasi.",
    pasangan: [
      { nama: "Nenek Hj. Siti", phone: "081234567891", bio: "Istri pertama H. Ahmad" }
    ]
  },
  {
    id: 2,
    nama: "Budi Santoso",
    gender: "L",
    parentId: 1,
    phone: "081298765432",
    photo: "uploads/default.jpg",
    bio: "Anak pertama Kakek Ahmad. Bekerja sebagai wirausaha.",
    pasangan: [
      { nama: "Rina Indriani", phone: "081298765433", bio: "Istri Budi Santoso" }
    ]
  },
  {
    id: 3,
    nama: "Siti Rahma",
    gender: "P",
    parentId: 1,
    phone: "081388887777",
    photo: "uploads/default.jpg",
    bio: "Anak kedua Kakek Ahmad. Berprofesi sebagai guru.",
    pasangan: [
      { nama: "Hendra Wijaya", phone: "081388887778", bio: "Suami Siti Rahma" }
    ]
  },
  {
    id: 4,
    nama: "Andi Santoso",
    gender: "L",
    parentId: 2,
    phone: "081311223344",
    photo: "uploads/default.jpg",
    bio: "Cucu pertama dari Budi Santoso.",
    pasangan: []
  }
];

let isAdmin = false;
const ADMIN_PIN = "1234";

// Inisialisasi saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  renderTree();
});

// Render Pohon Silsilah
function renderTree() {
  const container = document.getElementById("familyTree");
  container.innerHTML = "";

  // Cari anggota akar (parentId == null)
  const roots = familyData.filter(m => m.parentId === null);
  if (roots.length === 0) {
    container.innerHTML = "<p>Belum ada data silsilah keluarga.</p>";
    return;
  }

  const ul = document.createElement("ul");
  roots.forEach(root => {
    ul.appendChild(createTreeNode(root));
  });
  container.appendChild(ul);
}

// Rekursif untuk membuat node pohon
function createTreeNode(member) {
  const li = document.createElement("li");

  // Admin Actions HTML
  const adminActionsHTML = isAdmin ? `
    <div class="admin-card-actions" onclick="event.stopPropagation()">
      <button class="btn-icon" onclick="openEditModal(${member.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
      <button class="btn-icon danger" onclick="deleteMember(${member.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
    </div>
  ` : '';

  const spouseCountText = member.pasangan && member.pasangan.length > 0 
    ? `<div class="spouse-count-badge"><i class="fa-solid fa-heart"></i> ${member.pasangan.length} Pasangan</div>` 
    : '';

  li.innerHTML = `
    <div class="card" onclick="showDetail(${member.id})">
      ${adminActionsHTML}
      <img src="${member.photo}" class="card-img" alt="${member.nama}" onerror="this.src='https://via.placeholder.com/64?text=Foto'"/>
      <div class="card-name">${member.nama}</div>
      <div class="card-badge">${member.gender === 'L' ? 'Keturunan (L)' : 'Keturunan (P)'}</div>
      <div class="card-phone"><i class="fa-solid fa-phone"></i> ${member.phone || '-'}</div>
      ${spouseCountText}
    </div>
  `;

  // Cari anak-anak langsung (keturunan asli)
  const children = familyData.filter(m => m.parentId === member.id);
  if (children.length > 0) {
    const ul = document.createElement("ul");
    children.forEach(child => {
      ul.appendChild(createTreeNode(child));
    });
    li.appendChild(ul);
  }

  return li;
}

// Tampilkan Detail & Breakdown Anggota
function showDetail(id) {
  const member = familyData.find(m => m.id === id);
  if (!member) return;

  document.getElementById("detailName").innerText = member.nama;

  // Render Breakdown Pasangan
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

  // Render Anak (Keturunan Langsung)
  const children = familyData.filter(m => m.parentId === member.id);
  let childrenHTML = "<i>Tidak ada keturunan langsung.</i>";
  if (children.length > 0) {
    childrenHTML = "<ul class='detail-sub-list'>" + children.map(c => `<li><b>${c.nama}</b> (${c.gender === 'L' ? 'Laki-laki' : 'Perempuan'})</li>`).join('') + "</ul>";
  }

  // Render Cucu
  let grandchildren = [];
  children.forEach(c => {
    const gChildren = familyData.filter(m => m.parentId === c.id);
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

// Modal Toggle Functions
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
  if (pin === ADMIN_PIN) {
    isAdmin = true;
    document.getElementById("adminBtnText").innerText = "Logout Admin";
    closeModal("adminModal");
    document.getElementById("adminPin").value = "";
    alert("Login Admin Berhasil! Anda sekarang dapat mengedit dan menghapus data.");
    renderTree();
  } else {
    alert("PIN Admin Salah! (Default: 1234)");
  }
}

// Open Modal Add / Edit
function openAddModal() {
  document.getElementById("formTitle").innerText = "Tambah Anggota Keluarga";
  document.getElementById("memberForm").reset();
  document.getElementById("memberId").value = "";
  document.getElementById("spousesContainer").innerHTML = "";
  populateParentDropdown();
  document.getElementById("formModal").classList.add("active");
}

function openEditModal(id) {
  const member = familyData.find(m => m.id === id);
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

  // Populate Spouses
  const container = document.getElementById("spousesContainer");
  container.innerHTML = "";
  if (member.pasangan) {
    member.pasangan.forEach(p => addSpouseField(p.nama, p.phone, p.bio));
  }

  document.getElementById("formModal").classList.add("active");
}

// Form Helpers
function populateParentDropdown(currentId = null) {
  const select = document.getElementById("fieldParent");
  select.innerHTML = '<option value="">-- Orang Tua Akar / Utama --</option>';
  
  familyData.forEach(m => {
    if (m.id !== currentId) {
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

// Save Member Function
function saveMember(e) {
  e.preventDefault();

  const id = document.getElementById("memberId").value;
  const nama = document.getElementById("fieldName").value;
  const gender = document.getElementById("fieldGender").value;
  const parentId = document.getElementById("fieldParent").value ? parseInt(document.getElementById("fieldParent").value) : null;
  const phone = document.getElementById("fieldPhone").value;
  const photo = document.getElementById("fieldPhoto").value || "uploads/default.jpg";
  const bio = document.getElementById("fieldBio").value;

  // Spouses Gathering
  const spousesArr = [];
  document.querySelectorAll(".spouse-form-box").forEach(box => {
    spousesArr.push({
      nama: box.querySelector(".spouse-nama").value,
      phone: box.querySelector(".spouse-phone").value,
      bio: box.querySelector(".spouse-bio").value
    });
  });

  if (id) {
    // Edit Existing
    const index = familyData.findIndex(m => m.id === parseInt(id));
    if (index !== -1) {
      familyData[index] = { id: parseInt(id), nama, gender, parentId, phone, photo, bio, pasangan: spousesArr };
    }
  } else {
    // Create New
    const newId = familyData.length > 0 ? Math.max(...familyData.map(m => m.id)) + 1 : 1;
    familyData.push({ id: newId, nama, gender, parentId, phone, photo, bio, pasangan: spousesArr });
  }

  closeModal("formModal");
  renderTree();
}

// Delete Member Function
function deleteMember(id) {
  if (confirm("Apakah Anda yakin ingin menghapus data ini beserta seluruh struktur keturunannya?")) {
    // Hapus anggota dan keturunannya secara rekursif
    function removeRecursive(memberId) {
      const children = familyData.filter(m => m.parentId === memberId);
      children.forEach(c => removeRecursive(c.id));
      familyData = familyData.filter(m => m.id !== memberId);
    }
    
    removeRecursive(id);
    renderTree();
  }
}
