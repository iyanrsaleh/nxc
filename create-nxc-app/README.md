# create-nxc-app

Buat project aplikasi desktop **native C++ (Qt 6)** di atas SDK NXC dengan
satu perintah:

```bash
npm create nxc-app@latest MyApp
cd MyApp
npm run dev
```

Tanpa dependency npm — hanya modul bawaan Node (≥ 18). Tidak perlu
`npm install` di project hasilnya.

## Perintah di project

| Perintah | Fungsi |
|---|---|
| `npm run dev` (= `npm start`) | Build Debug lalu jalankan aplikasi |
| `npm run build` | Build Debug |
| `npm run release` | Build Release |
| `npm run dist` | Build Release → **installer** `dist/<artifactName>` (Windows + Inno Setup), atau zip portable berisi exe + semua DLL/plugin (`npm run dist -- --zip`, atau bila Inno Setup belum terpasang) |
| `npm run clean` | Hapus `build/` dan `dist/` |

## Identitas aplikasi di `package.json`

Cukup isi variabel — build memakainya otomatis (seperti electron-builder):

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "productName": "My App",
  "description": "Aplikasi saya",
  "author": "Nama Kamu",
  "nxc": {
    "icon": "assets/icon.png",
    "shortcutName": "My App",
    "artifactName": "myapp-setup-${version}.${ext}"
  }
}
```

| Variabel | Dipakai untuk |
|---|---|
| `version` | Versi file exe & installer (klik kanan → Properties → Details), `QApplication::applicationVersion()`, `${version}` |
| `productName` | Nama aplikasi & judul jendela, nama produk exe/installer, folder instalasi, Apps & features |
| `description` | Deskripsi file exe |
| `author` | Perusahaan & copyright exe, publisher installer |
| `nxc.icon` | Ikon exe (Explorer/taskbar), jendela, title bar, tray, dan setup.exe — `.png` diubah ke `.ico` otomatis |
| `nxc.shortcutName` | Nama shortcut Start Menu (dan Desktop, opsional saat install) |
| `nxc.artifactName` | Nama file installer: `${name}`, `${productName}`, `${version}`, `${ext}`, `${os}`, `${arch}` |
| `nxc.appId` | Identitas unik installer (dibuat otomatis) — jangan diubah setelah rilis; dipakai untuk upgrade & uninstall |

Ubah → `npm run release`/`dist` lagi; CMake mendeteksi perubahan `package.json`
dan ikon sendiri. Identitas ini dibaca `cmake/NxcApp.cmake`, jadi berlaku juga
saat memakai `cmake` langsung.

### Installer (setup.exe)

`npm run dist` membuat installer dengan **Inno Setup** (gratis) — pasang sekali:

```bash
winget install JRSoftware.InnoSetup
```

Installer: wizard modern, install per-user tanpa admin (bisa pilih semua user),
shortcut Start Menu + Desktop (opsional), uninstaller di Settings → Apps,
ikon & versi dari `package.json`. Lokasi ISCC.exe lain: env `INNO_SETUP_ISCC`.

Semuanya dijalankan `scripts/nxc.mjs` di project itu sendiri (Node murni)
di atas `CMakePresets.json`. Tetap bisa memakai CMake langsung:
`cmake --preset default` lalu `cmake --build --preset debug`
(Linux/macOS: `cmake --preset debug`).

## Prasyarat

npm hanya membuat file project. Yang tetap harus terpasang:

- **Qt 6** (Qt Online Installer; Windows: kit `msvc2022_64`)
- **Compiler**: Windows → Visual Studio 2022 Build Tools; Linux → gcc/g++
- **CMake ≥ 3.21**

## Opsi

| Opsi | Arti |
|---|---|
| `[nama]` | Nama app = nama folder = nama target CMake (huruf/angka/`_`/`-`, diawali huruf). Kalau kosong ditanyakan |
| `--sdk <path\|url>` | SDK NXC: folder `nxc-sdk`, file `.tar.gz`, atau URL `.tar.gz` |
| `--qt <prefix>` | Kit Qt 6. Default: env `QT_PREFIX`, lalu kit terbaru di `C:\Qt` / `~/Qt` / `/opt/Qt` |
| `--repo <owner/nama>` | Repo GitHub sumber rilis SDK (default: `nxc.releaseRepo` di `package.json`) |

Dengan `npm create`, opsi ditulis setelah `--`:
`npm create nxc-app@latest MyApp -- --sdk D:\nxc-sdk`.

### Dari mana SDK diambil

1. `--sdk`
2. env `NXC_SDK`
3. `nxc-sdk/` di repo NXC — kalau dijalankan dari repo (`node tools/create-nxc-app`
   atau `npm link`)
4. GitHub Release terbaru dari `--repo` / `nxc.releaseRepo`, disimpan di cache
   `~/.nxc/sdk/` (unduhan berikutnya memakai cache)

Kalau SDK dibangun dengan Qt major.minor yang berbeda dari kit kamu (dibaca
dari `sdk.json` di SDK), muncul peringatan.

## Hasil

```
MyApp/
├── CMakeLists.txt       find_package(nxc) + nxc_deploy()
├── CMakePresets.json    CMAKE_PREFIX_PATH = SDK + Qt (sudah terisi)
├── package.json         identitas app + npm run dev | build | release | dist | clean
├── scripts/nxc.mjs      penggerak perintah npm + installer (tanpa dependency)
├── cmake/NxcApp.cmake   versi/nama/ikon exe dari package.json
├── assets/icon.png      ikon aplikasi (ganti dengan milikmu)
├── README.md
├── .gitignore
└── src/
    ├── main.cpp         nxc::Application
    ├── mainwindow.h
    └── mainwindow.cpp   MainWindow : nxc::Window
```

Template ada di `templates/default/` dan dipakai juga oleh
`tools/new-app.ps1` (versi Windows tanpa Node). `_gitignore` sengaja dinamai
begitu karena npm membuang file `.gitignore` saat publish.

## Untuk pemilik repo: rilis & publish

1. Isi `nxc.releaseRepo` di `package.json` dengan repo GitHub NXC,
   mis. `"owner/nxc-qt6"`.
2. Rilis SDK: push tag `v<versi>` → `.github/workflows/release.yml` membangun
   dan mengunggah `nxc-sdk-<ver>-qt<qt>-{windows,linux}.tar.gz` ke GitHub
   Release. Nama asset ini kontrak dengan `ASSET_PATTERN` di `index.js`.
3. Publish package (sekali per versi):
   ```bash
   cd tools/create-nxc-app
   npm pack --dry-run     # periksa isi paket
   npm publish
   ```

Tes lokal tanpa publish: `npm link` di folder ini, lalu `create-nxc-app MyApp`
dari folder mana saja (memakai `nxc-sdk/` repo).
