#!/usr/bin/env node
// create-nxc-app — membuat project aplikasi baru di atas SDK NXC.
//
//   npm create nxc-app@latest MyApp
//   npx create-nxc-app MyApp --sdk D:\nxc-sdk --qt C:\Qt\6.8.3\msvc2022_64
//
// Sengaja tanpa dependency: hanya modul bawaan Node. Template ada di
// templates/default/ (dipakai bersama tools/new-app.ps1).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const readline = require('readline');
const { spawnSync } = require('child_process');

const pkg = require('./package.json');

const TEMPLATE_DIR = path.join(__dirname, 'templates', 'default');
// Saat dijalankan dari repo NXC (node tools/create-nxc-app atau `npm link`),
// SDK hasil build lokal ada di <repo>/nxc-sdk.
const REPO_SDK = path.join(__dirname, '..', '..', 'nxc-sdk');
const CACHE_DIR = path.join(os.homedir(), '.nxc', 'sdk');
const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const IS_WINDOWS = process.platform === 'win32';

const HELP = `create-nxc-app ${pkg.version} - project baru di atas SDK NXC (Qt 6, C++)

Pemakaian:
  npm create nxc-app@latest [nama] -- [opsi]
  npx create-nxc-app [nama] [opsi]

Opsi:
  --sdk <path|url>   SDK NXC: folder nxc-sdk, file .tar.gz, atau URL .tar.gz
  --qt <prefix>      kit Qt 6 (mis. C:\\Qt\\6.8.3\\msvc2022_64); default env
                     QT_PREFIX atau kit terbaru di C:\\Qt / ~/Qt / /opt/Qt
  --repo <owner/nama>  repo GitHub sumber rilis SDK (default: package.json
                     nxc.releaseRepo)
  -h, --help         bantuan ini
  -v, --version      versi

Urutan mencari SDK: --sdk -> env NXC_SDK -> nxc-sdk/ repo NXC (kalau dijalankan
dari repo) -> unduh rilis GitHub terbaru (disimpan di ~/.nxc/sdk).`;

// ---------------------------------------------------------------------------
// Argumen & prompt
// ---------------------------------------------------------------------------
function parseArgs(argv) {
    const args = { name: null, sdk: null, qt: null, repo: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const value = () => {
            if (i + 1 >= argv.length) fail(`opsi ${a} butuh nilai`);
            return argv[++i];
        };
        if (a === '-h' || a === '--help') { console.log(HELP); process.exit(0); }
        else if (a === '-v' || a === '--version') { console.log(pkg.version); process.exit(0); }
        else if (a === '--sdk') args.sdk = value();
        else if (a === '--qt') args.qt = value();
        else if (a === '--repo') args.repo = value();
        else if (a.startsWith('-')) fail(`opsi tidak dikenal: ${a} (lihat --help)`);
        else if (!args.name) args.name = a;
        else fail(`argumen berlebih: ${a}`);
    }
    return args;
}

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
    }));
}

function fail(message) {
    console.error(`\n[error] ${message}`);
    process.exit(1);
}

function warn(message) {
    console.warn(`[peringatan] ${message}`);
}

// ---------------------------------------------------------------------------
// Qt
// ---------------------------------------------------------------------------
// Qt 6 menaruh versinya di Qt6ConfigVersionImpl.cmake (versi lama langsung
// di Qt6ConfigVersion.cmake): set(PACKAGE_VERSION "6.8.3").
function qtVersionOf(prefix) {
    for (const name of ['Qt6ConfigVersionImpl.cmake', 'Qt6ConfigVersion.cmake']) {
        try {
            const text = fs.readFileSync(path.join(prefix, 'lib', 'cmake', 'Qt6', name), 'utf8');
            const m = text.match(/set\(PACKAGE_VERSION\s+"([\d.]+)"\)/);
            if (m) return m[1];
        } catch {
            // file tidak ada -> coba nama berikutnya
        }
    }
    return null;
}

function isQtPrefix(prefix) {
    return !!prefix && fs.existsSync(path.join(prefix, 'lib', 'cmake', 'Qt6'));
}

function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d) return d;
    }
    return 0;
}

// Pola sama dengan build.bat: kit terbaru di folder instalasi Qt Online Installer.
function findQt(explicit) {
    for (const prefix of [explicit, process.env.QT_PREFIX]) {
        if (!prefix) continue;
        if (isQtPrefix(prefix)) return path.resolve(prefix);
        if (prefix === explicit) fail(`--qt "${prefix}" bukan kit Qt 6 (tidak ada lib/cmake/Qt6)`);
    }
    const kit = IS_WINDOWS ? 'msvc2022_64' : process.platform === 'darwin' ? 'macos' : 'gcc_64';
    const roots = IS_WINDOWS ? ['C:\\Qt'] : [path.join(os.homedir(), 'Qt'), '/opt/Qt'];
    for (const root of roots) {
        let versions;
        try {
            versions = fs.readdirSync(root).filter((d) => /^\d+(\.\d+)+$/.test(d));
        } catch {
            continue;
        }
        versions.sort(compareVersions).reverse();
        for (const v of versions) {
            const prefix = path.join(root, v, kit);
            if (isQtPrefix(prefix)) return prefix;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// SDK
// ---------------------------------------------------------------------------
function isSdk(dir) {
    return !!dir && fs.existsSync(path.join(dir, 'cmake', 'nxcConfig.cmake'));
}

function readSdkManifest(dir) {
    try {
        return JSON.parse(fs.readFileSync(path.join(dir, 'sdk.json'), 'utf8'));
    } catch {
        return null;
    }
}

function sdkOs() {
    if (IS_WINDOWS) return 'windows';
    if (process.platform === 'linux') return 'linux';
    return process.platform;
}

// Kontrak dengan .github/workflows/release.yml:
//   nxc-sdk-<ver>-qt<qt>-<os>.tar.gz
const ASSET_PATTERN = /^nxc-sdk-([\d.]+)-qt([\d.]+)-([a-z]+)\.tar\.gz$/;

function request(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const token = process.env.GITHUB_TOKEN;
        const opts = {
            headers: {
                'User-Agent': `create-nxc-app/${pkg.version}`,
                ...(token && url.includes('api.github.com') ? { Authorization: `Bearer ${token}` } : {}),
                ...headers,
            },
        };
        https.get(url, opts, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                resolve(request(new URL(res.headers.location, url).toString(), headers));
                return;
            }
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`HTTP ${res.statusCode} untuk ${url}`));
                return;
            }
            resolve(res);
        }).on('error', reject);
    });
}

async function fetchJson(url) {
    const res = await request(url, { Accept: 'application/vnd.github+json' });
    let body = '';
    res.setEncoding('utf8');
    for await (const chunk of res) body += chunk;
    return JSON.parse(body);
}

async function download(url, file) {
    const res = await request(url);
    await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(file);
        res.pipe(out);
        out.on('finish', resolve);
        res.on('error', reject);
        out.on('error', reject);
    });
}

// Ekstrak lewat tar bawaan OS. Di Windows pakai System32\tar.exe (bsdtar):
// GNU tar dari Git for Windows menganggap "C:\..." sebagai host remote.
function extract(archive, dest) {
    const tar = IS_WINDOWS
        ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
        : 'tar';
    const tmp = `${dest}.tmp-${process.pid}`;
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    const r = spawnSync(tar, ['-xzf', archive, '-C', tmp], { stdio: 'inherit' });
    if (r.status !== 0) {
        fs.rmSync(tmp, { recursive: true, force: true });
        fail(`gagal mengekstrak ${archive}${r.error ? ` (${r.error.message})` : ''}`);
    }
    if (!isSdk(tmp)) {
        fs.rmSync(tmp, { recursive: true, force: true });
        fail(`${archive} bukan paket SDK NXC (tidak ada cmake/nxcConfig.cmake)`);
    }
    fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(tmp, dest);
    return dest;
}

async function sdkFromArchive(source) {
    const isUrl = /^https?:\/\//.test(source);
    const file = isUrl ? new URL(source).pathname.split('/').pop() : path.basename(source);
    const base = file.replace(/\.(tar\.gz|tgz)$/, '');
    const dest = path.join(CACHE_DIR, base);
    if (isSdk(dest)) {
        console.log(`SDK dari cache: ${dest}`);
        return dest;
    }
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    let archive = source;
    if (isUrl) {
        archive = path.join(CACHE_DIR, `${base}.tar.gz`);
        console.log(`Mengunduh SDK: ${source}`);
        await download(source, archive);
    }
    console.log(`Mengekstrak SDK ke ${dest}`);
    extract(path.resolve(archive), dest);
    if (archive !== source) fs.rmSync(archive, { force: true });
    return dest;
}

function sdkAssets(release) {
    return (release.assets || [])
        .map((a) => ({ url: a.browser_download_url, m: a.name.match(ASSET_PATTERN) }))
        .filter((a) => a.m && a.m[3] === sdkOs());
}

async function sdkFromRelease(repo, qtVersion) {
    console.log(`Mencari rilis SDK terbaru di github.com/${repo} ...`);
    // Utamakan rilis stabil terbaru (/releases/latest). Endpoint itu
    // mengabaikan pre-release — kalau belum ada rilis stabil (404) atau rilis
    // stabil tidak membawa SDK untuk OS ini, pakai rilis terbaru (termasuk
    // pre-release) yang punya aset SDK.
    let release = null;
    try {
        release = await fetchJson(`https://api.github.com/repos/${repo}/releases/latest`);
    } catch (e) {
        if (!/HTTP 404/.test(e.message))
            fail(`tidak bisa membaca rilis ${repo}: ${e.message}`);
    }
    if (!release || !sdkAssets(release).length) {
        let releases;
        try {
            releases = await fetchJson(`https://api.github.com/repos/${repo}/releases?per_page=20`);
        } catch (e) {
            fail(`tidak bisa membaca rilis ${repo}: ${e.message}`);
        }
        const withSdk = (releases || []).find((r) => !r.draft && sdkAssets(r).length);
        if (!withSdk)
            fail(`belum ada rilis di ${repo} yang membawa SDK untuk ${sdkOs()}`);
        release = withSdk;
    }
    console.log(`Rilis: ${release.tag_name}${release.prerelease ? ' (pre-release)' : ''}`);
    const assets = sdkAssets(release);
    // Utamakan SDK yang dibangun dengan Qt major.minor sama dengan kit developer.
    const mm = (v) => (v || '').split('.').slice(0, 2).join('.');
    const pick = assets.find((a) => qtVersion && mm(a.m[2]) === mm(qtVersion)) || assets[0];
    return sdkFromArchive(pick.url);
}

async function resolveSdk(args, qtVersion) {
    if (args.sdk) {
        if (/^https?:\/\//.test(args.sdk) || /\.(tar\.gz|tgz)$/.test(args.sdk)) {
            return sdkFromArchive(args.sdk);
        }
        if (!isSdk(args.sdk)) fail(`--sdk "${args.sdk}" bukan folder SDK NXC (tidak ada cmake/nxcConfig.cmake)`);
        return path.resolve(args.sdk);
    }
    if (process.env.NXC_SDK) {
        if (!isSdk(process.env.NXC_SDK)) fail(`NXC_SDK="${process.env.NXC_SDK}" bukan folder SDK NXC`);
        return path.resolve(process.env.NXC_SDK);
    }
    if (isSdk(REPO_SDK)) return path.resolve(REPO_SDK);

    const repo = args.repo || (pkg.nxc && pkg.nxc.releaseRepo);
    if (repo) return sdkFromRelease(repo, qtVersion);

    fail('SDK NXC tidak ditemukan. Pilih salah satu:\n' +
         '  --sdk <folder nxc-sdk | file/URL .tar.gz>\n' +
         '  env NXC_SDK=<folder nxc-sdk>\n' +
         '  --repo <owner/nama>  (unduh dari GitHub Release)');
}

function checkSdk(sdk, qtVersion) {
    const manifest = readSdkManifest(sdk);
    const mm = (v) => (v || '').split('.').slice(0, 2).join('.');
    if (manifest && qtVersion && mm(manifest.qt) !== mm(qtVersion)) {
        warn(`SDK dibangun dengan Qt ${manifest.qt}, kit kamu Qt ${qtVersion} - ` +
             'versi minor berbeda bisa gagal link/jalan. Pakai kit yang sama atau --qt.');
    }
    if (IS_WINDOWS && !fs.existsSync(path.join(sdk, 'cmake', 'nxcTargets-debug.cmake'))) {
        warn('SDK hanya berisi Release - preset "debug" akan gagal link. ' +
             'Bangun ulang SDK dengan: set SDK=1 && build.bat');
    }
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------
function presets(prefixPath) {
    const cache = { CMAKE_PREFIX_PATH: prefixPath };
    if (IS_WINDOWS) {
        // Visual Studio = multi-konfigurasi: satu folder build, pilih config saat build.
        return {
            version: 3,
            configurePresets: [{
                name: 'default',
                displayName: 'Visual Studio 2022 x64',
                generator: 'Visual Studio 17 2022',
                architecture: 'x64',
                binaryDir: '${sourceDir}/build',
                cacheVariables: cache,
            }],
            buildPresets: [
                { name: 'debug', configurePreset: 'default', configuration: 'Debug' },
                { name: 'release', configurePreset: 'default', configuration: 'Release' },
            ],
        };
    }
    // Generator single-config (Makefiles): satu folder build per konfigurasi.
    const configs = ['Debug', 'Release'];
    return {
        version: 3,
        configurePresets: configs.map((c) => ({
            name: c.toLowerCase(),
            binaryDir: `\${sourceDir}/build/${c.toLowerCase()}`,
            cacheVariables: { ...cache, CMAKE_BUILD_TYPE: c },
        })),
        buildPresets: configs.map((c) => ({ name: c.toLowerCase(), configurePreset: c.toLowerCase() })),
    };
}

function buildSteps(name) {
    if (IS_WINDOWS) {
        return ['cmake --preset default', 'cmake --build --preset debug', `build\\Debug\\${name}.exe`];
    }
    return ['cmake --preset debug', 'cmake --build --preset debug', `./build/debug/${name}`];
}

function copyTemplate(src, dest, vars) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        // npm membuang .gitignore saat publish -> template menyimpannya sebagai _gitignore.
        const to = path.join(dest, entry.name === '_gitignore' ? '.gitignore' : entry.name);
        if (entry.isDirectory()) {
            copyTemplate(from, to, vars);
            continue;
        }
        let text = fs.readFileSync(from, 'utf8');
        for (const [key, value] of Object.entries(vars)) text = text.split(`@${key}@`).join(value);
        fs.writeFileSync(to, text);
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    let name = args.name;
    if (!name) name = await ask('Nama aplikasi: ');
    if (!NAME_PATTERN.test(name)) {
        fail(`nama "${name}" tidak valid - pakai huruf/angka/_/-, diawali huruf (jadi nama target CMake)`);
    }
    const root = path.resolve(name);
    if (fs.existsSync(root)) fail(`folder "${root}" sudah ada - pilih nama lain (tidak ditimpa)`);

    const qt = findQt(args.qt);
    const qtVersion = qt ? qtVersionOf(qt) : null;
    if (!qt) {
        warn('kit Qt 6 tidak ditemukan - CMAKE_PREFIX_PATH hanya berisi SDK. ' +
             'Isi --qt atau env QT_PREFIX, atau pastikan Qt 6 terpasang di sistem.');
    }

    const sdk = await resolveSdk(args, qtVersion);
    checkSdk(sdk, qtVersion);

    // CMake menerima '/' di semua OS.
    const prefixPath = [sdk, qt].filter(Boolean).join(';').split('\\').join('/');
    const steps = buildSteps(name);

    copyTemplate(TEMPLATE_DIR, root, { NAME: name, BUILD_STEPS: steps.join('\n') });
    fs.writeFileSync(path.join(root, 'CMakePresets.json'),
        `${JSON.stringify(presets(prefixPath), null, 2)}\n`);

    console.log(`\nProject dibuat: ${root}`);
    console.log(`  SDK : ${sdk}`);
    console.log(`  Qt  : ${qt ? `${qt}${qtVersion ? ` (${qtVersion})` : ''}` : '(tidak terdeteksi)'}`);
    console.log('\nLangkah berikutnya:');
    console.log(`  cd ${name}`);
    for (const s of steps) console.log(`  ${s}`);
}

main().catch((e) => fail(e.stack || String(e)));
