const API_URL = "https://script.google.com/macros/s/AKfycbz9Mo0dulQR0Ts6uWFJKOsMiS8AzI3dWGufSvZdIul02W8ePjGMd27dQRuKjkk7qA3hRg/exec";

let familyData = {
  keturunan: [],
  pasangan: [],
  anak_pasangan: []
};

document.addEventListener("DOMContentLoaded", () => {
  fetchData();
});

function fetchData() {
  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      familyData = data;
      renderTree();
      populateParentOptions();
    })
    .catch(err => {
      console.error("Gagal mengambil data:", err);
      document.getElementById("treeContainer").innerHTML = "<p>Gagal memuat data. Pastikan URL API sudah benar.</p>";
    });
}

function renderTree() {
  const container = document.getElementById("treeContainer");
  container.innerHTML = "";
  
  // Ambil akar (tidak punya id_orang_tua)
  const root = familyData.keturunan.find(item => !item.id_orang_tua);
  if (root) {
    container.appendChild(createNodeElement(root));
  } else {
    container.innerHTML = "<p>Belum ada data silsilah. Klik tombol 'Tambah Anggota' untuk memulai.</p>";
  }
}

function createNodeElement(person) {
  const node = document.createElement("div");
  node.className = "node";

  const card = document.createElement("div");
  card.className = "card";
  card.onclick = () => openDetailModal(person);

  const photoPath = person.foto_profil || "https://via.placeholder.com/150";
  card.innerHTML = `
    <img src="${photoPath}" alt="${person.nama_lengkap}" onerror="this.src='https://via.placeholder.com/150'">
    <h4>${person.nama_lengkap}</h4>
    <p>Anak ke-${person.urutan_anak}</p>
  `;

  node.appendChild(card);

  // Cari anak-anak langsung
  const children = familyData.keturunan.filter(item => item.id_orang_tua === person.id);
  if (children.length > 0) {
    const childrenContainer = document.createElement("div");
    childrenContainer.className = "children-container";
    children.forEach(child => {
      childrenContainer.appendChild(createNodeElement(child));
    });
    node.appendChild(childrenContainer);
  }

  return node;
}

function openDetailModal(person) {
  const modal = document.getElementById("detailModal");
  const modalBody = document.getElementById("modalBody");

  const personSpouses = familyData.pasangan.filter(sp => sp.id_keturunan_asli === person.id);

  let spouseHTML = "";
  if (personSpouses.length === 0) {
    spouseHTML = "<p><em>Belum ada data pasangan.</em></p>";
  } else {
    personSpouses.forEach(sp => {
      const childRelations = familyData.anak_pasangan.filter(ap => ap.id_pasangan === sp.id);
      const children = familyData.keturunan.filter(k => childRelations.some(cr => cr.id_keturunan_asli === k.id));

      let childrenNames = children.map(c => c.nama_lengkap).join(", ") || "Belum ada data anak";

      spouseHTML += `
        <div class="spouse-section">
          <h4>Pasangan Ke-${sp.urutan_pasangan}: ${sp.nama_pasangan}</h4>
          <p><strong>Bio:</strong> ${sp.bio || '-'}</p>
          <p><strong>Keturunan Dari Pasangan Ini:</strong> ${childrenNames}</p>
        </div>
      `;
    });
  }

  modalBody.innerHTML = `
    <h2>${person.nama_lengkap}</h2>
    <p><strong>Urutan:</strong> Anak ke-${person.urutan_anak}</p>
    <p><strong>Tanggal Lahir:</strong> ${person.tanggal_lahir || '-'}</p>
    <p><strong>Bio:</strong> ${person.bio || '-'}</p>
    <hr style="margin: 15px 0;">
    <h3>Daftar Pasangan & Anak</h3>
    ${spouseHTML}
  `;

  modal.style.display = "flex";
}

function openAddModal() {
  document.getElementById("addModal").style.display = "flex";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

function populateParentOptions() {
  const select = document.getElementById("id_orang_tua");
  select.innerHTML = '<option value="">-- Akar / Anggota Pertama --</option>';
  
  familyData.keturunan.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.nama_lengkap} (${p.id})`;
    select.appendChild(opt);
  });
}

function updatePasanganParentOptions() {
  const parentId = document.getElementById("id_orang_tua").value;
  const pasanganGroup = document.getElementById("pasanganParentGroup");
  const selectPasangan = document.getElementById("id_pasangan_orang_tua");

  selectPasangan.innerHTML = '<option value="">-- Pilih Pasangan Orang Tua --</option>';

  if (!parentId) {
    pasanganGroup.style.display = "none";
    return;
  }

  const spouses = familyData.pasangan.filter(sp => sp.id_keturunan_asli === parentId);
  if (spouses.length > 0) {
    spouses.forEach(sp => {
      const opt = document.createElement("option");
      opt.value = sp.id;
      opt.textContent = `Pasangan Ke-${sp.urutan_pasangan}: ${sp.nama_pasangan}`;
      selectPasangan.appendChild(opt);
    });
    pasanganGroup.style.display = "block";
  } else {
    pasanganGroup.style.display = "none";
  }
}

async function submitForm(event) {
  event.preventDefault();
  const btn = document.getElementById("btnSubmit");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  const fileInput = document.getElementById("foto_file");
  let fileData = null;
  let fileName = "";
  let mimeType = "";

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    fileName = file.name;
    mimeType = file.type;
    fileData = await convertBase64(file);
  }

  const payload = {
    action: "add_keturunan",
    nama_lengkap: document.getElementById("nama_lengkap").value,
    jenis_kelamin: document.getElementById("jenis_kelamin").value,
    id_orang_tua: document.getElementById("id_orang_tua").value,
    id_pasangan_orang_tua: document.getElementById("id_pasangan_orang_tua").value,
    urutan_anak: document.getElementById("urutan_anak").value,
    tanggal_lahir: document.getElementById("tanggal_lahir").value,
    bio: document.getElementById("bio").value,
    nama_pasangan: document.getElementById("nama_pasangan").value,
    fileData: fileData,
    fileName: fileName,
    mimeType: mimeType
  };

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(res => {
    alert(res.message || "Data berhasil disimpan!");
    closeModal("addModal");
    document.getElementById("addForm").reset();
    fetchData();
  })
  .catch(err => {
    console.error("Gagal menyimpan:", err);
    alert("Gagal menyimpan data.");
  })
  .finally(() => {
    btn.disabled = false;
    btn.textContent = "Simpan Data";
  });
}

function convertBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
