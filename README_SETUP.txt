PERBAIKAN V3 - ERROR "Unexpected token ="
================================================

Versi ini sengaja memakai JavaScript Apps Script yang sangat kompatibel:
- menggunakan var, bukan const/let
- tidak menggunakan arrow function
- tidak menggunakan template literal
- frontend dijalankan langsung dari HtmlService Apps Script

JANGAN buka index.html dengan double-click.

LANGKAH PEMASANGAN:
1. Buka script.google.com dan buat project baru.
2. Buat 4 file:
   Code.gs
   index.html
   style.html
   script.html
3. Salin isi file dari ZIP sesuai nama tersebut.
4. Simpan semua file.
5. Pilih fungsi "setupDatabase" lalu klik Run.
6. Berikan izin Google Drive dan Spreadsheet.
7. Setelah selesai, pilih Deploy > New deployment.
8. Pilih Web app.
9. Execute as: Me.
10. Who has access: Anyone.
11. Deploy.
12. Buka URL Web App yang diberikan Google.

HASIL:
Google Drive/
  Silsilah Keluarga/
    Database Silsilah Keluarga
    Foto Anggota/

CATATAN:
Jangan memasukkan isi style.html atau script.html ke Code.gs.
Code.gs hanya berisi kode backend.
