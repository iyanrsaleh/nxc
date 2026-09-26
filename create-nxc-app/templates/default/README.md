# @NAME@

Aplikasi desktop berbasis SDK NXC (Qt 6, native C++).

## Build & jalankan

```bash
npm run dev       # build Debug lalu jalankan aplikasi
npm run build     # build Debug
npm run release   # build Release
npm run dist      # build Release -> dist/*.zip siap dibagikan (exe + semua DLL)
npm run clean     # hapus build/ dan dist/
```

Tidak perlu `npm install` — skrip build (`scripts/nxc.mjs`) tanpa dependency.

## Identitas aplikasi

Atur di `package.json` — `version`, `productName`, `description`, `author`,
`nxc.icon` (ganti `assets/icon.png`), `nxc.shortcutName`, `nxc.artifactName`.
Semuanya otomatis masuk ke exe (Properties → Details, ikon), judul jendela,
dan installer. Jangan ubah `nxc.appId` setelah rilis pertama.

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
