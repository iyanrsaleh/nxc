# create-nxc-app

Buat project aplikasi desktop **native C++ (Qt 6)** di atas SDK NXC dengan
satu perintah:

```bash
npm create nxc-app@latest MyApp
cd MyApp
cmake --preset default          # Linux/macOS: cmake --preset debug
cmake --build --preset debug
build\Debug\MyApp.exe           # Linux/macOS: ./build/debug/MyApp
```

Tanpa dependency npm — hanya modul bawaan Node (≥ 18).

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
