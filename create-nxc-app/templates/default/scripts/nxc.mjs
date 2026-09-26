#!/usr/bin/env node
// Perintah build project NXC lewat npm - tanpa dependency (Node >= 18).
//
//   npm run dev       build Debug lalu jalankan aplikasi
//   npm run build     build Debug            (--release = build Release)
//   npm run release   build Release
//   npm run dist      build Release -> installer dist/<artifactName> (Windows +
//                     Inno Setup) atau zip portable (--zip / tanpa Inno Setup)
//   npm run clean     hapus folder build/ dan dist/
//
// Identitas (version, productName, description, author, nxc.icon,
// nxc.shortcutName, nxc.artifactName) dibaca dari package.json.
// Ada runtime/package.json (dependensi skrip Node)? -> npm install otomatis
// di runtime/ sebelum build bila perlu.
//
// Di balik layar memakai CMakePresets.json project ini (path SDK NXC + Qt
// ada di sana). Windows: satu folder build multi-konfigurasi (Visual Studio);
// Linux/macOS: satu folder build per konfigurasi.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const target = (pkg.nxc && pkg.nxc.target) || pkg.name;
const isWindows = process.platform === 'win32';

function fail(message) {
    console.error(`\n[nxc] ${message}`);
    process.exit(1);
}

function run(command, args, options = {}) {
    console.log(`\n> ${command} ${args.join(' ')}`);
    const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
    if (result.error) {
        if (result.error.code === 'ENOENT') {
            fail(`'${command}' tidak ditemukan di PATH.` +
                 (command === 'cmake'
                     ? ' Pasang CMake >= 3.21 (https://cmake.org/download/) atau buka "Developer PowerShell for VS 2022".'
                     : ''));
        }
        fail(result.error.message);
    }
    if (result.status !== 0)
        fail(`${command} gagal (exit ${result.status}).`);
}

// Windows: preset configure "default" + build preset debug/release.
// Lainnya: preset configure & build bernama sama dengan konfigurasinya.
function configurePreset(config) {
    return isWindows ? 'default' : config;
}

function buildDir(config) {
    return isWindows ? path.join(root, 'build') : path.join(root, 'build', config);
}

function outputDir(config) {
    return isWindows ? path.join(buildDir(config), config === 'release' ? 'Release' : 'Debug')
                     : buildDir(config);
}

function executable(config) {
    return path.join(outputDir(config), isWindows ? `${target}.exe` : target);
}

// Dependensi npm skrip runtime (nxc::NodeRuntime): runtime/package.json,
// TERPISAH dari package.json build ini. node_modules di runtime/ ikut disalin
// ke sebelah exe (dan installer), jadi require() tetap jalan di komputer
// pengguna. Hanya dijalankan bila belum terpasang atau package.json/lock
// lebih baru dari instalasi terakhir.
function installRuntimeDependencies() {
    const dir = path.join(root, 'runtime');
    const manifest = path.join(dir, 'package.json');
    if (!fs.existsSync(manifest))
        return;
    const marker = path.join(dir, 'node_modules', '.package-lock.json'); // ditulis npm >= 7
    const mtime = (file) => (fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0);
    const changed = Math.max(mtime(manifest), mtime(path.join(dir, 'package-lock.json')));
    if (fs.existsSync(marker) && mtime(marker) >= changed) {
        console.log('[nxc] dependensi runtime/ sudah terpasang');
        return;
    }
    // npm di Windows = npm.cmd -> butuh shell.
    run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], { cwd: dir, shell: isWindows });
}

function build(config) {
    installRuntimeDependencies();
    // Configure hanya bila belum pernah (CMake sendiri mengulang configure
    // otomatis saat CMakeLists.txt berubah).
    if (!fs.existsSync(path.join(buildDir(config), 'CMakeCache.txt')))
        run('cmake', ['--preset', configurePreset(config)]);
    run('cmake', ['--build', '--preset', config]);
    const exe = executable(config);
    if (!fs.existsSync(exe))
        fail(`build selesai tetapi ${path.relative(root, exe)} tidak ada.`);
    console.log(`\n[nxc] siap: ${path.relative(root, exe)}`);
    return exe;
}

function dev() {
    const exe = build('debug');
    console.log(`\n[nxc] menjalankan ${target} (tutup jendelanya untuk selesai)...`);
    run(exe, process.argv.slice(3).filter((a) => a !== '--release'));
}

// ---------------------------------------------------------------- installer

const osName = isWindows ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
const productName = pkg.productName || target;

// "${name}-setup-${version}.${ext}" -> nama file (variabel seperti electron-builder).
function artifactName(ext) {
    const pattern = (pkg.nxc && pkg.nxc.artifactName) || '${name}-setup-${version}.${ext}';
    const vars = { name: pkg.name, productName, version: pkg.version, ext, os: osName, arch: 'x64' };
    return pattern.replace(/\$\{(\w+)\}/g, (all, key) => (key in vars ? String(vars[key]) : all));
}

function findInnoSetup() {
    if (!isWindows)
        return null;
    const candidates = [
        process.env.INNO_SETUP_ISCC,
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Inno Setup 6', 'ISCC.exe'),
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Inno Setup 6', 'ISCC.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Inno Setup 6', 'ISCC.exe'),
    ];
    const found = candidates.find((c) => c && fs.existsSync(c));
    if (found)
        return found;
    const where = spawnSync('where', ['ISCC.exe'], { encoding: 'utf8' });
    return where.status === 0 ? where.stdout.split(/\r?\n/)[0].trim() : null;
}

// Teks untuk skrip Inno Setup: { ditulis {{, tanda kutip digandakan.
function inno(text) {
    return String(text ?? '').replace(/\{/g, '{{').replace(/"/g, '""');
}

function authorName() {
    const a = pkg.author;
    return typeof a === 'string' ? a : (a && a.name) || '';
}

function appIcon() {
    const icon = pkg.nxc && pkg.nxc.icon;
    if (!icon)
        return null;
    if (/\.ico$/i.test(icon))
        return path.resolve(root, icon);
    // .png -> .ico dibuat cmake/NxcApp.cmake saat configure.
    const generated = path.join(buildDir('release'), 'nxc_app_icon.ico');
    return fs.existsSync(generated) ? generated : null;
}

function installer(iscc, outDir) {
    const file = artifactName('exe');
    const appId = (pkg.nxc && pkg.nxc.appId) || `nxc.${pkg.name}`;
    const numeric = (pkg.version.match(/^\d+(\.\d+){0,2}/) || ['0'])[0];
    const icon = appIcon();
    const shortcut = (pkg.nxc && pkg.nxc.shortcutName) || productName;
    const exe = `{app}\\${target}.exe`;
    const iss = [
        '[Setup]',
        `AppId={{${inno(appId)}`,
        `AppName=${inno(productName)}`,
        `AppVersion=${inno(pkg.version)}`,
        `AppPublisher=${inno(authorName())}`,
        `VersionInfoVersion=${numeric}`,
        `VersionInfoDescription=${inno(pkg.description || productName)} Setup`,
        `DefaultDirName={autopf}\\${inno(productName)}`,
        `DefaultGroupName=${inno(productName)}`,
        'DisableProgramGroupPage=yes',
        // Tanpa hak admin secara default (per-user); admin bisa memilih semua user.
        'PrivilegesRequired=lowest',
        'PrivilegesRequiredOverridesAllowed=dialog',
        'ArchitecturesAllowed=x64compatible',
        'ArchitecturesInstallIn64BitMode=x64compatible',
        `OutputDir=${outDir}`,
        `OutputBaseFilename=${inno(file.replace(/\.exe$/i, ''))}`,
        icon ? `SetupIconFile=${icon}` : '',
        `UninstallDisplayIcon=${exe}`,
        `UninstallDisplayName=${inno(productName)}`,
        'Compression=lzma2',
        'SolidCompression=yes',
        'WizardStyle=modern',
        '',
        '[Tasks]',
        'Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"',
        '',
        '[Files]',
        `Source: "${outputDir('release')}\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs`,
        '',
        '[Icons]',
        `Name: "{group}\\${inno(shortcut)}"; Filename: "${exe}"`,
        `Name: "{autodesktop}\\${inno(shortcut)}"; Filename: "${exe}"; Tasks: desktopicon`,
        '',
        '[Run]',
        `Filename: "${exe}"; Description: "{cm:LaunchProgram,${inno(productName)}}"; Flags: nowait postinstall skipifsilent`,
        '',
    ].filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\r\n');
    const issPath = path.join(buildDir('release'), 'nxc-installer.iss');
    fs.writeFileSync(issPath, '\ufeff' + iss); // UTF-8 BOM: Inno Setup 6 membaca Unicode
    fs.rmSync(path.join(outDir, file), { force: true });
    run(iscc, ['/Q', issPath]);
    console.log(`\n[nxc] installer siap dibagikan: ${path.relative(root, path.join(outDir, file))}`);
}

function dist() {
    build('release');
    const outDir = path.join(root, 'dist');
    fs.mkdirSync(outDir, { recursive: true });

    const forceZip = process.argv.includes('--zip');
    if (isWindows && !forceZip) {
        const iscc = findInnoSetup();
        if (iscc) {
            installer(iscc, outDir);
            return;
        }
        console.log('\n[nxc] Inno Setup belum terpasang - setup.exe tidak dibuat, zip portable sebagai gantinya.');
        console.log('[nxc] Pasang sekali: winget install JRSoftware.InnoSetup   (lalu ulangi npm run dist)');
    }

    const base = `${target}-${pkg.version}-${osName}-x64`;
    const archive = path.join(outDir, isWindows ? `${base}.zip` : `${base}.tar.gz`);
    fs.rmSync(archive, { force: true });
    // tar bawaan OS: Windows 10+ (bsdtar, -a = format dari ekstensi .zip);
    // di Windows dipakai System32\tar.exe supaya bukan GNU tar Git.
    const tar = isWindows
        ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
        : 'tar';
    const args = isWindows ? ['-a', '-c', '-f', archive, '-C', outputDir('release'), '.']
                           : ['-czf', archive, '-C', outputDir('release'), target];
    run(tar, args);
    console.log(`\n[nxc] paket siap dibagikan: ${path.relative(root, archive)}`);
    if (!isWindows)
        console.log('[nxc] catatan: di Linux/macOS pengguna perlu Qt 6 + nxc terpasang di sistem.');
}

function clean() {
    for (const dir of ['build', 'dist']) {
        fs.rmSync(path.join(root, dir), { recursive: true, force: true });
        console.log(`[nxc] dihapus: ${dir}/`);
    }
}

const command = process.argv[2];
const release = process.argv.includes('--release');
switch (command) {
case 'dev':
    dev();
    break;
case 'build':
    build(release ? 'release' : 'debug');
    break;
case 'dist':
    dist();
    break;
case 'clean':
    clean();
    break;
default:
    fail(`perintah tidak dikenal: ${command || '(kosong)'} - pakai dev | build [--release] | dist | clean`);
}
