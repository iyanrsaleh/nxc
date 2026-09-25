# NXC Qt6 — Dokumentasi API

Referensi per header publik (`include/nxc/`, Foundation §6). Semua berada di
`namespace nxc` dan diekspor lewat `NXC_EXPORT` (lihat `Export.h`).

Cara memakai SDK:

```cmake
find_package(nxc CONFIG REQUIRED)
target_link_libraries(app PRIVATE nxc::nxc Qt6::Widgets)
```

---

## `<nxc/Application.h>` — `nxc::Application`

Bootstrap seluruh aplikasi; menggantikan penulisan `main()` sendiri.

```cpp
int main(int argc, char* argv[]) {
    nxc::Application app(argc, argv);
    app.setApplicationName(QStringLiteral("My App"));
    app.setOrganizationName(QStringLiteral("MyOrg");
    app.setWindowFactory([] { return new MyWindow; });
    return app.exec();
}
```

| Anggota | Keterangan |
| ------- | ---------- |
| `Application(argc, argv)` | Membuat `QApplication`, nama app/org default, QSettings format INI, style Fusion, ikon, tema awal dari preferensi tersimpan |
| `setApplicationName / setOrganizationName` | Identitas (pakai **sebelum** `exec()`); menentukan lokasi file preferensi |
| `setWindowFactory(std::function<nxc::Window*()>)` | Pabrik window; dipanggil untuk window pertama dan `File > Jendela Baru` |
| `windows()` | Daftar `nxc::Window*` yang masih hidup |
| `createWindow()` | Buat + tampilkan window baru lewat factory |
| `exec()` | Pasang window pertama, tray, pancarkan `Event::ApplicationStarted`, jalankan event loop. Mengembalikan kode keluar aplikasi |

Catatan: `closeToTray` (lihat `Settings.h`) diproses Application — window
terakhir ditutup ≠ aplikasi keluar kalau opsi itu aktif.

---

## `<nxc/Window.h>` — `nxc::Window`

Window frameless dengan title bar dan resize kustom — **tanpa garis tepi**
(tampilan Fluent/Win11) — turunkan untuk isi aplikasi developer.

```cpp
class MyWindow : public nxc::Window {
public:
    MyWindow() {
        setTitle(QStringLiteral("Judul"));
        setContent(new MyContentWidget(this));   // widget isi di bawah title bar
    }
};
```

| Anggota | Keterangan |
| ------- | ---------- |
| `setTitle(judul)` / `setWindowTitle` | Judul di title bar (sinkron dengan `windowTitle`) |
| `setContent(QWidget*)` | Isi window di bawah title bar; widget lama dihapus dari layout |
| `setResizeMargin(px)` | Lebar zona tepi transparan untuk resize (default 6; **bukan** border/padding — konten selalu flush ke tepi; zona disembunyikan saat maximize/fullscreen) |
| `toggleMaximize()` | Maksimal/restore; `maximizedChanged(bool)` memberi tahu title bar |
| `icon` | Ikon title bar (default `Theme::appIcon()`) |

Perilaku bawaan: `Qt::FramelessWindowHint`, tombol min/max/close, drag title
bar (`startSystemMove`), sudut membulat + drop shadow via
`nxc::platform::applyWindowEffects` (internal). **Tidak ada garis tepi dan
tidak ada padding**: garis 1px bawaan DWM dimatikan (`DWMWA_COLOR_NONE`),
layout flush 0 sehingga title bar + konten *full bleed* ke tepi window, dan
resize ditangani zona tepi transparan selebar `resizeMargin()` (overlay tanpa
warna — hover menampilkan kursor resize, klik memanggil
`QWindow::startSystemResize()`). Saat maximize/fullscreen zona itu
disembunyikan dan sudut menjadi siku seperti window native Win11.

---

## `<nxc/ContextMenu.h>` — `nxc::ContextMenu`

Mesin context menu: foundation menyediakan mekanismenya, developer mengisi
isinya.

```cpp
auto* menu = new nxc::ContextMenu(this);
menu->setIconResolver([](const QString& n) { return nxc::Theme::contextIcon(n); });
menu->addItemWithIcon(QStringLiteral("copy"), tr("Salin"), [this] { copy(); },
                      QKeySequence::Copy);
menu->addSeparator();
menu->addItem(tr("Relevan Saja"), [this] { x(); }, {},
              [this] { return hasSelection(); });   // visibleWhen
menu->addSubmenu(tr("Zoom"))->addItem(tr("Perbesar"), [this] { zoomIn(); });
menu->attach(myWidget);                            // klik kanan -> popup
```

| Fungsi | Keterangan |
| ------ | ---------- |
| `addItem(text, handler, shortcut, visibleWhen)` | Item biasa; `visibleWhen` = deteksi konteks (dibaca tiap popup **dan** saat shortcut ditekan) |
| `addItemWithIcon(iconName, ...)` | Sama, ikon diterjemahkan oleh resolver |
| `addCheckableItem(text, checked, handler)` | `checked` = predikat dibaca tiap build; `handler(bool)` hanya dipanggil pada aktivasi user |
| `addSeparator()` | Pemisah |
| `addSubmenu(title)` | Mengembalikan `ContextMenu*` anak |
| `setIconResolver(f)` | `nama -> QIcon`; otomatis ikut tema |
| `attach/detach(widget)` | Klik kanan → menu muncul di kursor; **sekaligus memasang `QShortcut`** untuk semua item bersertifikat shortcut (termasuk item submenu) — aktif selama widget/anaknya memegang fokus, `visibleWhen` ikut dites |
| `populate(QMenu*)` / `createMenu(parent)` | Bangun `QMenu` dari pendaftaran |
| signal `triggered(text)` | Setiap item diklik (lewat menu **atau** shortcut) |

---

## `<nxc/Keyboard.h>` — `nxc::Keyboard` + `nxc::KeyEvent`

Keyboard & input system (Foundation §7.1). Satu event filter di `qApp` —
event yang diteruskan Qt dari widget ke parent-nya tidak dihitung ulang.

```cpp
connect(&nxc::Keyboard::instance(), &nxc::Keyboard::keyPressed, this,
        [](const nxc::KeyEvent& e) { qDebug() << e.toString(); });   // "Ctrl+S"

nxc::Keyboard::setWidgetContext(editor, QStringLiteral("Editor"));   // input context
nxc::Keyboard::setInputContext(QStringLiteral("Terminal"));           // konteks eksplisit
```

| Fungsi | Keterangan |
| ------ | ---------- |
| `keyToString(key)` / `keyFromString(name)` | Key mapping portabel (`Qt::Key_F11` ↔ `"F11"`); tak dikenal → `""` / `0` |
| `sequenceFromString(text)` / `sequenceToString(seq)` | `"Ctrl+K, Ctrl+S"` ↔ `QKeySequence`; bagian tak dikenal → sequence kosong |
| `modifiers()`, `isCtrlDown()`, `isAltDown()`, `isShiftDown()`, `isMetaDown()` | Status modifier saat ini (macOS: Qt memetakan Ctrl ↔ Cmd) |
| `isModifierKey(key)` | Tombol modifier sendirian (Ctrl, Shift, Alt, AltGr, Meta, ...) |
| `setInputContext(name)` / `inputContext()` | Konteks eksplisit; signal `inputContextChanged` |
| `setWidgetContext(widget, name)` / `widgetContext(widget)` | Tandai komponen; aktif saat fokus di widget itu atau anaknya |
| `activeContexts(focus)` | Tanda di rantai fokus (terdalam dulu) + konteks eksplisit |
| signal `keyPressed(KeyEvent)` / `keyReleased(KeyEvent)` | Tombol yang sampai ke widget — tombol yang dimakan `QAction`/`QShortcut` Qt tidak termasuk |

`nxc::KeyEvent`: `key`, `modifiers`, `text`, `autoRepeat`, `sequence()`,
`toString()` — tipe nilai, aman untuk signal queued.

---

## `<nxc/Shortcut.h>` — `nxc::Shortcut`

Sistem shortcut terpusat (Foundation §7.2, §7.3). Foundation menulis
`nxc::Shortcut::register(...)`; karena `register` keyword C++, namanya `add()`.

```cpp
nxc::Shortcut::add("Ctrl+S", [] { save(); });                        // Application
nxc::Shortcut::add("Ctrl+K, Ctrl+S", [] { saveAll(); });             // chord
nxc::Shortcut::addToWindow(window, "F11", [window] { ... });         // Window
nxc::Shortcut::addToContext("Terminal", "Ctrl+L", [] { clear(); });  // Context
```

| Fungsi | Keterangan |
| ------ | ---------- |
| `add(seq, handler)` | Scope **Application** — aktif di window mana pun (diblokir dialog modal, seperti `Qt::ApplicationShortcut`) |
| `addToWindow(widget, seq, handler)` | Scope **Window** — aktif saat fokus di dalam `widget`; ikut terhapus saat widget dihapus |
| `addToContext(name, seq, handler)` | Scope **Context** — aktif saat `name` ada di `Keyboard::activeContexts()` |
| `remove(id)`, `contains(id)`, `ids()` | Semua `add*` mengembalikan id (> 0), atau 0 kalau sequence tak valid / handler kosong / widget null |
| `sequence(id)`, `scope(id)`, `context(id)` | Info registrasi |
| `setEnabled(id, bool)` / `isEnabled(id)` | Per shortcut |
| `setContextEnabled(name, bool)` / `isContextEnabled(name)` | Semua shortcut satu konteks sekaligus |
| `conflicts(id)` | Id lain di target scope yang sama dengan sequence sama / awalan chord |
| signal `triggered(id, seq)` | Setelah handler jalan; juga `Event::ShortcutTriggered` di `EventBus` |
| signal `chordPending(partial)` | Tombol awal chord cocok, menunggu tombol berikutnya (kedaluwarsa 2 detik) |
| signal `conflictDetected(id, otherId)` | Saat registrasi (plus `qWarning`); registrasi tetap berlaku |

Aturan pemilihan: sequence sama di beberapa scope aktif → **Context > Window >
Application**; di scope yang sama → registrasi **terbaru**. Shortcut NXC
diproses **sebelum** `QAction`/`QShortcut` Qt untuk tombol yang sama; selama
popup menu terbuka, shortcut NXC tidak aktif.

---

## `<nxc/TerminalProcess.h>` — `nxc::TerminalProcess`

Process bridge terminal (Foundation §7.4), lapis **non-UI**. NXC tidak membuat
shell — yang dijalankan shell/program yang sudah ada di OS.

```cpp
auto* term = new nxc::TerminalProcess(this);
term->setShell(nxc::TerminalProcess::Shell::PowerShell);
term->setWorkingDirectory(projectDir);
term->setEnvironmentVariable("MODE", "dev");
connect(term, &nxc::TerminalProcess::standardOutput, this, [](const QString& t) { ... });

term->execute("Get-ChildItem");          // sekali jalan -> finished(exitCode, crashed)
// atau sesi interaktif:
term->start();
term->writeLine("git status");
```

| Fungsi | Keterangan |
| ------ | ---------- |
| `setShell(Shell)` | `Default` (Windows `cmd`, Unix `$SHELL`/`sh`), `Cmd`, `PowerShell`, `Pwsh`, `Sh`, `Bash` |
| `setProgram(program, args)` | Program CLI apa pun (`Shell::Custom`); `execute()` tidak berlaku |
| `setShellArguments(args)` / `shellArguments()` | Argumen tambahan sesi interaktif shell bawaan (`start()`), setelah argumen NXC — mis. `{"-NoExit", "-Command", "..."}` |
| `shellProgram(shell)` / `isShellAvailable(shell)` / `defaultShell()` | Path shell di sistem ini (kosong = tidak ada) |
| `setWorkingDirectory(dir)` | Kosong = working directory aplikasi |
| `setEnvironment(env)`, `setEnvironmentVariable(n, v)`, `unsetEnvironmentVariable(n)` | Default: environment sistem |
| `start()` | Sesi interaktif, non-blocking; `false` = ditolak (sudah jalan / shell tak ada) |
| `execute(command)` | Satu perintah lewat shell: `cmd /d /s /c "..."`, PowerShell `-EncodedCommand`, Unix `sh -c` — perintah diteruskan apa adanya, termasuk kutip |
| `setMode(Mode)` / `mode()` / `static isPseudoTerminalSupported()` | `Pipe` (default) atau `PseudoTerminal` (ConPTY Windows 10 1809+ / forkpty). PTY diabaikan bila OS tak mendukung |
| `resizeTerminal(cols, rows)`, `terminalColumns()`, `terminalRows()` | Ukuran layar PTY (default 80×24); saat berjalan program menerima ukuran baru |
| `write(text)` / `writeLine(line)` / `closeInput()` | Pipe: stdin (encoding console OS). PTY: byte UTF-8 mentah seperti diketik, `writeLine` diakhiri `\r` (Enter), `closeInput` = ^D. `false` kalau tidak Running |
| `interrupt()` | PTY: ^C sungguhan, shell tetap hidup (`true`). Pipe — Unix: SIGINT (`true`); Windows: sesi dihentikan (`false`), berakhir `Stopped` |
| `stop()` | Pipe: tutup stdin → tunggu → paksa. PTY: akhiri proses, tunggu `finished()` |
| `state()`, `processId()`, `exitCode()` | Lifecycle sama dengan `nxc::Runtime`: `Stopped/Starting/Running/Stopping/Error` |
| signal `standardOutput(text)` / `standardError(text)` | Potongan teks (bukan per baris). Pipe: Windows didekode dari codepage OEM. PTY: satu stream UTF-8 berisi escape VT (stderr menyatu, `standardError` tidak dipakai) |
| signal `finished(exitCode, crashed)`, `stateChanged(state)`, `errorOccurred(msg)` | Gagal start / crash → `Error` |

Mode **Pipe** cocok untuk otomasi (output bersih); program layar penuh
(editor, prompt password, progress bar) butuh mode **PseudoTerminal** + emulator
VT untuk ditampilkan — `nxc::Terminal` memakainya.

---

## `<nxc/Terminal.h>` — `nxc::Terminal`

Terminal UI (Foundation §7.4): **satu area** tempat pengguna mengetik langsung,
seperti PowerShell/cmd/xterm.
`TerminalProcess` mode `PseudoTerminal` + emulator VT internal (warna 16/256/
truecolor, kursor, layar alternatif, scrollback). Shell sendiri yang meng-echo,
mengelola riwayat ↑/↓, Tab-completion, prompt PSReadLine; `vim`/`htop` jalan.

```cpp
auto* terminal = new nxc::Terminal(this);
terminal->process()->setShell(nxc::TerminalProcess::Shell::Pwsh);
layout->addWidget(terminal);
terminal->start();

// shortcut khusus terminal milik developer (§7.3):
nxc::Shortcut::addToContext("Terminal", "Ctrl+K", [terminal] { terminal->clear(); });
```

| Fungsi | Keterangan |
| ------ | ---------- |
| `process()` | `TerminalProcess` di baliknya (sudah mode PTY bila didukung) — atur shell/dir/env sebelum `start()`. `Shell::Default` di Windows = **pwsh 7 → Windows PowerShell → cmd** (pertama yang ada) |
| `setPredictionView(v)` / `predictionView()` | Saran PowerShell 7 (PSReadLine Predictive IntelliSense, dari history sejak huruf pertama): `List` (default — panel di bawah prompt, ↑/↓ pilih), `Inline` (teks abu-abu, → terima), `ShellDefault` (ikut profil pengguna). Hanya pwsh 7 + PTY; diterapkan setelah profil; F2 tetap berpindah tampilan |
| `start()` | Mulai sesi kalau belum jalan (ukuran grid diteruskan ke PTY) |
| `runCommand(cmd)` | Seperti mengetik + Enter; memulai sesi bila perlu (input diantrekan sampai Running); dicatat di `history()` |
| `interrupt()` | ^C ke program yang berjalan |
| `clear()` | Bersihkan layar + scrollback; shell menggambar ulang prompt (cmd: `cls`, lainnya ^L) |
| `outputText()` | Teks polos layar + scrollback (tanpa escape VT) |
| `history()` | Perintah lewat `runCommand()` — ketikan langsung ada di riwayat shell (↑/↓) |
| `setMaximumBlockCount(n)` | Batas scrollback (default 5000; 0 = tanpa batas) |
| `terminalSize()` | Grid kolom×baris — mengikuti ukuran widget + font |
| `title()` / signal `titleChanged(t)` | Judul dari program (OSC 0/2) |
| signal `commandSubmitted(cmd)` | Setiap `runCommand()` |

Keyboard: ketikan, panah, Home/End, PgUp/PgDn, F1–F12, Ctrl+huruf, Alt+huruf,
Tab/Shift+Tab dikirim ke program sebagai urutan VT (xterm). **Ctrl+C** salin
kalau ada seleksi, selain itu ^C; **Ctrl+V** / Ctrl+Shift+V / Shift+Insert
tempel (bracketed paste bila diminta program); Ctrl+Shift+C salin; **Ctrl+L**
bersih; **klik kanan** salin seleksi / tempel; klik ganda pilih kata;
Shift+PgUp/PgDn & roda mouse gulir scrollback. Ctrl+C dan Ctrl+L = scope Window
pada widget — shortcut Context `"Terminal"` milik developer untuk tombol yang
sama menang. Widget ditandai konteks input `"Terminal"`.

Tampilan: font monospace lewat QSS `#TerminalView`; warna mengikuti tema
(gelap: Campbell, terang: One Half Light). Tanpa PTY (Windows lama) → mode
pipe dengan edit baris lokal di area yang sama (tanpa warna/Tab/program layar
penuh). Belum: pelaporan mouse ke program (klik di vim), reflow saat resize
(ConPTY menggambar ulang sendiri).

---

## `<nxc/Dialog.h>` — `nxc::Dialog`

Dialog standar: area isi + button box Ok/Cancel yang sudah tersambung.

```cpp
auto* dialog = new nxc::Dialog(window);
dialog->setTitle(QStringLiteral("Preferensi"));
dialog->contentLayout()->addWidget(new MySettingsWidget(dialog));
dialog->buttonBox()->addButton(QDialogButtonBox::Save);
if (dialog->exec() == QDialog::Accepted) { ... }
```

---

## `<nxc/Events.h>` — `nxc::EventBus` + `nxc::Event`

Papan pengumuman tunggal — decoupling antarbagian tanpa include bersama.

```cpp
connect(&nxc::EventBus::instance(), &nxc::EventBus::fired, this,
        [](const QString& type, const QVariantMap& data) { ... });
```

| Konstanta `nxc::Event` | Data |
| ---------------------- | ---- |
| `ApplicationStarted` | — |
| `WindowCreated` / `WindowDestroyed` | `{"title": ...}` |
| `ThemeChanged` | `{"dark": bool}` |
| `TrayActivated` | — |
| `ShortcutTriggered` | `{"id", "sequence", "scope", "context"}` |

`EventBus::instance().post(type, data)` memancarkan event sendiri (type bebas,
disarankan `"modul.kejadian"`). Subscriber di thread lain menerima via queued
connection otomatis.

---

## `<nxc/Settings.h>` — `nxc::Settings`

Preferensi bertahan sesi (QSettings INI, path mengikuti identitas aplikasi).

| Fungsi | Default |
| ------ | ------- |
| `darkTheme()` / `setDarkTheme(bool)` | `true` |
| `closeToTray()` / `setCloseToTray(bool)` | `false` |

Panggil setelah `Application` dibuat (nama org/app sudah di-set).

---

## `<nxc/Theme.h>` — `nxc::Theme`

| Fungsi | Keterangan |
| ------ | ---------- |
| `apply(dark)` | Hot-swap palette + qss; memancarkan `Event::ThemeChanged` hanya saat nilainya berubah |
| `isDark()` | Tema aktif |
| `appIcon()` | Ikon aplikasi (aset brand atau fallback runtime) |
| `contextIcon(name)` | Ikon context menu sesuai tema; `QIcon` kosong kalau nama tak dikenal |
| `fluentFontFamily()` / `fluentFont(px)` | Font Fluent System Icons yang di-embed |

---

## `<nxc/Tray.h>` — `nxc::Tray`

Pembungkus `QSystemTrayIcon` + menu bawaan (Tampilkan/Sembunyikan, Exit).
`nxc::Application` memasangnya otomatis; signal `activated()` dipakai Application
untuk toggle visibility + memancarkan `Event::TrayActivated`.

---

## `<nxc/Runtime.h>` — `nxc::Runtime` (opsional, Fase 6)

Layer abstraksi di atas mekanisme runtime (Foundation §8): **opsional**,
**isolated** (tidak pernah memblokir UI thread), **explicit bridge** (pesan
JSON — out-of-process per baris di stdin/stdout; in-process lewat panggilan
langsung), **lifecycle-managed**.

| Anggota | Keterangan |
| ------- | ---------- |
| enum `Kind` | `JavaScript` (in-process), `Node`, `Python` (keduanya out-of-process) |
| enum `State` | `Stopped → Starting → Running → Stopping → Stopped`, `Error` |
| `start()` / `stop()` | Non-blocking; hasil lewat `stateChanged` |
| `send(payload)` | JSON bebas bentuk ke sisi runtime; frame `{type:"send",payload}` dibungkus otomatis |
| signal `messageReceived(obj)` | Pesan dari runtime |
| signal `outputReceived(line, isError)` | Log non-protokol (`console.log` dkk.) |
| signal `errorOccurred(msg)` | Gagal start / crash / error protokol |

## `<nxc/NodeRuntime.h>` — `nxc::NodeRuntime`

Implementasi Node.js **out-of-process** (proses `node` terpisah; komunikasi
newline-JSON via stdin/stdout).

```cpp
if (!nxc::NodeRuntime::isAvailable()) { /* node tidak ada — sembunyikan fitur */ }

auto* rt = new nxc::NodeRuntime(this);
rt->setEntryPoint(QStringLiteral("scripts/app.js"));
connect(rt, &nxc::Runtime::messageReceived, this, [](const QJsonObject& m) { ... });
rt->start();
rt->send(QJsonObject{{"cmd", "proses"}});
```

Sisi script developer:

```js
// scripts/app.js — menerima payload dari C++
nxc.send({ ready: true });                 // -> messageReceived di C++
module.exports = (msg) => nxc.send({ echo: msg });   // handler pesan dari C++
```

Bridge internal (`src/runtime/node/bridge.js`) diekstrak ke file sementara
saat `start()`; `stop()` mengirim `{type:"shutdown"}` supaya proses Node keluar
bersih.

## `<nxc/PythonRuntime.h>` — `nxc::PythonRuntime`

Implementasi Python **out-of-process** — protokol bridge yang **sama persis**
dengan NodeRuntime, hanya peluncurnya berbeda (`py -3`, fallback `python`).
Ini bukti arsitektur multi-runtime: API aplikasi tidak berubah, cukup tukar
kelasnya.

```cpp
auto* py = new nxc::PythonRuntime(this);
py->setEntryPoint(QStringLiteral("scripts/app.py"));
connect(py, &nxc::Runtime::messageReceived, this, [](const QJsonObject& m) { ... });
py->start();   // nxc::PythonRuntime::isAvailable() dulu untuk mengecek
```

Sisi script developer:

```python
# scripts/app.py
nxc.send({"ready": True})                       # -> messageReceived di C++
nxc.on_message(lambda msg: nxc.send({"echo": msg}))   # handler dari C++
# alternatif (auto-detect): def nxc_message(payload): ...
```

| Fungsi | Keterangan |
| ------ | ---------- |
| `static isAvailable()` | `true` kalau `py` (dengan `-3`) atau `python` valid ditemukan; stub Microsoft Store ditolak lewat verifikasi `--version` |
| `setEntryPoint(path)` | Wajib sebelum `start()`; sama dengan NodeRuntime |
| `start/stop/send` | Warisan `nxc::Runtime` — tidak ada API baru |

## `<nxc/JavaScriptRuntime.h>` — `nxc::JavaScriptRuntime`

Implementasi JavaScript **in-process** (QJSEngine dari modul QtQml) —
satu-satunya runtime tanpa proses anak: skrip berjalan di thread Qt yang sama,
panggilan sinkron, tanpa dependensi interpreter eksternal. Protokol pesan
**sama** dengan Node/Python; pilih yang mana pun, API aplikasi tidak berubah.

```cpp
if (!nxc::JavaScriptRuntime::isAvailable()) { /* QtQml tak terpasang — sembunyikan */ }

auto* js = new nxc::JavaScriptRuntime(this);
js->setEntryPoint(QStringLiteral("scripts/app.js"));
connect(js, &nxc::Runtime::messageReceived, this, [](const QJsonObject& m) { ... });
js->start();   // Running langsung tercapai (sinkron) — bukan menunggu proses
js->send(QJsonObject{{"cmd", "proses"}});
```

Sisi script developer (skrip yang sama bisa dipakai di Node):

```js
// scripts/app.js
nxc.send({ ready: true });                      // -> messageReceived di C++
nxcOnMessage(function (msg) { nxc.send({ echo: msg }); });  // handler dari C++
// alternatif: module.exports = function (msg) { ... };
console.log("log ini -> outputReceived");       // bukan pesan protokol
```

| Fungsi | Keterangan |
| ------ | ---------- |
| `static isAvailable()` | `true` kalau library nxc dibangun dengan QtQml (`NXC_HAS_QML`); kalau tidak, kelas tetap ada sebagai stub — `start()` gagal dengan pesan jelas |
| `setEntryPoint(path)` | Wajib sebelum `start()`; sama dengan runtime lain |
| `start/stop/send` | Warisan `nxc::Runtime`; `stop()` sinkron (tak ada proses anak yang ditunggu) |

Catatan: butuh komponen **Qt Qml** di kit. Error di entry (sintaks/throw)
membuat `start()` gagal dengan `state=Error` dan `errorOccurred` yang memuat
nama file.

---

## Modul opsional (Foundation §7.6)

Library terpisah dari `nxc.dll` — hanya dibawa aplikasi yang me-link-nya.
Hanya ada di SDK kalau modul Qt-nya terpasang saat SDK dibangun (cek
`sdk.json`: `"database"`, `"websocket"`).

```cmake
find_package(nxc CONFIG REQUIRED COMPONENTS Database WebSocket)  # gagal jelas kalau tak ada
target_link_libraries(app PRIVATE nxc::nxc nxc::Database nxc::WebSocket)
nxc_deploy(app)   # panggil SETELAH target_link_libraries: ikut menyalin DLL modul + sqldrivers
```

NXC menyediakan **mekanisme** (koneksi, thread, migrasi, reconnect, event);
schema, query, dan protokol pesan tetap milik developer (Foundation §12).

## `<nxc/Database.h>` — `nxc::Database` (modul `nxc::Database`, Qt6 Sql)

```cpp
auto* db = new nxc::Database(this);
db->open();                                   // SQLite: <AppData>/data.sqlite
db->migrate(QStringLiteral(":/migrations"));  // 001_init.sql, 002_tambah.sql, ...
db->exec("INSERT INTO note(text) VALUES (?)", {text});          // sinkron
db->query("SELECT * FROM note", {}, this, [](const nxc::QueryResult& r) {
    // async: dijalankan di worker thread, callback di thread `this` (UI)
    for (const QVariantMap& row : r.rows) { ... }
});
```

| Fungsi | Keterangan |
| ------ | ---------- |
| `static defaultPath()` | `<AppDataLocation>/data.sqlite` — panggil setelah `nxc::Application` (nama org/app) |
| `open(sqlitePath = {})` | SQLite; folder dibuat otomatis. Tiap koneksi: `foreign_keys` ON, WAL, `busy_timeout` 5 dtk. `":memory:"` = memori yang dibagi semua thread objek ini |
| `open(ConnectionInfo)` | Driver lain (`QPSQL`, `QODBC`, ...): driver/host/port/database/user/password/options |
| `close()` | Tutup semua koneksi; query async yang sudah antre diselesaikan dulu |
| `connection()` | `QSqlDatabase` untuk **thread pemanggil** — di thread lain di-clone sekali lalu dipakai ulang (QSqlDatabase tidak boleh lintas thread) |
| `exec(sql, params)` | Sinkron; `?` diikat berurutan. Hasil `QueryResult{ok, error, rows, rowsAffected, lastInsertId}` — `rows` salinan (aman lintas thread) |
| `transaction(work)` | `work(QSqlDatabase&)` true → commit, false → rollback |
| `query(sql, params, context, callback)` | Async di satu worker thread (berurutan). Callback di thread `context`; tidak dipanggil kalau `context` sudah dihapus |
| `migrate(dir)` | Jalankan `<nomor>_<nama>.sql` (folder / resource `:/`) yang nomornya > `schemaVersion()`, urut numerik, satu transaksi per file; riwayat di tabel `nxc_migrations`; berhenti + rollback di file yang gagal |
| `schemaVersion()` | Nomor migrasi terakhir (0 = belum) |
| `static splitStatements(sql)` | Pemecah skrip (kutip, komentar, `CREATE TRIGGER ... END`) yang dipakai `migrate()` |
| `lastError()` / `errorOccurred(msg)` | Error terakhir / sinyal error |

Event (`EventBus`): `database.opened` `{driver, database}`,
`database.migrated` `{from, to}`, `database.error` `{message}` — konstanta
`nxc::Event::DatabaseOpened/DatabaseMigrated/DatabaseError`.

Catatan: `CASE ... END;` di dalam badan trigger belum dikenali pemecah
statement — tulis trigger seperti itu sebagai file migrasi tersendiri.

## `<nxc/WebSocket.h>` — `nxc::WebSocket` (modul `nxc::WebSocket`, Qt6 WebSockets)

Client WebSocket; semua signal di thread objek (UI), tidak ada yang memblokir.

```cpp
auto* ws = new nxc::WebSocket(this);
connect(ws, &nxc::WebSocket::jsonReceived, this, [](const QJsonObject& msg) { ... });
ws->open(QUrl(QStringLiteral("wss://contoh.id/ws")));
ws->sendJson({{"type", "halo"}});   // belum tersambung? diantre, dikirim saat tersambung
```

| Fungsi | Keterangan |
| ------ | ---------- |
| `open(url)` | `ws://` / `wss://`; URL lain → `errorOccurred`. Memutus koneksi lama |
| `close()` | Putus + berhenti reconnect; antrean dikosongkan |
| `state()` | `Disconnected` → `Connecting` → `Connected`; putus tak disengaja → `Reconnecting` |
| `sendText/sendJson/sendBinary` | Kirim langsung, atau antre saat terputus. `false` = antrean penuh / belum `open()` / sudah `close()` |
| `setAutoReconnect(bool)` | Default true |
| `setReconnectDelay(initial, max)` | Backoff eksponensial, default 1000 → 30000 ms; reset setelah tersambung |
| `setQueueLimit(n)` / `queuedCount()` | Default 1000; 0 = tanpa antrean |
| `setPingInterval(ms)` | Default 30000; tanpa pong 2 interval → putus paksa → reconnect (deteksi jaringan mati tanpa FIN) |

Signal: `stateChanged`, `connected`, `disconnected`, `textReceived`,
`jsonReceived` (teks yang berupa objek JSON), `binaryReceived`,
`errorOccurred`. Event: `websocket.connected` `{url}`,
`websocket.disconnected` `{url, reason}`.

Server WebSocket belum disediakan — kalau perlu, pakai Node runtime
(`nxc::NodeRuntime`) dengan paket npm `ws`.

---

## `<nxc/Export.h>`

Makro `NXC_EXPORT` — `dllexport` saat library dibangun (`NXC_LIBRARY`),
`dllimport` untuk konsumen; jadi kosong kalau library statik (`NXC_STATIC`).
Modul opsional memakai makro sendiri (`NXC_DATABASE_EXPORT`,
`NXC_WEBSOCKET_EXPORT`), supaya simbol core tetap di-import dari `nxc.dll`.
Developer project aplikasi tidak perlu menggunakannya sendiri.
