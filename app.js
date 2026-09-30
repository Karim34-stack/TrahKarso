/**
 * Aplikasi Silsilah Keluarga Interaktif - Google Sheets Bridge
 */

// Initial Presets / State
let familyTree = [
  {
    id: "1",
    nama: "H. Raden Soetomo",
    gelar: "Kepala Keluarga I",
    gender: "L",
    generasi: 1,
    parentId: null,
    noHp: "081234567890",
    foto: "foto_profil/soetomo.jpg",
    pasangan: [
      { id: "p1_1", urutan: 1, nama: "Hj. Siti Aminah", gender: "P", noHp: "081234567891", status: "Menikah", foto: "foto_profil/siti.jpg" },
      { id: "p1_2", urutan: 2, nama: "Hj. Endang Rahayu", gender: "P", noHp: "081234567892", status: "Menikah", foto: "foto_profil/endang.jpg" }
    ]
  },
  {
    id: "2",
    nama: "Bambang Soetomo",
    gelar: "Anak I (Istri 1)",
    gender: "L",
    generasi: 2,
    parentId: "1",
    noHp: "081399887766",
    foto: "foto_profil/bambang.jpg",
    pasangan: [
      { id: "p2_1", urutan: 1, nama: "Dewi Lestari", gender: "P", noHp: "081399887767", status: "Menikah", foto: "foto_profil/dewi.jpg" }
    ]
  },
  {
    id: "3",
    nama: "Siti Nurhaliza Soetomo",
    gelar: "Anak II (Istri 2)",
    gender: "P",
    generasi: 2,
    parentId: "1",
    noHp: "081511223344",
    foto: "foto_profil/sitinur.jpg",
    pasangan: []
  }
];

let isAdmin = false;
let currentGenFilter = "ALL";
let scriptUrl = localStorage.getItem("gs_script_url") || "";

// Transform Zoom Canvas State
let scale = 1;
let pointX = 0;
let pointY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

// DOM Elements
const canvasContainer = document.getElementById("canvasContainer");
const treeCanvas = document.getElementById("treeCanvas");
const treeNodes = document.getElementById("treeNodes");
const svgLines = document.getElementById("svgLines");

// App Init
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  
  // Set saved script URL
  if(scriptUrl) {
    document.getElementById("scriptUrlInput").value = scriptUrl;
    fetchFromGoogleSheets();
  } else {
    renderApp();
  }

  setupCanvasEvents();
  setupEventListeners();
});

// --- RENDERER ENGINE ---
function renderApp() {
  updateStats();
  populateGenFilterDropdown();
  renderTree();
  lucide.createIcons();
}

function renderTree() {
  treeNodes.innerHTML = "";
  
  // Group members by Generation
  const genMap = {};
  familyTree.forEach(m => {
    if (!genMap[m.generasi]) genMap[m.generasi] = [];
    genMap[m.generasi].push(m);
  });

  const sortedGens = Object.keys(genMap).map(Number).sort((a, b) => a - b);

  let treeHTML = `<div class="flex flex-col items-center space-y-20">`;

  sortedGens.forEach(gen => {
    const members = genMap[gen];
    const isFiltered = currentGenFilter !== "ALL" && Number(currentGenFilter) !== gen;

    treeHTML += `
      <div class="flex flex-col items-center space-y-3 transition-opacity duration-300 ${isFiltered ? 'opacity-20 grayscale' : 'opacity-100'}">
        <div class="px-3 py-1 bg-slate-800 border border-cyan-500/30 rounded-full text-[11px] font-bold text-cyan-400 tracking-wider">
          GENERASI ${gen}
        </div>
        <div class="flex items-center justify-center gap-12 flex-wrap">
          ${members.map(m => createCardHTML(m)).join('')}
        </div>
      </div>
    `;
  });

  treeHTML += `</div>`;
  treeNodes.innerHTML = treeHTML;

  setTimeout(drawConnectiveLines, 50);
}

function createCardHTML(m) {
  const hasPasangan = m.pasangan && m.pasangan.length > 0;
  
  return `
    <div id="node-${m.id}" data-id="${m.id}" class="tree-card relative bg-slate-800/90 border-2 ${m.gender === 'L' ? 'border-sky-500/60' : 'border-pink-500/60'} rounded-2xl p-4 w-64 shadow-xl cursor-pointer group">
      
      <!-- Admin Action Buttons -->
      ${isAdmin ? `
        <div class="absolute -top-2 -right-2 flex space-x-1 z-20">
          <button onclick="event.stopPropagation(); openEditForm('${m.id}')" class="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-md transition">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="event.stopPropagation(); deleteMember('${m.id}')" class="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-md transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      ` : ''}

      <div onclick="openBreakdownModal('${m.id}')" class="flex flex-col items-center text-center space-y-2">
        <div class="relative">
          <img src="${m.foto || 'https://via.placeholder.com/80'}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.nama)}&background=0D8ABC&color=fff'" 
               class="w-16 h-16 rounded-full object-cover border-2 ${m.gender === 'L' ? 'border-sky-400' : 'border-pink-400'} shadow-md">
          ${hasPasangan ? `
            <span class="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-pink-600 text-white text-[10px] font-bold rounded-full border border-slate-900 shadow">
              ${m.pasangan.length} 💍
            </span>
          ` : ''}
        </div>

        <div>
          <h4 class="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">${m.nama}</h4>
          ${m.gelar ? `<p class="text-[10px] text-slate-400">${m.gelar}</p>` : ''}
        </div>

        ${m.noHp ? `
          <a href="https://wa.me/${m.noHp.replace(/[^0-9]/g, '')}" target="_blank" onclick="event.stopPropagation();" 
             class="inline-flex items-center space-x-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-full transition">
            <i data-lucide="phone" class="w-3 h-3"></i>
            <span>${m.noHp}</span>
          </a>
        ` : ''}
      </div>
    </div>
  `;
}

// Connective Curved SVG Lines between Generations
function drawConnectiveLines() {
  svgLines.innerHTML = "";
  const canvasRect = treeCanvas.getBoundingClientRect();
  svgLines.setAttribute("width", canvasRect.width);
  svgLines.setAttribute("height", canvasRect.height);

  familyTree.forEach(m => {
    if (m.parentId) {
      const parentEl = document.getElementById(`node-${m.parentId}`);
      const childEl = document.getElementById(`node-${m.id}`);

      if (parentEl && childEl) {
        const pRect = parentEl.getBoundingClientRect();
        const cRect = childEl.getBoundingClientRect();

        const x1 = (pRect.left + pRect.width / 2 - canvasRect.left) / scale;
        const y1 = (pRect.bottom - canvasRect.top) / scale;
        const x2 = (cRect.left + cRect.width / 2 - canvasRect.left) / scale;
        const y2 = (cRect.top - canvasRect.top) / scale;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const dy = y2 - y1;
        const d = `M ${x1} ${y1} C ${x1} ${y1 + dy / 2}, ${x2} ${y2 - dy / 2}, ${x2} ${y2}`;
        
        path.setAttribute("d", d);
        path.setAttribute("class", "tree-line");
        svgLines.appendChild(path);
      }
    }
  });
}

// --- MODAL BREAKDOWN DETAILS ---
function openBreakdownModal(id) {
  const m = familyTree.find(x => x.id === id);
  if (!m) return;

  const header = document.getElementById("modalHeaderProfile");
  header.innerHTML = `
    <img src="${m.foto}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.nama)}'" class="w-12 h-12 rounded-full border-2 ${m.gender === 'L' ? 'border-sky-400' : 'border-pink-400'}">
    <div>
      <h3 class="text-sm font-bold text-white">${m.nama}</h3>
      <p class="text-xs text-cyan-400 font-medium">Generasi ${m.generasi} (Keturunan Asli)</p>
    </div>
  `;

  const body = document.getElementById("modalBodyContent");
  let content = "";

  if (!m.pasangan || m.pasangan.length === 0) {
    content = `<div class="text-center py-8 text-slate-400 text-xs">Belum ada data pasangan tercatat.</div>`;
  } else {
    m.pasangan.forEach(p => {
      // Find children from this parent
      const anakList = familyTree.filter(c => c.parentId === m.id);

      content += `
        <div class="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <div class="flex items-center space-x-3">
              <span class="px-2 py-0.5 bg-pink-900/60 text-pink-300 border border-pink-700/50 text-[10px] font-bold rounded">
                Pasangan #${p.urutan}
              </span>
              <h4 class="text-xs font-bold text-white">${p.nama}</h4>
            </div>
            ${p.noHp ? `<span class="text-xs text-emerald-400 font-medium">📱 ${p.noHp}</span>` : ''}
          </div>

          <div>
            <h5 class="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1">
              <i data-lucide="baby" class="w-3.5 h-3.5 text-cyan-400"></i>
              <span>Anak & Cucu (${anakList.length} Anak)</span>
            </h5>
            
            ${anakList.length === 0 ? '<p class="text-[11px] text-slate-500 italic">Belum ada data anak.</p>' : `
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                ${anakList.map(a => {
                  const cucuList = familyTree.filter(cc => cc.parentId === a.id);
                  return `
                    <div class="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/50 flex flex-col justify-between">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-cyan-300">${a.nama}</span>
                        <span class="text-[10px] text-slate-400">Gen ${a.generasi}</span>
                      </div>
                      ${cucuList.length > 0 ? `
                        <div class="mt-1.5 pt-1.5 border-t border-slate-700/40 text-[10px] text-slate-400">
                          <strong>Cucu (${cucuList.length}):</strong>${cucuList.map(c => c.nama).join(', ')}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      `;
    });
  }

  body.innerHTML = content;
  document.getElementById("modalBreakdown").classList.remove("hidden");
  lucide.createIcons();
}

// --- GOOGLE SHEETS API INTEGRATION ---
async function fetchFromGoogleSheets() {
  if (!scriptUrl) return;
  setSyncStatus("loading", "Fetching...");

  try {
    const res = await fetch(scriptUrl);
    const result = await res.json();
    if (result.status === "success" && Array.isArray(result.data)) {
      familyTree = result.data;
      renderApp();
      setSyncStatus("success", "Synced");
    } else {
      setSyncStatus("error", "Error Data");
    }
  } catch (err) {
    console.error(err);
    setSyncStatus("error", "Failed");
  }
}

async function syncToGoogleSheets() {
  if (!scriptUrl) {
    alert("Masukkan URL Google Apps Script terlebih dahulu di baris atas.");
    return;
  }

  setSyncStatus("loading", "Saving...");

  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "SYNC_ALL", data: familyTree })
    });
    const result = await res.json();
    if (result.status === "success") {
      setSyncStatus("success", "Saved!");
    } else {
      setSyncStatus("error", "Save Failed");
    }
  } catch (err) {
    console.error(err);
    setSyncStatus("error", "Error Sync");
  }
}

function setSyncStatus(state, text) {
  const icon = document.getElementById("syncIcon");
  const label = document.getElementById("syncText");
  label.innerText = text;

  if (state === "loading") {
    icon.className = "w-3.5 h-3.5 text-amber-400 animate-spin";
  } else if (state === "success") {
    icon.className = "w-3.5 h-3.5 text-emerald-400";
  } else {
    icon.className = "w-3.5 h-3.5 text-rose-400";
  }
}

// --- STATS & UTILS ---
function updateStats() {
  const totalKeturunan = familyTree.length;
  let totalPasangan = 0;
  familyTree.forEach(m => {
    if (m.pasangan) totalPasangan += m.pasangan.length;
  });

  document.getElementById("statTotal").innerText = totalKeturunan + totalPasangan;
  document.getElementById("statKeturunan").innerText = totalKeturunan;
  document.getElementById("statPasangan").innerText = totalPasangan;
}

function populateGenFilterDropdown() {
  const select = document.getElementById("genFilterSelect");
  const gens = [...new Set(familyTree.map(m => m.generasi))].sort((a,b)=>a-b);
  
  select.innerHTML = `<option value="ALL">Semua Generasi</option>`;
  gens.forEach(g => {
    select.innerHTML += `<option value="${g}" ${currentGenFilter == g ? 'selected' : ''}>Generasi ${g}</option>`;
  });
}

// --- CANVAS PAN & ZOOM CONTROLLER ---
function setupCanvasEvents() {
  canvasContainer.addEventListener("mousedown", e => {
    if (e.target.closest('.tree-card')) return;
    isPanning = true;
    startX = e.clientX - pointX;
    startY = e.clientY - pointY;
    treeCanvas.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", e => {
    if (!isPanning) return;
    pointX = e.clientX - startX;
    pointY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener("mouseup", () => {
    isPanning = false;
    treeCanvas.style.cursor = "grab";
  });

  canvasContainer.addEventListener("wheel", e => {
    e.preventDefault();
    const xs = (e.clientX - pointX) / scale;
    const ys = (e.clientY - pointY) / scale;
    const delta = -e.deltaY;
    (delta > 0) ? (scale *= 1.1) : (scale /= 1.1);
    scale = Math.min(Math.max(0.3, scale), 2.5);
    pointX = e.clientX - xs * scale;
    pointY = e.clientY - ys * scale;
    updateTransform();
  }, { passive: false });
}

function updateTransform() {
  treeCanvas.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

// --- DOM EVENT LISTENERS ---
function setupEventListeners() {
  // Admin Toggle
  document.getElementById("adminToggle").addEventListener("change", e => {
    isAdmin = e.target.checked;
    document.getElementById("toggleBg").className = `w-8 h-4 rounded-full transition-colors relative ${isAdmin ? 'bg-cyan-600' : 'bg-slate-700'}`;
    document.getElementById("toggleDot").className = `w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform ${isAdmin ? 'transform translate-x-4' : ''}`;
    document.getElementById("adminLabel").innerText = isAdmin ? "Admin On" : "Admin Off";
    document.getElementById("btnTambahTop").classList.toggle("hidden", !isAdmin);
    renderApp();
  });

  // Filter Generasi
  document.getElementById("genFilterSelect").addEventListener("change", e => {
    currentGenFilter = e.target.value;
    renderApp();
  });

  // Save Script URL
  document.getElementById("btnSaveScriptUrl").addEventListener("click", () => {
    const url = document.getElementById("scriptUrlInput").value.trim();
    scriptUrl = url;
    localStorage.setItem("gs_script_url", url);
    fetchFromGoogleSheets();
  });

  // Sync Button Click
  document.getElementById("btnSyncSheets").addEventListener("click", syncToGoogleSheets);

  // Modal Close
  document.getElementById("btnCloseModal").addEventListener("click", () => {
    document.getElementById("modalBreakdown").classList.add("hidden");
  });

  // Zoom Buttons
  document.getElementById("btnZoomIn").onclick = () => { scale = Math.min(2.5, scale * 1.2); updateTransform(); };
  document.getElementById("btnZoomOut").onclick = () => { scale = Math.max(0.3, scale / 1.2); updateTransform(); };
  document.getElementById("btnResetZoom").onclick = () => { scale = 1; pointX = 0; pointY = 0; updateTransform(); };
}
