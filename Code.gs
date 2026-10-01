const CONFIG = {
  ROOT_FOLDER_NAME: 'Silsilah Keluarga',
  PHOTO_FOLDER_NAME: 'Foto Anggota',
  SPREADSHEET_NAME: 'Database Silsilah Keluarga',
  SHEETS: {
    MEMBERS: 'Anggota',
    SPOUSES: 'Pasangan'
  }
};

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ok:true, message:'API Silsilah Keluarga aktif'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupDatabase() {
  const root = getOrCreateFolder_(CONFIG.ROOT_FOLDER_NAME);
  const photoFolder = getOrCreateSubfolder_(root, CONFIG.PHOTO_FOLDER_NAME);

  let ss;
  const files = root.getFilesByName(CONFIG.SPREADSHEET_NAME);
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(root);
  }

  const memberHeaders = [
    'id','nama','jenis_kelamin','orang_tua_id','anak_ke',
    'status_hidup','tanggal_wafat','bio','foto_url',
    'generasi','aktif','created_at','updated_at'
  ];
  const spouseHeaders = [
    'id','anggota_id','nama_pasangan','urutan','status_hubungan',
    'created_at','updated_at'
  ];

  setupSheet_(ss, CONFIG.SHEETS.MEMBERS, memberHeaders);
  setupSheet_(ss, CONFIG.SHEETS.SPOUSES, spouseHeaders);

  PropertiesService.getScriptProperties().setProperties({
    ROOT_FOLDER_ID: root.getId(),
    PHOTO_FOLDER_ID: photoFolder.getId(),
    SPREADSHEET_ID: ss.getId()
  });

  return {
    ok: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    rootFolderId: root.getId(),
    photoFolderId: photoFolder.getId()
  };
}

function getData() {
  const ss = getSpreadsheet_();
  const members = readSheet_(ss, CONFIG.SHEETS.MEMBERS);
  const spouses = readSheet_(ss, CONFIG.SHEETS.SPOUSES);

  const spouseMap = {};
  spouses.forEach(s => {
    if (!spouseMap[s.anggota_id]) spouseMap[s.anggota_id] = [];
    spouseMap[s.anggota_id].push(s);
  });

  members.forEach(m => {
    m.pasangan = (spouseMap[m.id] || []).sort((a,b) => Number(a.urutan||0)-Number(b.urutan||0));
  });

  return {ok:true, members};
}

function addMember(data) {
  const id = data.id || Utilities.getUuid();
  const now = new Date();
  const row = [
    id,
    data.nama || '',
    data.jenis_kelamin || '',
    data.orang_tua_id || '',
    data.anak_ke || '',
    data.status_hidup || 'Hidup',
    data.tanggal_wafat || '',
    data.bio || '',
    data.foto_url || '',
    data.generasi || '',
    data.aktif === false ? false : true,
    now,
    now
  ];
  appendRow_(CONFIG.SHEETS.MEMBERS, row);
  return {ok:true,id};
}

function updateMember(data) {
  if (!data.id) throw new Error('ID anggota wajib diisi.');
  const sh = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.MEMBERS);
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  const idCol = headers.indexOf('id');
  const rowIndex = values.findIndex(r => String(r[idCol]) === String(data.id));
  if (rowIndex < 0) throw new Error('Anggota tidak ditemukan.');

  const existing = values[rowIndex];
  const obj = {};
  headers.forEach((h,i)=>obj[h]=existing[i]);

  Object.keys(data).forEach(k => {
    if (headers.includes(k)) obj[k] = data[k];
  });
  obj.updated_at = new Date();

  sh.getRange(rowIndex+2,1,1,headers.length).setValues([
    headers.map(h => obj[h] === undefined ? '' : obj[h])
  ]);
  return {ok:true,id:data.id};
}

function deleteMember(id) {
  if (!id) throw new Error('ID anggota wajib diisi.');
  const ss = getSpreadsheet_();
  deleteById_(ss.getSheetByName(CONFIG.SHEETS.MEMBERS), 'id', id);
  const sh = ss.getSheetByName(CONFIG.SHEETS.SPOUSES);
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  const idCol = headers.indexOf('anggota_id');
  for (let i=values.length-1;i>=0;i--) {
    if (String(values[i][idCol]) === String(id)) sh.deleteRow(i+2);
  }
  return {ok:true,id};
}

function addSpouse(data) {
  const row = [
    data.id || Utilities.getUuid(),
    data.anggota_id || '',
    data.nama_pasangan || '',
    data.urutan || 1,
    data.status_hubungan || 'Menikah',
    new Date(),
    new Date()
  ];
  appendRow_(CONFIG.SHEETS.SPOUSES, row);
  return {ok:true};
}

function uploadPhoto(base64, fileName, mimeType) {
  const folder = getPhotoFolder_();
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType || 'image/jpeg', fileName || ('foto_'+Date.now()+'.jpg'));
  const file = folder.createFile(blob);
  return {ok:true, id:file.getId(), url:file.getUrl(), name:file.getName()};
}

function api_(action, payload) {
  switch(action) {
    case 'getData': return getData();
    case 'setup': return setupDatabase();
    case 'addMember': return addMember(payload || {});
    case 'updateMember': return updateMember(payload || {});
    case 'deleteMember': return deleteMember(payload && payload.id);
    case 'addSpouse': return addSpouse(payload || {});
    default: throw new Error('Action tidak dikenal: '+action);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const result = api_(body.action, body.payload);
    return json_(result);
  } catch(err) {
    return json_({ok:false,error:String(err.message || err)});
  }
}

function setupSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  else sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
}

function readSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  return values.filter(r => r.some(v => v !== '')).map(r => {
    const o={};
    headers.forEach((h,i)=>o[h]=r[i] instanceof Date ? r[i].toISOString() : r[i]);
    return o;
  });
}

function appendRow_(sheetName, row) {
  getSpreadsheet_().getSheetByName(sheetName).appendRow(row);
}

function deleteById_(sh, header, id) {
  const values=sh.getDataRange().getValues();
  const headers=values.shift();
  const c=headers.indexOf(header);
  for(let i=values.length-1;i>=0;i--){
    if(String(values[i][c])===String(id)) sh.deleteRow(i+2);
  }
}

function getSpreadsheet_() {
  const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if(!id) throw new Error('Database belum disiapkan. Jalankan setupDatabase() sekali.');
  return SpreadsheetApp.openById(id);
}

function getPhotoFolder_() {
  const id=PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');
  if(!id) throw new Error('Folder foto belum disiapkan. Jalankan setupDatabase().');
  return DriveApp.getFolderById(id);
}

function getOrCreateFolder_(name) {
  const it=DriveApp.getFoldersByName(name);
  return it.hasNext()?it.next():DriveApp.createFolder(name);
}

function getOrCreateSubfolder_(parent,name) {
  const it=parent.getFoldersByName(name);
  return it.hasNext()?it.next():parent.createFolder(name);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
