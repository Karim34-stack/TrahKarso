const API_URL = ''; // Isi URL Web App Apps Script jika frontend di-host di luar Apps Script.
let state = {members:[]};

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('search').addEventListener('input',render);
  document.getElementById('generation').addEventListener('change',render);
  document.getElementById('limit').addEventListener('change',render);
  document.getElementById('closeModal').onclick=()=>document.getElementById('modal').classList.add('hidden');
  loadData();
});

async function loadData(){
  setStatus('Memuat data...');
  try{
    let data;
    if(API_URL){
      const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'getData'})});
      data=await r.json();
    }else{
      // Untuk deployment Apps Script, ganti fungsi ini dengan google.script.run jika index.html
      // disajikan oleh HtmlService. Versi ini memakai endpoint API agar HTML/CSS/JS terpisah.
      const r=await fetch(location.href,{method:'GET'});
      data=await r.json();
    }
    if(!data.ok) throw new Error(data.error||'Gagal memuat data');
    state.members=data.members||[];
    populateGenerations();
    render();
  }catch(e){
    setStatus('Gagal memuat data. Pastikan URL Web App Apps Script sudah diisi di API_URL.');
  }
}

function populateGenerations(){
  const sel=document.getElementById('generation');
  const vals=[...new Set(state.members.map(m=>String(m.generasi||'')).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
  sel.innerHTML='<option value="">Semua generasi</option>'+vals.map(v=>`<option value="${esc(v)}">Generasi ${esc(v)}</option>`).join('');
}

function render(){
  const q=document.getElementById('search').value.trim().toLowerCase();
  const gen=document.getElementById('generation').value;
  const limit=Number(document.getElementById('limit').value||0);

  let filtered=state.members.filter(m=>{
    const text=(m.nama||'').toLowerCase();
    return (!q||text.includes(q)) && (!gen||String(m.generasi||'')===gen) && String(m.aktif)!=='false';
  });
  if(limit) filtered=filtered.slice(0,limit);

  const ids=new Set(filtered.map(m=>String(m.id)));
  const roots=filtered.filter(m=>!m.orang_tua_id || !ids.has(String(m.orang_tua_id)));

  const tree=document.getElementById('tree');
  tree.innerHTML='';
  if(!filtered.length){setStatus('Tidak ada anggota yang sesuai filter.');return;}
  setStatus(`${filtered.length} anggota ditampilkan. Pasangan tidak menjadi node pohon.`);

  const row=document.createElement('div');
  row.className='generation-row';
  roots.forEach(r=>row.appendChild(buildNode(r,filtered,0)));
  tree.appendChild(row);
}

function buildNode(member,all,depth){
  const node=document.createElement('div');node.className='node';
  node.appendChild(card(member));
  const children=all.filter(x=>String(x.orang_tua_id||'')===String(member.id));
  if(children.length){
    const line=document.createElement('div');line.className='child-line';node.appendChild(line);
    const row=document.createElement('div');row.className='generation-row';row.style.margin='20px 0 0';
    children.sort((a,b)=>Number(a.anak_ke||999)-Number(b.anak_ke||999));
    children.forEach(c=>row.appendChild(buildNode(c,all,depth+1)));
    node.appendChild(row);
  }
  return node;
}

function card(m){
  const el=document.createElement('div');el.className='card';
  const img=m.foto_url||'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#edf1f7"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#8993a5" font-size="24">Foto</text></svg>`);
  const status=(m.status_hidup||'Hidup').toLowerCase();
  const dead=status==='wafat';
  const spouses=(m.pasangan||[]).sort((a,b)=>Number(a.urutan||0)-Number(b.urutan||0));
  el.innerHTML=`<img class="photo" src="${escAttr(img)}" alt="Foto">
    <div class="info">
      <div class="name">${esc(m.nama)}</div>
      <div class="child-order">${m.anak_ke?`Anak ke-${esc(m.anak_ke)}`:'Urutan anak belum diisi'}</div>
      <span class="status-life ${dead?'dead':'alive'}">${dead?'⚫ Wafat':'🟢 Hidup'}${dead&&m.tanggal_wafat?' · '+formatDate(m.tanggal_wafat):''}</span>
      ${m.bio?`<div class="bio">${esc(m.bio)}</div>`:''}
      <div class="footer-spouses"><strong>Pasangan:</strong> ${spouses.length?spouses.map((s,i)=>`Istri ${i+1}: ${esc(s.nama_pasangan)}`).join(' · '):'Belum ada data'}</div>
    </div>`;
  el.onclick=()=>openDetail(m);
  return el;
}

function openDetail(m){
  const spouses=m.pasangan||[];
  const children=state.members.filter(x=>String(x.orang_tua_id||'')===String(m.id))
    .sort((a,b)=>Number(a.anak_ke||999)-Number(b.anak_ke||999));
  const grandchildren=children.flatMap(c=>state.members.filter(x=>String(x.orang_tua_id||'')===String(c.id)));
  const dead=(m.status_hidup||'').toLowerCase()==='wafat';
  document.getElementById('detail').innerHTML=`
    <div class="detail-head">
      <img src="${escAttr(m.foto_url||'')}" onerror="this.style.display='none'">
      <div><h2>${esc(m.nama)}</h2><span class="badge">${m.anak_ke?'Anak ke-'+esc(m.anak_ke):'Anak ke-?'}</span>
      <div class="status-life ${dead?'dead':'alive'}">${dead?'⚫ Wafat':'🟢 Hidup'}${dead&&m.tanggal_wafat?' · '+formatDate(m.tanggal_wafat):''}</div></div>
    </div>
    <div class="detail-section"><h3>Bio</h3><p>${esc(m.bio||'Belum ada bio.')}</p></div>
    <div class="detail-section"><h3>Pasangan</h3><div class="spouse-list">${spouses.length?spouses.map((s,i)=>`<div class="pill">Istri ${i+1}: ${esc(s.nama_pasangan)}</div>`).join(''):'Belum ada data pasangan.'}</div></div>
    <div class="detail-section"><h3>Anak</h3><div class="desc-list">${children.length?children.map(x=>`<div class="pill">${esc(x.nama)}</div>`).join(''):'Belum ada data anak.'}</div></div>
    <div class="detail-section"><h3>Cucu</h3><div class="desc-list">${grandchildren.length?grandchildren.map(x=>`<div class="pill">${esc(x.nama)}</div>`).join(''):'Belum ada data cucu.'}</div></div>`;
  document.getElementById('modal').classList.remove('hidden');
}

function setStatus(s){document.getElementById('status').textContent=s}
function formatDate(v){try{return new Date(v).toLocaleDateString('id-ID')}catch(e){return v}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escAttr(v){return esc(v).replace(/`/g,'&#96;')}
