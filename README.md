# NXC — SDK aplikasi desktop native C++ (Qt 6)

SDK untuk membangun aplikasi desktop **native C++** di atas Qt 6 Widgets:
satu binary yang ringan, dengan fondasi aplikasi yang sudah jadi — window,
terminal, tema, shortcut, database, dan lainnya.

| Yang disediakan SDK | Header |
|---|---|
| Lifecycle aplikasi (bootstrap, window factory, tray, event loop) | `<nxc/Application.h>` |
| Window frameless ala Windows 11 (title bar, resize, Mica, tanpa garis tepi) | `<nxc/Window.h>` |
| Context menu, dialog standar | `<nxc/ContextMenu.h>`, `<nxc/Dialog.h>` |
| Keyboard, shortcut terpusat (scope, chord, konflik) | `<nxc/Keyboard.h>`, `<nxc/Shortcut.h>` |
| **Terminal sungguhan** (PTY + emulator VT: ketik langsung, warna, Tab-completion, saran PowerShell 7, vim) | `<nxc/Terminal.h>`, `<nxc/TerminalProcess.h>` |
| Tema gelap/terang (hot-swap), preferensi tersimpan, tray | `<nxc/Theme.h>`, `<nxc/Settings.h>`, `<nxc/Tray.h>` |
| Event bus | `<nxc/Events.h>` |
| Runtime bridge opsional: JavaScript (in-process), Node.js, Python | `<nxc/Runtime.h>` dkk. |
| Modul opsional **Database** (SQLite/driver lain, query async, migrasi) | `<nxc/Database.h>` |
| Modul opsional **WebSocket** (reconnect, antrean offline, keepalive) | `<nxc/WebSocket.h>` |

Referensi lengkap: [`docs/API.md`](docs/API.md) · panduan pemakaian SDK:
[`docs/Developer.md`](docs/Developer.md).

## Prasyarat

- **Windows 10 1809+ / Windows 11, x64** (SDK saat ini: Windows saja)
- **Qt 6.8.x, kit MSVC 2022 64-bit** — Qt Online Installer. Centang juga
  **Qt Qml** (dipakai `nxc.dll`) dan, bila memakai `nxc::WebSocket`, add-on
  **Qt WebSockets**. SDK dibangun dengan Qt 6.8.3 — pakai minor yang sama.
- **Visual Studio 2022 Build Tools** — workload *Desktop development with C++*
- **CMake ≥ 3.21**
- **Node.js ≥ 18** — hanya untuk `create-nxc-app`

## Mulai cepat

```bash
npm create nxc-app@latest MyApp
cd MyApp
npm run dev        # build Debug + jalankan
npm run dist       # installer: dist/myapp-setup-0.1.0.exe (butuh Inno Setup)
```

Perintah lain di project: `npm run build`, `npm run release`, `npm run clean`.
Nama, versi, ikon, shortcut, dan nama installer diatur di `package.json`
(`productName`, `version`, `nxc.icon`, `nxc.shortcutName`, `nxc.artifactName`) —
lihat [`create-nxc-app/README.md`](create-nxc-app/README.md). Installer memakai
Inno Setup (`winget install JRSoftware.InnoSetup`).

`create-nxc-app` membuat project (CMakeLists, CMakePresets, `src/`), mencari
kit Qt otomatis, dan mengunduh SDK dari
[Releases](https://github.com/iyanrsaleh/nxc/releases) ke cache `~/.nxc/sdk`.
Opsi: `--sdk <folder|file|URL .tar.gz>`, `--qt <prefix kit Qt>` — lihat
[`create-nxc-app/README.md`](create-nxc-app/README.md).

## Tanpa npm

1. Unduh `nxc-sdk-<versi>-qt<qt>-windows.tar.gz` dari
   [Releases](https://github.com/iyanrsaleh/nxc/releases), ekstrak
   (`tar -xzf ... -C nxc-sdk`).
2. Di project CMake Anda:

```cmake
find_package(nxc CONFIG REQUIRED)                  # atau: COMPONENTS Database WebSocket
target_link_libraries(app PRIVATE nxc::nxc Qt6::Widgets)
nxc_deploy(app)   # salin nxc.dll + DLL Qt setelah build -> exe langsung jalan
```

```bat
cmake -S . -B build -G "Visual Studio 17 2022" -A x64 ^
      -DCMAKE_PREFIX_PATH="C:\path\nxc-sdk;C:\Qt\6.8.3\msvc2022_64"
cmake --build build --config Debug
```

```cpp
#include <nxc/Application.h>
#include <nxc/Window.h>

int main(int argc, char* argv[]) {
    nxc::Application app(argc, argv);
    app.setApplicationName(QStringLiteral("Aplikasi Saya"));
    app.setWindowFactory([] { return new MyWindow; });   // MyWindow : nxc::Window
    return app.exec();
}
```

SDK memuat konfigurasi **Debug** (`nxcd.dll`) dan **Release** (`nxc.dll`);
CMake memilih sendiri.

## Lisensi

NXC SDK bersifat **proprietary** — lihat [`LICENSE`](LICENSE). Komponen pihak
ketiga (Qt 6 di bawah LGPLv3, Fluent System Icons di bawah MIT) — lihat
[`THIRD-PARTY-NOTICES.txt`](THIRD-PARTY-NOTICES.txt).
