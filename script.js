// ISI DENGAN URL WEB APP HASIL DEPLOY DARI GOOGLE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbzfeYC318czY9PBmVNe-EPI45B8bjAhACezPcDCcOoaJKEA5DpTi1jbfIbJJ_lK7Kz3Uw/exec";

let familyData = [];
let isAdmin = false;

document.addEventListener("DOMContentLoaded", () => {
  loadDataFromSheet();
});

// 1. Ambil Data
function loadDataFromSheet() {
  showLoading(true);
  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      familyData = data || [];
      renderTree();
    })
    .catch(err => {
      console.error("Fetch Error:", err);
      alert("Gagal memuat data dari Spreadsheet. Pastikan URL API sudah benar.");
    })
    .finally(() => showLoading(false));
}

function showLoading(isLoading) {
  const container = document.getElementById("familyTree");
  if (!container) return;
  if (isLoading) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px; width: 100%;">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
        <p style="margin-top:10px; color: var(--text-muted);">Memuat data dari database...</p>
      </div>`;
  }
}

// 2. Render Tree
function renderTree() {
  const container = document.getElementById("familyTree");
  container.innerHTML = "";

  if (!familyData || familyData.length === 0) {
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

// 3. Simpan Data (Anti CORS Error)
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

  const memberObj = {
    id: id ? Number(id) : null,
    nama: nama,
    gender: gender,
    parentId: parentId ? Number(parentId) : "",
    phone: phone,
    photo: photo,
    bio: bio,
    pasangan: spousesArr
  };

  const submitBtn = e.target.querySelector("button[type='submit']");
  submitBtn.innerText = "Menyimpan...";
  submitBtn.disabled = true;

  // Menggunakan URLSearchParams agar tidak kena masalah CORS pada Apps Script
  const params = new URLSearchParams();
  params.append("action", "save");
  params.append("data", JSON.stringify(memberObj));

  fetch(API_URL, {
    method: "POST",
    body: params
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

// 4. Hapus Data (Anti CORS Error)
function deleteMember(id) {
  if (!isAdmin) return alert("Akses ditolak! Login sebagai Admin terlebih dahulu.");

  if (confirm("Apakah Anda yakin ingin menghapus data anggota ini dari Google Sheets?")) {
    const params = new URLSearchParams();
    params.append("action", "delete");
    params.append("id", id);
    params.append("pin", "1234");

    fetch(API_URL, {
      method: "POST",
      body: params
    })
      .then(res => res.json())
      .then(res => {
        alert(res.message);
        if (res.success) loadDataFromSheet();
      })
      .catch(err => alert("Gagal menghapus data: " + err));
  }
}
