/**
 * WEBSITE SILSILAH KELUARGA - FINAL
 * Database Google Sheet:
 * id | nama | jenisKelamin | tanggalLahir | hubungan | ayah | ibu |
 * pasangan | alamat | deskripsi | foto | createdAt
 *
 * CATATAN:
 * - Struktur database TIDAK diubah.
 * - Nomor HP disimpan di metadata deskripsi dengan format:
 *   [HP:08123456789]
 * - Kolom pasangan dapat berisi beberapa ID dipisahkan koma.
 */

const CONFIG = {
  SHEET_NAME: 'Silsilah',
  PHOTO_FOLDER_NAME: 'Foto_Silsilah',
  ADMIN_USER_PROPERTY: 'ADMIN_USER',
  ADMIN_PASS_PROPERTY: 'ADMIN_PASS',
  DEFAULT_ADMIN_USER: 'admin',
  DEFAULT_ADMIN_PASS: 'admin123',
  SESSION_SECONDS: 21600
};

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Silsilah Keluarga')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  const headers = ['id','nama','jenisKelamin','tanggalLahir','hubungan','ayah','ibu','pasangan','alamat','deskripsi','foto','createdAt'];

  if (!sh) sh = ss.insertSheet(CONFIG.SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
  }

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(CONFIG.ADMIN_USER_PROPERTY)) {
    props.setProperty(CONFIG.ADMIN_USER_PROPERTY, CONFIG.DEFAULT_ADMIN_USER);
  }
  if (!props.getProperty(CONFIG.ADMIN_PASS_PROPERTY)) {
    props.setProperty(CONFIG.ADMIN_PASS_PROPERTY, CONFIG.DEFAULT_ADMIN_PASS);
  }

  let folder;
  const folders = DriveApp.getFoldersByName(CONFIG.PHOTO_FOLDER_NAME);
  folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.PHOTO_FOLDER_NAME);

  return {
    ok: true,
    message: 'Setup selesai.',
    sheet: CONFIG.SHEET_NAME,
    folderId: folder.getId()
  };
}

function getData() {
  const sh = getSheet_();
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(v => String(v).trim() !== ''))
    .map(row => {
      const o = {};
      headers.forEach((h,i) => o[h] = row[i] == null ? '' : row[i]);
      o.id = String(o.id || '').trim();
      return o;
    });
}

function getConfig() {
  return {
    ok: true,
    app: 'Silsilah Keluarga',
    adminUserConfigured: !!PropertiesService.getScriptProperties().getProperty(CONFIG.ADMIN_USER_PROPERTY)
  };
}

function login(username, password) {
  username = String(username || '').trim();
  password = String(password || '');

  const props = PropertiesService.getScriptProperties();
  const user = props.getProperty(CONFIG.ADMIN_USER_PROPERTY) || CONFIG.DEFAULT_ADMIN_USER;
  const pass = props.getProperty(CONFIG.ADMIN_PASS_PROPERTY) || CONFIG.DEFAULT_ADMIN_PASS;

  if (username !== user || password !== pass) {
    return {ok:false, message:'Username atau password admin salah.'};
  }

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('ADMIN_' + token, username, CONFIG.SESSION_SECONDS);
  return {ok:true, token:token, username:username};
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove('ADMIN_' + token);
  return {ok:true};
}

function savePerson(data, token) {
  data = data || {};
  const isAdmin = validAdmin_(token);
  const sh = getSheet_();
  const now = new Date();

  const id = String(data.id || '').trim();
  const isEdit = !!id;
  if (isEdit && !isAdmin) {
    throw new Error('Hanya admin yang dapat mengedit data.');
  }

  const name = String(data.nama || '').trim();
  if (!name) throw new Error('Nama wajib diisi.');

  const gender = String(data.jenisKelamin || '').trim();
  const birth = String(data.tanggalLahir || '').trim();
  const relation = String(data.hubungan || '').trim();
  const father = String(data.ayah || '').trim();
  const mother = String(data.ibu || '').trim();
  const spouses = normalizeIds_(data.pasangan);
  const address = String(data.alamat || '').trim();

  const phone = String(data.noHp || '').trim();
  const description = String(data.deskripsi || '').trim();
  const finalDescription = mergePhone_(phone, description);

  if (isEdit) {
    const row = findRowById_(sh, id);
    if (row < 2) throw new Error('Data anggota tidak ditemukan.');

    const old = sh.getRange(row,1,1,12).getValues()[0];
    const createdAt = old[11] || now;
    const photo = data.foto != null ? String(data.foto) : String(old[10] || '');

    sh.getRange(row,1,1,12).setValues([[
      id, name, gender, birth, relation, father, mother, spouses,
      address, finalDescription, photo, createdAt
    ]]);
    return {ok:true, mode:'edit', person: rowToObject_(sh.getRange(row,1,1,12).getDisplayValues()[0])};
  }

  const newId = Utilities.getUuid();
  let photo = String(data.foto || '');

  sh.appendRow([
    newId, name, gender, birth, relation, father, mother, spouses,
    address, finalDescription, photo, now
  ]);

  const row = sh.getLastRow();
  return {ok:true, mode:'add', person: rowToObject_(sh.getRange(row,1,1,12).getDisplayValues()[0])};
}

function deletePerson(id, token) {
  if (!validAdmin_(token)) throw new Error('Hanya admin yang dapat menghapus data.');

  id = String(id || '').trim();
  if (!id) throw new Error('ID tidak valid.');

  const sh = getSheet_();
  const row = findRowById_(sh, id);
  if (row < 2) throw new Error('Data anggota tidak ditemukan.');

  // Hapus referensi hubungan agar data lain tidak menunjuk ke anggota yang sudah dihapus.
  const last = sh.getLastRow();
  if (last >= 2) {
    const vals = sh.getRange(2,1,last-1,12).getValues();
    vals.forEach((r, idx) => {
      const rowNum = idx + 2;
      if (rowNum === row) return;

      let changed = false;
      if (String(r[5]) === id) { r[5] = ''; changed = true; }
      if (String(r[6]) === id) { r[6] = ''; changed = true; }

      const spouses = normalizeIds_(r[7]).split(',').filter(Boolean).filter(x => x !== id).join(',');
      if (spouses !== String(r[7] || '')) { r[7] = spouses; changed = true; }

      if (changed) sh.getRange(rowNum,1,1,12).setValues([r]);
    });
  }

  const photoUrl = sh.getRange(row,11).getDisplayValue();
  sh.deleteRow(row);

  // Foto tidak langsung dihapus dari Drive agar histori/backup tetap aman.
  return {ok:true, message:'Anggota berhasil dihapus.', oldPhoto:photoUrl};
}

function uploadPhoto(base64, fileName, token) {
  if (!validAdmin_(token)) throw new Error('Upload foto hanya dapat dilakukan oleh admin.');
  if (!base64) throw new Error('File foto kosong.');

  const clean = String(base64).replace(/^data:[^;]+;base64,/, '');
  const bytes = Utilities.base64Decode(clean);

  // 5 MB
  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error('Foto terlalu besar. Maksimal 5 MB.');
  }

  const folder = getPhotoFolder_();
  const safeName = sanitizeFileName_(fileName || ('foto_' + Date.now() + '.jpg'));
  const blob = Utilities.newBlob(bytes, guessMime_(safeName), safeName);
  const file = folder.createFile(blob);

  // Tetap gunakan link file yang dapat dibuka publik melalui link.
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}

  return {
    ok:true,
    fileId:file.getId(),
    url:'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200'
  };
}

function changeAdminCredentials(username, password, token) {
  if (!validAdmin_(token)) throw new Error('Hanya admin yang dapat mengganti akun.');
  username = String(username || '').trim();
  password = String(password || '');
  if (!username || password.length < 6) throw new Error('Username wajib diisi dan password minimal 6 karakter.');

  const props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.ADMIN_USER_PROPERTY, username);
  props.setProperty(CONFIG.ADMIN_PASS_PROPERTY, password);
  return {ok:true, message:'Akun admin berhasil diperbarui.'};
}

function validAdmin_(token) {
  if (!token) return false;
  return !!CacheService.getScriptCache().get('ADMIN_' + token);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) throw new Error('Sheet "' + CONFIG.SHEET_NAME + '" tidak ditemukan. Jalankan setup().');
  return sh;
}

function findRowById_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2,1,last-1,1).getDisplayValues().flat();
  const idx = ids.findIndex(x => String(x).trim() === id);
  return idx < 0 ? -1 : idx + 2;
}

function rowToObject_(row) {
  return {
    id:row[0], nama:row[1], jenisKelamin:row[2], tanggalLahir:row[3],
    hubungan:row[4], ayah:row[5], ibu:row[6], pasangan:row[7],
    alamat:row[8], deskripsi:row[9], foto:row[10], createdAt:row[11]
  };
}

function normalizeIds_(value) {
  if (Array.isArray(value)) return value.map(String).map(x => x.trim()).filter(Boolean).join(',');
  return String(value || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).join(',');
}

function mergePhone_(phone, description) {
  const stripped = String(description || '').replace(/^\s*\[HP:[^\]]*\]\s*/i, '').trim();
  if (!phone) return stripped;
  return '[HP:' + phone + '] ' + stripped;
}

function getPhone_(description) {
  const m = String(description || '').match(/\[HP:([^\]]*)\]/i);
  return m ? m[1].trim() : '';
}

function getPhotoFolder_() {
  const folders = DriveApp.getFoldersByName(CONFIG.PHOTO_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.PHOTO_FOLDER_NAME);
}

function sanitizeFileName_(name) {
  return String(name).replace(/[\\\/:*?"<>|#%{}]/g,'_').slice(0,150);
}

function guessMime_(name) {
  const n = String(name).toLowerCase();
  if (n.endsWith('.png')) return MimeType.PNG;
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.gif')) return MimeType.GIF;
  return MimeType.JPEG;
}
