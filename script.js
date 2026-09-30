// ⚠️ MASUKKAN URL WEB APP GOOGLE APPS SCRIPT ANDA DI SINI
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzj3CW4-3yxXXRs30R6yKjlYCtK15NmHj6J3FxwRSAvhntsXQYbF0LB4tLDEV4s7OYxPg/exec";

let members = [];
let adminToken = sessionStorage.getItem("silsilah_admin_token") || "";
let selectedId = null;
let currentPhotoData = "";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  updateAdminUI();
  loadData();
});

function bindEvents() {
  $("btnRefresh").onclick = loadData;
  $("btnLogin").onclick = () => openModal("loginModal");
  $("btnLogout").onclick = logout;
  $("btnAdd").onclick = () => openForm();
  $("searchInput").oninput = render;
  $("generationFilter").onchange = render;
  $("genderFilter").onchange = render;
  $("personForm").onsubmit = submitPerson;
  $("loginForm").onsubmit = submitLogin;
  $("fPhoto").onchange = previewPhoto;

  document.querySelectorAll("[data-close]").forEach((b) => {
    b.onclick = () => closeModal(b.dataset.close);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      document
        .querySelectorAll(".modal:not(.hidden)")
        .forEach((m) => m.classList.add("hidden"));
  });
}

function gas(fn, ...args) {
  return new Promise((resolve, reject) => {
    if (!window.google || !google.script || !google.script.run) {
      reject(
        new Error(
          "API Apps Script tidak tersedia. Pastikan website dibuka dari Web App Apps Script.",
        ),
      );
      return;
    }
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler((err) => {
        reject(new Error(err && err.message ? err.message : String(err)));
      })
      [fn](...args);
  });
}

async function loadData() {
  setStatus("Memuat data...");
  try {
    members = await gas("getData");
    normalizeMembers();
    buildGenerationFilter();
    render();
    setStatus("Data berhasil dimuat");
  } catch (e) {
    setStatus("Gagal memuat: " + e.message);
    toast(e.message);
  }
}

function normalizeMembers() {
  members = (members || []).map((m) => ({
    ...m,
    id: String(m.id || ""),
    nama: String(m.nama || ""),
    ayah: String(m.ayah || ""),
    ibu: String(m.ibu || ""),
    pasangan: String(m.pasangan || ""),
    jenisKelamin: String(m.jenisKelamin || ""),
    tanggalLahir: String(m.tanggalLahir || ""),
    hubungan: String(m.hubungan || ""),
    alamat: String(m.alamat || ""),
    deskripsi: String(m.deskripsi || ""),
    foto: String(m.foto || ""),
    noHp: extractPhone(m.deskripsi),
  }));
}

function extractPhone(desc) {
  const m = String(desc || "").match(/\[HP:([^\]]*)\]/i);
  return m ? m[1].trim() : "";
}
function cleanDescription(desc) {
  return String(desc || "")
    .replace(/^\s*\[HP:[^\]]*\]\s*/i, "")
    .trim();
}

function buildGenerationFilter() {
  const sel = $("generationFilter");
  const old = sel.value;
  const gens = [
    ...new Set(members.map(getGeneration).filter((n) => n > 0)),
  ].sort((a, b) => a - b);
  sel.innerHTML =
    '<option value="all">Semua generasi</option>' +
    gens.map((g) => `<option value="${g}">Generasi ${g}</option>`).join("");
  if (gens.includes(Number(old))) sel.value = old;
}

function getGeneration(person) {
  const memo = new Map();
  function calc(p, stack = []) {
    if (!p) return 1;
    if (memo.has(p.id)) return memo.get(p.id);
    if (stack.includes(p.id)) return 1;
    const father = find(p.ayah),
      mother = find(p.ibu);
    const parents = [father, mother].filter(Boolean);
    if (!parents.length) {
      memo.set(p.id, 1);
      return 1;
    }
    const g = Math.max(...parents.map((x) => calc(x, [...stack, p.id]))) + 1;
    memo.set(p.id, g);
    return g;
  }
  return calc(person);
}

function find(id) {
  return members.find((m) => m.id === String(id));
}
function spouseIds(p) {
  return String(p?.pasangan || "")
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}
function spousesOf(p) {
  const ids = new Set(spouseIds(p));
  members.forEach((x) => {
    if (spouseIds(x).includes(p.id)) ids.add(x.id);
  });
  return [...ids]
    .map(find)
    .filter(Boolean)
    .filter((x) => x.id !== p.id);
}
function childrenOf(p) {
  return members
    .filter((x) => String(x.ayah) === p.id || String(x.ibu) === p.id)
    .sort(sortBirth);
}
function sortBirth(a, b) {
  const da = a.tanggalLahir ? new Date(a.tanggalLahir).getTime() : Infinity;
  const db = b.tanggalLahir ? new Date(b.tanggalLahir).getTime() : Infinity;
  return da - db || a.nama.localeCompare(b.nama, "id");
}
function roots() {
  // Akar biologis: anggota yang tidak memiliki ayah/ibu di database.
  // Pasangan tetap bukan node pohon utama.
  return members.filter((p) => !find(p.ayah) && !find(p.ibu)).sort(sortBirth);
}

function render() {
  const q = $("searchInput").value.trim().toLowerCase();
  const g = $("generationFilter").value;
  const gender = $("genderFilter").value;

  let visible = members.filter((p) => {
    const text = [p.nama, p.hubungan, p.noHp, p.alamat].join(" ").toLowerCase();
    return (
      (!q || text.includes(q)) &&
      (gender === "all" || p.jenisKelamin === gender) &&
      (g === "all" || getGeneration(p) === Number(g))
    );
  });

  $("totalMembers").textContent = members.length;
  $("shownMembers").textContent = visible.length;
  $("shownGeneration").textContent = g === "all" ? "Semua" : "Generasi " + g;
  $("bloodMembers").textContent = members.length;

  const tree = $("tree");
  if (!members.length) {
    tree.innerHTML = "";
    $("emptyState").classList.remove("hidden");
    return;
  }
  $("emptyState").classList.add("hidden");

  // Jika ada pencarian, tampilkan hasil yang cocok sebagai kartu keturunan.
  if (q || g !== "all" || gender !== "all") {
    const grouped = {};
    visible.forEach((p) => {
      const gen = getGeneration(p);
      (grouped[gen] ??= []).push(p);
    });
    tree.innerHTML = Object.keys(grouped)
      .sort((a, b) => a - b)
      .map((gen) => {
        return `<div class="generation-row"><div class="gen-label">Generasi ${gen}</div>${grouped[gen].map(cardHTML).join("")}</div>`;
      })
      .join("");
    return;
  }

  const rs = roots();
  tree.innerHTML = rs.map((root) => renderRootBranch(root)).join("");
}

function renderRootBranch(root) {
  const levels = [];
  const seen = new Set();
  function walk(list, depth) {
    if (!list.length || depth > 30) return;
    levels[depth] ??= [];
    list.forEach((p) => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      levels[depth].push(p);
    });
    const next = list.flatMap(childrenOf);
    walk(next, depth + 1);
  }
  walk([root], 1);

  return levels
    .map((list, i) => {
      const gen = i + 1;
      const html = list.map(cardHTML).join("");
      return `<div class="generation-row"><div class="gen-label">Generasi ${gen}</div>${html}</div>`;
    })
    .join("");
}

function cardHTML(p) {
  const photo = p.foto
    ? `<img src="${escAttr(photoUrl(p.foto))}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : "";
  const avatar = `<div class="avatar" style="${p.foto ? "display:none" : ""}">${p.jenisKelamin === "Perempuan" ? "👩" : "👨"}</div>`;
  const admin = adminToken
    ? `<div class="card-actions">
    <button class="btn ghost" onclick="event.stopPropagation();openForm('${esc(p.id)}')">Edit</button>
    <button class="btn danger" onclick="event.stopPropagation();removePerson('${esc(p.id)}')">Hapus</button>
  </div>`
    : "";
  return `<article class="member-card clickable" onclick="openDetail('${esc(p.id)}')">
    <div class="member-photo">${photo}${avatar}</div>
    <div class="member-name">${esc(p.nama)}</div>
    <div class="member-meta">${esc(p.hubungan || "")} ${p.tanggalLahir ? "• " + formatDate(p.tanggalLahir) : ""}</div>
    ${p.noHp ? `<div class="phone">☎ ${esc(p.noHp)}</div>` : ""}
    ${admin}
  </article>`;
}

function openDetail(id) {
  const p = find(id);
  if (!p) return;
  selectedId = id;
  const sp = spousesOf(p),
    kids = childrenOf(p);
  const desc = cleanDescription(p.deskripsi);
  $("detailContent").innerHTML = `
    <div class="detail-head">
      <div class="detail-photo">${p.foto ? `<img src="${escAttr(photoUrl(p.foto))}" onerror="this.outerHTML='<div class=avatar>👤</div>'">` : '<div class="avatar">👤</div>'}</div>
      <div class="detail-title">
        <h2>${esc(p.nama)}</h2>
        <div class="muted">Generasi ${getGeneration(p)} ${p.hubungan ? "• " + esc(p.hubungan) : ""}</div>
        ${p.noHp ? `<div class="phone">☎ ${esc(p.noHp)}</div>` : ""}
      </div>
      <div class="detail-actions">
        ${adminToken ? `<button class="btn primary" onclick="openForm('${esc(p.id)}')">Edit</button><button class="btn danger" onclick="removePerson('${esc(p.id)}')">Hapus</button>` : ""}
        <button class="btn ghost" onclick="openForm('', '${esc(p.id)}')">＋ Tambah data</button>
      </div>
    </div>
    <div class="detail-grid">
      <section class="detail-section"><h3>Pasangan (${sp.length})</h3>
        <div class="person-list">${sp.length ? sp.map(miniHTML).join("") : '<span class="muted">Belum ada pasangan tercatat.</span>'}</div>
      </section>
      <section class="detail-section"><h3>Anak langsung (${kids.length})</h3>
        <div class="person-list">${kids.length ? kids.map(miniHTML).join("") : '<span class="muted">Belum ada anak tercatat.</span>'}</div>
      </section>
      <section class="detail-section full"><h3>Anak → cucu → keturunan</h3>
        <div id="descTree">${descendantHTML(p, 0, new Set())}</div>
      </section>
      <section class="detail-section"><h3>Orang tua</h3>
        <div class="person-list">${[find(p.ayah), find(p.ibu)].filter(Boolean).map(miniHTML).join("") || '<span class="muted">Belum tercatat.</span>'}</div>
      </section>
      <section class="detail-section"><h3>Informasi</h3>
        <div class="desc">${esc(p.alamat)}${p.alamat ? "<br>" : ""}${esc(desc)}</div>
      </section>
    </div>`;
  openModal("detailModal");
}

function descendantHTML(p, depth, seen) {
  if (depth > 12) return "";
  const kids = childrenOf(p);
  if (!kids.length)
    return depth === 0 ? '<span class="muted">Belum ada keturunan.</span>' : "";
  return `<div style="margin-left:${Math.min(depth * 18, 180)}px;margin-bottom:10px">
    ${kids
      .map(
        (
          c,
        ) => `<div class="mini-person" style="display:inline-block;margin:3px;cursor:pointer" onclick="openDetail('${esc(c.id)}')">
      <strong>${esc(c.nama)}</strong><span>Generasi ${getGeneration(c)}${c.noHp ? " • " + esc(c.noHp) : ""}</span>
      ${descendantHTML(c, depth + 1, seen)}
    </div>`,
      )
      .join("")}
  </div>`;
}
function miniHTML(p) {
  return `<div class="mini-person" onclick="openDetail('${esc(p.id)}')" style="cursor:pointer">
    <strong>${esc(p.nama)}</strong><span>${esc(p.hubungan || "")}${p.tanggalLahir ? " • " + formatDate(p.tanggalLahir) : ""}</span>
  </div>`;
}

function openForm(editId = "", parentId = "") {
  if (editId && !adminToken) {
    toast("Login admin diperlukan untuk edit.");
    return;
  }
  selectedId = editId || null;
  $("formTitle").textContent = editId ? "Edit Anggota" : "Tambah Anggota";
  $("fId").value = editId || "";
  fillRelationOptions();
  if (editId) {
    const p = find(editId);
    $("fNama").value = p.nama || "";
    $("fGender").value = p.jenisKelamin || "";
    $("fBirth").value = normalizeDateInput(p.tanggalLahir);
    $("fRelation").value = p.hubungan || "";
    $("fPhone").value = p.noHp || "";
    $("fFather").value = p.ayah || "";
    $("fMother").value = p.ibu || "";
    const ids = spouseIds(p);
    [...$("fSpouses").options].forEach(
      (o) => (o.selected = ids.includes(o.value)),
    );
    $("fAddress").value = p.alamat || "";
    $("fDescription").value = cleanDescription(p.deskripsi);
    currentPhotoData = p.foto || "";
    $("photoPreview").innerHTML = p.foto
      ? `<img src="${escAttr(photoUrl(p.foto))}">`
      : "";
  } else {
    $("personForm").reset();
    currentPhotoData = "";
    $("photoPreview").innerHTML = "";
    if (parentId) {
      const parent = find(parentId);
      if (parent) {
        if (parent.jenisKelamin === "Laki-laki") $("fFather").value = parent.id;
        else if (parent.jenisKelamin === "Perempuan")
          $("fMother").value = parent.id;
      }
    }
  }
  $("formNotice").classList.add("hidden");
  closeModal("detailModal");
  openModal("formModal");
}

function fillRelationOptions() {
  const opts =
    '<option value="">- Tidak diketahui -</option>' +
    members
      .map((p) => `<option value="${escAttr(p.id)}">${esc(p.nama)}</option>`)
      .join("");
  $("fFather").innerHTML = opts;
  $("fMother").innerHTML = opts;
  $("fSpouses").innerHTML = members
    .map((p) => `<option value="${escAttr(p.id)}">${esc(p.nama)}</option>`)
    .join("");
}

async function submitPerson(e) {
  e.preventDefault();
  const id = $("fId").value;
  if (id && !adminToken) return;
  const file = $("fPhoto").files[0];
  try {
    let photo = currentPhotoData;
    if (file) {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Foto terlalu besar. Maksimal 5 MB.");
      if (!adminToken)
        throw new Error("Upload foto saat ini hanya untuk admin.");
      const base64 = await fileToDataURL(file);
      const up = await gas("uploadPhoto", base64, file.name, adminToken);
      photo = up.url;
    }
    const spouses = [...$("fSpouses").selectedOptions]
      .map((o) => o.value)
      .join(",");
    const data = {
      id,
      nama: $("fNama").value.trim(),
      jenisKelamin: $("fGender").value,
      tanggalLahir: $("fBirth").value,
      hubungan: $("fRelation").value.trim(),
      ayah: $("fFather").value,
      ibu: $("fMother").value,
      pasangan: spouses,
      alamat: $("fAddress").value.trim(),
      deskripsi: $("fDescription").value.trim(),
      noHp: $("fPhone").value.trim(),
      foto: photo,
    };
    const res = await gas("savePerson", data, adminToken);
    toast(id ? "Data berhasil diperbarui." : "Anggota berhasil ditambahkan.");
    closeModal("formModal");
    await loadData();
    if (res.person) openDetail(res.person.id);
  } catch (err) {
    $("formNotice").textContent = err.message;
    $("formNotice").classList.remove("hidden");
  }
}

async function removePerson(id) {
  if (!adminToken) {
    toast("Login admin diperlukan.");
    return;
  }
  const p = find(id);
  if (!p) return;
  if (!confirm(`Hapus data ${p.nama}? Tindakan ini tidak dapat dibatalkan.`))
    return;
  try {
    await gas("deletePerson", id, adminToken);
    closeModal("detailModal");
    toast("Data berhasil dihapus.");
    await loadData();
  } catch (e) {
    toast(e.message);
  }
}

async function submitLogin(e) {
  e.preventDefault();
  try {
    const res = await gas("login", $("loginUser").value, $("loginPass").value);
    if (!res.ok) throw new Error(res.message);
    adminToken = res.token;
    sessionStorage.setItem("silsilah_admin_token", adminToken);
    closeModal("loginModal");
    updateAdminUI();
    render();
    toast("Login admin berhasil.");
  } catch (e) {
    $("loginNotice").textContent = e.message;
    $("loginNotice").classList.remove("hidden");
  }
}
async function logout() {
  try {
    await gas("logout", adminToken);
  } catch (e) {}
  adminToken = "";
  sessionStorage.removeItem("silsilah_admin_token");
  updateAdminUI();
  render();
  toast("Logout berhasil.");
}
function updateAdminUI() {
  $("btnLogin").classList.toggle("hidden", !!adminToken);
  $("btnLogout").classList.toggle("hidden", !adminToken);
}

function previewPhoto() {
  const file = $("fPhoto").files[0];
  if (!file) {
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast("Foto terlalu besar. Maksimal 5 MB.");
    $("fPhoto").value = "";
    return;
  }
  const r = new FileReader();
  r.onload = () => {
    $("photoPreview").innerHTML = `<img src="${r.result}">`;
  };
  r.readAsDataURL(file);
}
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function photoUrl(v) {
  const s = String(v || "");
  if (s.includes("drive.google.com/thumbnail")) return s;
  const m = s.match(/[-\w]{25,}/);
  return m ? `https://drive.google.com/thumbnail?id=${m[0]}&sz=w1200` : s;
}
function normalizeDateInput(v) {
  const s = String(v || "");
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatDate(v) {
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function openModal(id) {
  $(id).classList.remove("hidden");
}
function closeModal(id) {
  $(id).classList.add("hidden");
}
function setStatus(s) {
  $("statusText").textContent = s;
}
function toast(s) {
  $("toast").textContent = s;
  $("toast").classList.remove("hidden");
  setTimeout(() => $("toast").classList.add("hidden"), 3200);
}
function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function escAttr(s) {
  return esc(s);
}
window.openDetail = openDetail;
window.openForm = openForm;
window.removePerson = removePerson;
