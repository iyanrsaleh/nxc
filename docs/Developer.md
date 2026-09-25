# NXC Qt6 — Panduan Developer: Mana **Internal**, Mana **Developer**

Dokumen khusus developer: satu halaman yang menjelaskan dengan tegas **area
mana yang milik tim internal NXC** dan **area mana yang merupakan kontrak resmi
untuk developer aplikasi (konsumen SDK)** — supaya tidak ada yang salah
`#include` atau bergantung pada kode internal yang bisa berubah sewaktu-waktu.

Dokumen terkait: `README.md` (gambaran umum + build), `docs/API.md` (referensi
per header), `Foundation.md` & `Plan.md` (spesifikasi & status internal).

---

## 1. Alur besar: dari source internal ke project developer

```text
NXC source (repo ini)          nxc-sdk/ (hasil install)       project developer
─────────────────────          ────────────────────────       ─────────────────
src/, include/nxc/,   ──build──▶  build/  ──cmake --install──▶  nxc-sdk/
resources/, tests/     .bat                    │                inc/nxc/*.h
CMakeLists.txt                                 │                lib/nxc.lib
                                               │                bin/nxc.dll
                                               └──find_package──▶ cmake/nxcConfig.cmake
                                                                  resources/*.qss
                                                                  (examples/hello-nxc/)
```

Satu arah saja: developer **tidak pernah** membaca atau mengubah source
internal — cukup `find_package(nxc)` terhadap folder `nxc-sdk/`.

---

## 2. Dua peran

| Aspek | Tim internal NXC | Developer aplikasi (konsumen SDK) |
|---|---|---|
| Mengubah source library (`src/`, `CMakeLists.txt`, `build.bat`) | ✅ ya | ❌ tidak |
| `#include <nxc/...>` (header publik) | ✅ | ✅ **wajib** |
| `#include` langsung ke `src/*.h` | ✅ (di dalam library) | ❌ **dilarang** |
| Build | `build.bat` / CMake root | CMake biasa + `find_package(nxc)` |
| Titik masuk `main()` | tidak ada di library | **di project developer sendiri** |
| Test | `tests/` (17 suite ctest) | test aplikasi masing-masing |
| Dokumen utama | `Foundation.md`, `Plan.md` | `Developer.md`, `docs/API.md` |

---

## 3. Peta folder: milik siapa

| Folder / file | Milik | Boleh diutak-atik developer? | Keterangan |
|---|---|---|---|
| `include/nxc/*.h` (17 header) | kontrak publik | 🟡 baca & pakai, ❌ ubah | **Satu-satunya API resmi.** Ikut terpasang ke `nxc-sdk/inc/nxc/` |
| `src/` (semua `.cpp`/`.h` di dalamnya) | internal | ❌ | Implementasi: `titlebar`, `window`, `platform`, `runtime`, dll. **Tidak ikut terpasang di SDK** |
| `resources/` (`app.qrc`, `*.qss`) | internal | ❌ | Di-*embed* ke dalam `nxc.dll`; `Theme::apply()` membaca `:/style_*.qss` |
| `assets/` (`brend/`, `icons/`) | internal | ❌ | Ikon brand + glyph Fluent; ikut ter-embed lewat qrc |
| `tests/`, `tools/`, `.github/` | internal | ❌ | ctest, generator `.ico`, skrip shortcut, CI |
| `build.bat`, `CMakeLists.txt`, `cmake/*.cmake.in` | internal | ❌ | Orkestrasi build & paket |
| `nxc-sdk/` | **hasil build** | ❌ edit manual | Dibuat oleh `cmake --install` — **bisa tertimpa kapan saja**; regenerate, jangan sunting |
| `examples/hello-nxc/` | contoh milik developer | ✅ | Project terpisah yang memakai SDK — template menyalin |
| `README.md`, `docs/`, `Developer.md` | dokumentasi | 🟡 baca | `Plan.md`/`Foundation.md` = dokumen perencanaan internal |

---

## 4. Kontrak API — 13 header yang boleh dipakai developer

Semuanya di `namespace nxc`, diekspor dengan `NXC_EXPORT` (`<nxc/Export.h>`),
dan otomatis terpasang ke `nxc-sdk/inc/nxc/` (daftar statis:
`NXC_PUBLIC_HEADERS` di `CMakeLists.txt`).

| Header | Isi |
|---|---|
| `<nxc/Application.h>` | bootstrap + window factory + tray + event loop — pengganti `main()` sendiri |
| `<nxc/Window.h>` | window frameless (title bar, area resize — tanpa garis tepi) — turunkan untuk isi aplikasi |
| `<nxc/ContextMenu.h>` | mesin context menu generik (item, submenu, shortcut, `visibleWhen`) |
| `<nxc/Dialog.h>` | dialog standar: area isi + button box Ok/Cancel |
| `<nxc/Events.h>` | `EventBus` tunggal + nama event dasar (`nxc::Event::*`) |
| `<nxc/Keyboard.h>` | keyboard & input: `KeyEvent`, key mapping, modifier, input context |
| `<nxc/Shortcut.h>` | shortcut terpusat: scope Application/Window/Context, chord, konflik, enable/disable |
| `<nxc/TerminalProcess.h>` | process bridge terminal: shell OS (cmd/powershell/pwsh/sh), stdin/stdout/stderr, dir, env |
| `<nxc/Terminal.h>` | widget terminal satu area (ketik langsung, PTY + emulator VT: warna, Tab, vim; Ctrl+C/Ctrl+V/Ctrl+L) di atas `TerminalProcess` |
| `<nxc/Settings.h>` | preferensi tersimpan (QSettings INI): tema, `closeToTray`, dsb. |
| `<nxc/Theme.h>` | hot-swap tema gelap/terang + ikon (`appIcon`, `contextIcon`, glyph Fluent) |
| `<nxc/Tray.h>` | system tray icon + menu |
| `<nxc/Runtime.h>` | kontrak bersama ketiga runtime (mulai/stop/kirim/pesan masuk) |
| `<nxc/JavaScriptRuntime.h>` | runtime JS **in-process** (QJSEngine) — API JS sama seperti Node |
| `<nxc/NodeRuntime.h>` | Node.js out-of-process (framing JSON per baris) |
| `<nxc/PythonRuntime.h>` | Python out-of-process — protokol sama, peluncur beda (`py -3`/`python`) |
| `<nxc/Export.h>` | makro `NXC_EXPORT` (dllimport/dllexport/`NXC_STATIC`) |

**Modul opsional** (library terpisah — link hanya kalau dipakai, Foundation §7.6):

| Header | Target CMake | Isi |
|---|---|---|
| `<nxc/Database.h>` | `nxc::Database` (Qt6 Sql) | koneksi SQLite/driver lain, koneksi per thread, query async, transaksi, migrasi `NNN_nama.sql` |
| `<nxc/WebSocket.h>` | `nxc::WebSocket` (Qt6 WebSockets) | client: reconnect + backoff, antrean saat terputus, ping keepalive, helper JSON |

```cmake
find_package(nxc CONFIG REQUIRED COMPONENTS Database WebSocket)
target_link_libraries(app PRIVATE nxc::nxc nxc::Database nxc::WebSocket)
nxc_deploy(app)   # SETELAH target_link_libraries
```

**Aturan pakai:**

1. Selalu `#include <nxc/X.h>` — jangan pernah mengutak-atik path ke `src/`.
2. Tipe yang hanya *di-forward-declare* di header publik (mis. `class TitleBar;`
   di `Window.h`) adalah **milik internal** — hanya terlihat sebagai pointer di
   bagian privat. Jangan pernah mendefinisikan, men-deref, atau mewarisi tipe
   itu dari project developer.
3. `NXC_EXPORT` wajib pada setiap kelas/fungsi publik baru (lihat checklist §6).
4. Event: subscribe `nxc::EventBus::instance()` dan pakai konstanta
   `nxc::Event::*` — string bebas (`"modul.kejadian"`) juga boleh untuk event
   aplikasi sendiri.

---

## 5. Cara developer memakai SDK (ringkas)

```bat
:: 1) bangun library + install SDK Debug + Release (sekali, ulangi setelah tiap perubahan)
set SDK=1
build.bat

:: 1b) cara tercepat: buat project siap build (CMakeLists + CMakePresets + src/)
npm create nxc-app@latest MyApp
::     atau tanpa Node:
powershell -ExecutionPolicy Bypass -File tools\new-app.ps1 -Name MyApp -Path D:\proyek

:: 2) project Anda: find_package + link
cmake -S . -B build -G "Visual Studio 17 2022" -A x64 ^
      -DCMAKE_PREFIX_PATH="<path\ke\nxc-sdk>;C:\Qt\6.8.3\msvc2022_64"
```

```cmake
find_package(nxc CONFIG REQUIRED)          # juga menerima find_package(NXC)
target_link_libraries(app PRIVATE nxc::nxc Qt6::Widgets)
nxc_deploy(app)   # salin nxc(d).dll + windeployqt + Qt6Qml setelah build -> exe langsung jalan
```

SDK memuat `nxc.dll`/`nxc.lib` (Release) **dan** `nxcd.dll`/`nxcd.lib`
(Debug); `find_package(nxc)` memilih sendiri sesuai konfigurasi build Anda.

```cpp
#include <nxc/Application.h>
#include <nxc/Window.h>

int main(int argc, char* argv[]) {
    nxc::Application app(argc, argv);
    app.setWindowFactory([] { return new MyWindow; });   // MyWindow : nxc::Window
    return app.exec();
}
```

Contoh lengkap & teruji: **`examples/hello-nxc/`** (langkah detail di
`examples/hello-nxc/README.md`) — di situ terbukti tidak ada satu pun
`#include` ke `src/`. Ada juga sample yang lebih luas cakupannya — menguji
Dialog, ContextMenu+shortcut, Theme, Settings, EventBus, multi-window, dan
JavaScriptRuntime — di **`D:\Cnative\desktop\Developer`** (project sungguhan
di luar repo, build & jalankan terverifikasi).

---

## 6. Garis merah — yang **tidak boleh** dilakukan developer

| ❌ Jangan | Alasan |
|---|---|
| `#include "src/...."` atau menambah include path ke repo NXC | Header internal tidak ikut terpasang; struktur `src/` bebas berubah tiap rilis |
| Memakai `TitleBar`, `platform.h`, `MainWindow`, `bridge.h`, dll. | Tipe internal — tidak diekspor, tidak stabil, bisa di-rename/kapan saja |
| Mengedit file di `nxc-sdk/` secara manual | Hasil `cmake --install` — tertimpa pada install berikutnya; kalau isinya salah, perbaiki di `CMakeLists.txt` internal lalu install ulang |
| Mengubah `nxc-sdk/resources/*.qss` untuk mengganti tampilan | `nxc.dll` membaca stylesheet dari yang ter-embed (`:/style_*.qss`), bukan dari folder itu. Kustomisasi UI = stylesheet aplikasi sendiri atau `Theme::apply()` |
| Menyimpan `main()` di dalam library | Library tidak punya `main()` — entry point selalu di project developer |
| Bergantung pada layout/pengaturan QSettings internal | Pakai `nxc::Settings` (API resmi); format penyimpanan bisa berubah |
| Menyebarkan `nxc.dll` tanpa dependensi runtime-nya | Lihat §8 — minimal DLL Qt yang diperlukan + `nxc.dll` |

---

## 7. Checklist: menambah API baru (untuk kontributor internal)

1. Header publik baru/diubah di `include/nxc/` — include guard
   `NXC_QT6_PUBLIC_*`, `#include <nxc/Export.h>`, `namespace nxc`,
   `NXC_EXPORT` pada setiap simbol yang diekspor.
2. Tambahkan ke daftar `NXC_PUBLIC_HEADERS` di `CMakeLists.txt` (otoromatis
   ikut ter-install ke `inc/nxc/`).
3. **Jangan bocorkan tipe internal** — kalau terpaksa, forward-declare saja
   (pola `class TitleBar;` di `Window.h`) dan simpan sebagai pointer privat.
4. Dokumentasikan di `docs/API.md` + satu baris di tabel struktur `README.md`.
5. Test di `tests/` (`NXC_BUILD_TESTS=1`) dan pastikan `examples/hello-nxc/`
   tetap build — itu detektor otomatis "ada kebocoran ke internal?".
6. Jalankan penuh: `ctest --test-dir build -C Release` (harus 14/14).
7. Perilaku lama yang berubah = *breaking* → naikkan versi mayor
   (`project(nxc VERSION ...)`; paket memakai kompatibilitas `SameMajorVersion`).

---

## 8. Catatan versi & runtime untuk developer

- **Versi paket**: `find_package(nxc ...)` memakai `SameMajorVersion` — aman
  selama mayor sama; breaking change = mayor baru.
- **Shared (default) vs statik**: build shared meng-hidupkan QtQml **hanya di
  dalam** `nxc.dll` — konsumen tidak perlu QtQml saat *configure*. Build statik
  dengan QtQml → `nxcConfig.cmake` otomatis menambahkan
  `find_dependency(Qt6 COMPONENTS Qml)` (karena dependensi PRIVATE ikut terbawa
  lewat `$<LINK_ONLY:...>`).
- **Runtime JavaScript**: `nxc::JavaScriptRuntime` selalu tersedia sebagai
  kelas; kalau NXC dibangun tanpa QtQml, `isAvailable()` = `false` — cek dulu
  sebelum dipakai (action menu demo melakukan ini).
- **Deploy aplikasi developer**: jalankan `windeployqt` pada `.exe` Anda,
  **lalu salin `Qt6Qml.dll` bila belum ada** — `windeployqt` tidak membaca
  dependensi app-local `nxc.dll` yang mengimpornya (gejala: gagal start
  `0xC0000135`). Alternatif: jalankan juga
  `windeployqt --release <path>\nxc.dll`.
- **`nxc.dll` harus bisa ditemukan** saat runtime: salin ke folder `.exe`,
  atau tambahkan `nxc-sdk\bin` ke PATH.

---

## 9. Masalah umum developer

| Gejala | Penyebab paling mungkin | Solusi |
|---|---|---|
| `Could not find a package configuration file "nxcConfig.cmake"` | `CMAKE_PREFIX_PATH` tidak menunjuk `nxc-sdk` | Sertakan `<path>\nxc-sdk` di `-DCMAKE_PREFIX_PATH` (isi file ada di `nxc-sdk/cmake/`) |
| `LNK1104: cannot open file 'nxc.dll'` | aplikasi yang memakai DLL-nya masih berjalan (mis. demo `nxc-qt6.exe`) | Tutup aplikasi itu lalu build ulang |
| Start gagal `0xC0000135` | DLL Qt kurang di folder exe (sering `Qt6Qml.dll`) | Panggil `nxc_deploy(<target>)` di CMakeLists.txt, atau manual `windeployqt` + salin `Qt6Qml.dll` (lihat §8) |
| Build Debug gagal link (`nxcd.lib` tidak ada / `LNK2038 _ITERATOR_DEBUG_LEVEL`) | SDK hanya berisi Release | Bangun ulang SDK: `set SDK=1` lalu `build.bat` |
| Error `Cannot open include file: 'src/....'` | ada include ke internal — melanggar §6 | Ganti dengan `<nxc/...>`; kalau API yang Anda butuh belum ada, usulkan sebagai header publik (§7) |
| Compiler/CRT beda antara SDK dan aplikasi | kit Qt/MSVC tidak sama | Pakai kit MSVC yang sama dengan yang membangun NXC (catatan C4251 sudah dinonaktifkan di `Export.h` untuk kasus ini) |

---

## 10. FAQ cepat

| Pertanyaan | Jawaban |
|---|---|
| Boleh baca `src/` untuk paham cara kerja? | Boleh untuk belajar, tapi **jangan** jadikan dependensi — itu internal |
| Boleh ubah `.qss` di SDK? | Tidak berpengaruh (di-embed di DLL); pakai stylesheet aplikasi sendiri |
| Di mana `main()`? | Selalu di project developer (lihat `examples/hello-nxc/src/main.cpp`) |
| Header mana saja yang dijamin ada? | Persis 13 di §4 (`NXC_PUBLIC_HEADERS`) |
| Bagaimana menambah fitur ke NXC? | Ikuti checklist §7 — dari dalam repo, bukan dari project konsumen |
| Ikon aplikasi sendiri? | `setWindowIcon()` di aplikasi Anda (resource `.exe` = urusan project Anda, lihat pola `src/app.rc.in`) |
