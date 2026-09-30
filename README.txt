SILISILAH KELUARGA - VERSI FINAL

FITUR
1. Pohon utama hanya menampilkan keturunan biologis (ayah/ibu -> anak).
2. Pasangan tidak menjadi node utama pohon.
3. Klik card membuka breakdown:
   - data anggota
   - pasangan 1, 2, dst.
   - anak langsung
   - anak -> cucu -> keturunan berikutnya
   - orang tua
   - alamat dan deskripsi
4. Filter generasi.
5. Filter jenis kelamin.
6. Pencarian nama/no HP/hubungan/alamat.
7. Statistik jumlah anggota.
8. No HP tampil di card.
9. Semua pengunjung dapat menambah anggota.
10. Edit dan hapus hanya admin.
11. Upload foto melalui Google Drive, maksimal 5 MB.
12. Responsif untuk HP dan desktop.
13. Struktur Sheet dipertahankan:
   id,nama,jenisKelamin,tanggalLahir,hubungan,ayah,ibu,pasangan,alamat,deskripsi,foto,createdAt

NO HP
Karena struktur database tidak boleh berubah, nomor HP disimpan sebagai metadata pada kolom deskripsi:
[HP:08123456789] Keterangan anggota.
Aplikasi otomatis memisahkan metadata ini ketika ditampilkan.

INSTALASI
1. Buat Google Spreadsheet.
2. Buka Extensions > Apps Script.
3. Buat file Code.gs, index.html, style.css, script.js.
4. Salin isi file dari ZIP.
5. Jalankan fungsi setup() satu kali dari Apps Script dan izinkan akses.
6. Pastikan Sheet bernama "Silsilah".
7. Deploy > New deployment > Web app.
8. Execute as: Me.
9. Who has access: sesuai kebutuhan, minimal pengguna yang ingin mengakses website.
10. Buka URL Web App.

LOGIN ADMIN DEFAULT
Username: admin
Password: admin123

Sebaiknya ganti password melalui Script Properties setelah instalasi.

CATATAN PASANGAN
Kolom pasangan boleh berisi beberapa ID dipisahkan koma. Sistem juga mendeteksi pasangan dua arah:
Jika A mencantumkan B, B tetap dapat menampilkan A sebagai pasangan.

URUTAN ANAK
Anak diurutkan berdasarkan tanggal lahir dari paling tua ke paling muda. Jika tanggal lahir kosong, nama digunakan sebagai urutan kedua.

KEAMANAN
Edit/hapus dan upload foto divalidasi di server Apps Script, bukan hanya disembunyikan di browser.
