# @NAME@

Aplikasi desktop berbasis SDK NXC (Qt 6, native C++).

## Build

```
@BUILD_STEPS@
```

`nxc_deploy()` di CMakeLists.txt menyalin nxc.dll + DLL Qt ke sebelah exe
setiap selesai build (Windows), jadi exe langsung bisa dijalankan / di-debug.

Path SDK NXC dan Qt ada di `CMakePresets.json` (`CMAKE_PREFIX_PATH`) -
sunting di situ kalau lokasinya berpindah.

API: lihat `docs/API.md` dan `Developer.md` di repo NXC.
