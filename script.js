// ISI DENGAN URL WEB APP HASIL DEPLOY DARI GOOGLE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbyW8HufXjVAI6JhiWqdmTeZdDqHJEaLNxKEavWsRsan6brocuUH7H1oVNlrP0aH7yqKgw/exec";



let familyData = [];
let isAdmin = false;

document.addEventListener("DOMContentLoaded", () => {
  loadDataFromSheet();
});

// Fungsi Memuat Data dengan Penanganan Redirection & Fallback
function loadDataFromSheet() {
  showLoading(true);

  // Jika URL API belum diisi oleh pengguna
  if (!API_URL || API_URL.includes("PASTE_URL")) {
    alert("URL API Google Apps Script belum diisi di script.js!");
    showLoading(false);
    return;
  }

  // Permintaan data dengan penanganan redirect otomatis dari Google
  fetch(API_URL, {
    method: "GET",
    redirect: "follow"
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("HTTP error! status: " + response.status);
      }
      return response.json();
    })
    .then(data => {
      if (data.error) {
        alert("Error Spreadsheet: " + data.error);
        familyData = [];
      } else {
        familyData = data || [];
      }
      renderTree();
    })
    .catch(err => {
      console.error("Gagal memuat data:", err);
      alert("Gagal terhubung ke database. Silakan periksa koneksi internet atau URL Deployment Apps Script.");
      const container = document.getElementById("familyTree");
      if (container) {
        container.innerHTML = "<p style='text-align:center; color:red;'>Gagal memuat data dari Spreadsheet.</p>";
      }
    })
    .finally(() => {
      showLoading(false); // Pastikan indikator loading selalu berhenti
    });
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
    ul.appendChild((root));
  });
  container.appendChild(ul);
}

// Helper untuk mendapatkan URL Avatar Default
function getDefaultAvatar(nama, gender) {
  // Menggunakan UI Avatars untuk membuat avatar inisial nama berdasarkan jenis kelamin
  const bgColor = gender === 'L' ? '2563eb' : 'ec4899'; // Biru untuk Pria (L), Pink untuk Wanita (P)
  const formattedName = encodeURIComponent(nama || 'Keluarga');
  return `https://ui-avatars.com/api/?name=${formattedName}&background=${bgColor}&color=ffffff&bold=true&rounded=true`;
}

// 2. Render Pohon Silsilah
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

  // Tentukan URL foto atau avatar default
  const avatarUrl = getDefaultAvatar(member.nama, member.gender);
  const photoSrc = (member.photo && member.photo.trim() !== "" && !member.photo.includes("placeholder")) 
    ? member.photo 
    : avatarUrl;

  li.innerHTML = `
    <div class="card" onclick="showDetail(${member.id})">
      ${adminActionsHTML}
      <img src="${photoSrc}" class="card-img" alt="${member.nama}" onerror="this.onerror=null; this.src='${avatarUrl}';"/>
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

// 3. Render Modal Detail Anggota
function showDetail(id) {
  const member = familyData.find(m => Number(m.id) === Number(id));
  if (!member) return;

  document.getElementById("detailName").innerText = member.nama;

  const avatarUrl = getDefaultAvatar(member.nama, member.gender);
  const photoSrc = (member.photo && member.photo.trim() !== "" && !member.photo.includes("placeholder")) 
    ? member.photo 
    : avatarUrl;

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
      <img src="${photoSrc}" style="width:90px; height:90px; border-radius:50%; object-fit:cover;" onerror="this.onerror=null; this.src='${avatarUrl}';"/>
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

let currentPhotoBase64 = "";

// Fungsi untuk membaca dan mengompres foto dari "Choose File"
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Cek ukuran file
  if (file.size > 5 * 1024 * 1024) {
    alert("Ukuran file terlalu besar. Maksimal 5MB.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Resize & Kompresi Gambar menggunakan Canvas (Maksimal dimensi 300px)
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 300;
      const MAX_HEIGHT = 300;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Hasil kompresi dalam format JPEG (Quality 0.7)
      currentPhotoBase64 = canvas.toDataURL("image/jpeg", 0.7);

      // Tampilkan Preview Foto
      const previewImg = document.getElementById("photoPreview");
      const previewContainer = document.getElementById("photoPreviewContainer");
      if (previewImg && previewContainer) {
        previewImg.src = currentPhotoBase64;
        previewContainer.style.display = "block";
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Reset Form saat Buka Modal Tambah
function openAddModal() {
  document.getElementById("formTitle").innerText = "Tambah Anggota Keluarga";
  document.getElementById("memberForm").reset();
  document.getElementById("memberId").value = "";
  document.getElementById("spousesContainer").innerHTML = "";
  currentPhotoBase64 = "";
  
  const previewContainer = document.getElementById("photoPreviewContainer");
  if (previewContainer) previewContainer.style.display = "none";

  populateParentDropdown();
  document.getElementById("formModal").classList.add("active");
}

// Reset/Set Form saat Buka Modal Edit
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
  currentPhotoBase64 = "";

  const previewContainer = document.getElementById("photoPreviewContainer");
  const previewImg = document.getElementById("photoPreview");
  if (member.photo && member.photo.trim() !== "") {
    previewImg.src = member.photo;
    previewContainer.style.display = "block";
  } else {
    previewContainer.style.display = "none";
  }

  populateParentDropdown(member.id);
  document.getElementById("fieldParent").value = member.parentId || "";

  const container = document.getElementById("spousesContainer");
  container.innerHTML = "";
  if (member.pasangan) {
    member.pasangan.forEach(p => addSpouseField(p.nama, p.phone, p.bio));
  }

  document.getElementById("formModal").classList.add("active");
}

// Optimasi Fungsi Simpan Data (Sangat Cepat)
function saveMember(e) {
  e.preventDefault();

  const id = document.getElementById("memberId").value;
  const nama = document.getElementById("fieldName").value;
  const gender = document.getElementById("fieldGender").value;
  const parentId = document.getElementById("fieldParent").value;
  const phone = document.getElementById("fieldPhone").value;
  const existingPhoto = document.getElementById("fieldPhoto").value;
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
    photo: currentPhotoBase64 ? currentPhotoBase64 : existingPhoto, // Kirim foto baru jika diunggah
    bio: bio,
    pasangan: spousesArr
  };

  const submitBtn = e.target.querySelector("button[type='submit']");
  submitBtn.innerText = "Menyimpan...";
  submitBtn.disabled = true;

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
    .catch(err => {
      console.error(err);
      alert("Gagal menyimpan data.");
    })
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
