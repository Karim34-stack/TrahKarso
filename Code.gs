var CONFIG = {
  ROOT_FOLDER_NAME: 'Silsilah Keluarga',
  PHOTO_FOLDER_NAME: 'Foto Anggota',
  SPREADSHEET_NAME: 'Database Silsilah Keluarga',
  MEMBERS_SHEET: 'Anggota',
  SPOUSES_SHEET: 'Pasangan'
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

function setupDatabase() {
  var root = getOrCreateFolder(CONFIG.ROOT_FOLDER_NAME);
  var photoFolder = getOrCreateSubfolder(root, CONFIG.PHOTO_FOLDER_NAME);
  var ss;
  var files = root.getFilesByName(CONFIG.SPREADSHEET_NAME);

  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(root);
  }

  setupSheet(ss, CONFIG.MEMBERS_SHEET, [
    'id','nama','jenis_kelamin','orang_tua_id','anak_ke',
    'status_hidup','tanggal_wafat','bio','foto_url',
    'generasi','aktif','created_at','updated_at'
  ]);

  setupSheet(ss, CONFIG.SPOUSES_SHEET, [
    'id','anggota_id','nama_pasangan','urutan',
    'status_hubungan','created_at','updated_at'
  ]);

  PropertiesService.getScriptProperties().setProperties({
    SPREADSHEET_ID: ss.getId(),
    ROOT_FOLDER_ID: root.getId(),
    PHOTO_FOLDER_ID: photoFolder.getId()
  });

  return {
    ok: true,
    spreadsheetUrl: ss.getUrl(),
    rootFolderUrl: root.getUrl(),
    photoFolderUrl: photoFolder.getUrl()
  };
}

function getData() {
  var ss = getSpreadsheet();
  var members = readSheet(ss, CONFIG.MEMBERS_SHEET);
  var spouses = readSheet(ss, CONFIG.SPOUSES_SHEET);
  var spouseMap = {};
  var i;

  for (i = 0; i < spouses.length; i++) {
    var s = spouses[i];
    if (!spouseMap[s.anggota_id]) {
      spouseMap[s.anggota_id] = [];
    }
    spouseMap[s.anggota_id].push(s);
  }

  for (i = 0; i < members.length; i++) {
    members[i].pasangan = spouseMap[members[i].id] || [];
    members[i].pasangan.sort(function(a, b) {
      return Number(a.urutan || 0) - Number(b.urutan || 0);
    });
  }

  return {
    ok: true,
    members: members
  };
}

function addMember(data) {
  var now = new Date();
  var id = data.id || Utilities.getUuid();

  getSpreadsheet().getSheetByName(CONFIG.MEMBERS_SHEET).appendRow([
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
    true,
    now,
    now
  ]);

  return { ok: true, id: id };
}

function updateMember(data) {
  if (!data.id) {
    throw new Error('ID anggota wajib diisi.');
  }

  var sh = getSpreadsheet().getSheetByName(CONFIG.MEMBERS_SHEET);
  var values = sh.getDataRange().getValues();
  var headers = values.shift();
  var idCol = headers.indexOf('id');
  var rowIndex = -1;
  var i;

  for (i = 0; i < values.length; i++) {
    if (String(values[i][idCol]) === String(data.id)) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex < 0) {
    throw new Error('Anggota tidak ditemukan.');
  }

  var obj = {};
  for (i = 0; i < headers.length; i++) {
    obj[headers[i]] = values[rowIndex][i];
  }

  for (var key in data) {
    if (headers.indexOf(key) >= 0) {
      obj[key] = data[key];
    }
  }

  obj.updated_at = new Date();

  var output = [];
  for (i = 0; i < headers.length; i++) {
    output.push(obj[headers[i]]);
  }

  sh.getRange(rowIndex + 2, 1, 1, headers.length).setValues([output]);
  return { ok: true };
}

function deleteMember(id) {
  if (!id) {
    throw new Error('ID anggota wajib diisi.');
  }

  var ss = getSpreadsheet();
  deleteById(ss.getSheetByName(CONFIG.MEMBERS_SHEET), 'id', id);
  deleteById(ss.getSheetByName(CONFIG.SPOUSES_SHEET), 'anggota_id', id);

  return { ok: true };
}

function addSpouse(data) {
  getSpreadsheet().getSheetByName(CONFIG.SPOUSES_SHEET).appendRow([
    data.id || Utilities.getUuid(),
    data.anggota_id || '',
    data.nama_pasangan || '',
    data.urutan || 1,
    data.status_hubungan || 'Menikah',
    new Date(),
    new Date()
  ]);

  return { ok: true };
}

function uploadPhoto(base64, fileName, mimeType) {
  var folder = getPhotoFolder();
  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(
    bytes,
    mimeType || 'image/jpeg',
    fileName || ('foto_' + new Date().getTime() + '.jpg')
  );
  var file = folder.createFile(blob);

  return {
    ok: true,
    id: file.getId(),
    url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w800'
  };
}

function setupSheet(ss, name, headers) {
  var sh = ss.getSheetByName(name);

  if (!sh) {
    sh = ss.insertSheet(name);
  }

  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
}

function readSheet(ss, name) {
  var sh = ss.getSheetByName(name);

  if (!sh || sh.getLastRow() < 2) {
    return [];
  }

  var values = sh.getDataRange().getValues();
  var headers = values.shift();
  var result = [];

  for (var i = 0; i < values.length; i++) {
    var empty = true;
    for (var j = 0; j < values[i].length; j++) {
      if (values[i][j] !== '') {
        empty = false;
        break;
      }
    }

    if (empty) {
      continue;
    }

    var obj = {};
    for (var k = 0; k < headers.length; k++) {
      var value = values[i][k];
      obj[headers[k]] = value instanceof Date ? value.toISOString() : value;
    }

    result.push(obj);
  }

  return result;
}

function deleteById(sh, header, id) {
  var values = sh.getDataRange().getValues();
  var headers = values.shift();
  var col = headers.indexOf(header);

  for (var i = values.length - 1; i >= 0; i--) {
    if (String(values[i][col]) === String(id)) {
      sh.deleteRow(i + 2);
    }
  }
}

function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

  if (!id) {
    throw new Error('Database belum dibuat. Jalankan setupDatabase() sekali.');
  }

  return SpreadsheetApp.openById(id);
}

function getPhotoFolder() {
  var id = PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');

  if (!id) {
    throw new Error('Folder foto belum dibuat. Jalankan setupDatabase() sekali.');
  }

  return DriveApp.getFolderById(id);
}

function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(name);
}

function getOrCreateSubfolder(parent, name) {
  var folders = parent.getFoldersByName(name);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parent.createFolder(name);
}
