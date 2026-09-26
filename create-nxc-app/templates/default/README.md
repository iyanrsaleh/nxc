# @NAME@

Aplikasi desktop berbasis SDK NXC (Qt 6, native C++).

## Build & jalankan

```bash
npm run dev       # build Debug lalu jalankan aplikasi
npm run build     # build Debug
npm run release   # build Release
npm run dist      # build Release -> installer dist/*.exe (atau zip portable)
npm run clean     # hapus build/ dan dist/
```

Tidak perlu `npm install` — skrip build (`scripts/nxc.mjs`) tanpa dependency.

## Halaman & navigasi

Sidebar + halaman memakai `nxc::NavigationView` dan `nxc::Router`
(`src/mainwindow.cpp`); halaman ada di `src/pages.cpp`. Menambah halaman:

1. Buat kelas halaman (turunan `nxc::Page`) di `pages.h/.cpp`.
2. Daftarkan rute: `router->addRoute("/laporan", [] { return new LaporanPage; });`
3. (opsional) Item sidebar: `nav->addItem(tr("Laporan"), "/laporan", nxc::Glyph::Info);`
4. Link dari halaman lain: `new nxc::Link(tr("Buka laporan"), "/laporan")`.

Rute berparameter `/produk/:id` → `route.param("id")`; query `?tab=x` →
`route.query("tab")` di `onEnter()`. Buka langsung di halaman tertentu:
`build\Debug\@NAME@.exe --route /produk/42`.

## Identitas aplikasi

Atur di `package.json` — `version`, `productName`, `description`, `author`,
`nxc.icon` (ganti `assets/icon.png`), `nxc.shortcutName`, `nxc.artifactName`.
Semuanya otomatis masuk ke exe (Properties → Details, ikon), judul jendela,
dan installer. Jangan ubah `nxc.appId` setelah rilis pertama.

## Paket npm untuk skrip Node (nxc::NodeRuntime)

Dependensi skrip Node ditaruh di **`runtime/package.json`** — terpisah dari
`package.json` di root (yang khusus build NXC):

```bash
cd runtime
npm init -y
npm install dayjs
```

`npm run dev`/`build`/`dist` otomatis menjalankan `npm install --omit=dev` di
`runtime/` bila belum terpasang atau `package.json` berubah. Salin folder
`runtime/` (termasuk `node_modules`) ke sebelah exe di CMakeLists.txt supaya
ikut installer — contoh `appNode` di repo NXC. Pengguna akhir tetap butuh
Node.js terpasang.

Installer (`npm run dist`) memakai Inno Setup — pasang sekali:
`winget install JRSoftware.InnoSetup`. Tanpa Inno Setup (atau
`npm run dist -- --zip`) hasilnya zip portable.

Tanpa npm (CMake langsung):

```
@BUILD_STEPS@
```

`nxc_deploy()` di CMakeLists.txt menyalin nxc.dll + DLL Qt ke sebelah exe
setiap selesai build (Windows), jadi exe langsung bisa dijalankan / di-debug.

Path SDK NXC dan Qt ada di `CMakePresets.json` (`CMAKE_PREFIX_PATH`) -
sunting di situ kalau lokasinya berpindah.

API: https://github.com/iyanrsaleh/nxc/blob/main/docs/API.md
