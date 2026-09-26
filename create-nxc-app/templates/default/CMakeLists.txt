cmake_minimum_required(VERSION 3.21)

project(@NAME@ LANGUAGES CXX)

# Resource Windows (.rc): versi & ikon file exe dari package.json.
if(WIN32)
    enable_language(RC)
endif()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

# Path SDK NXC + Qt diisi CMakePresets.json (CMAKE_PREFIX_PATH).
find_package(nxc CONFIG REQUIRED)
find_package(Qt6 REQUIRED COMPONENTS Widgets)

qt_standard_project_setup()

qt_add_executable(@NAME@
    src/main.cpp
    src/mainwindow.h
    src/mainwindow.cpp
    src/pages.h
    src/pages.cpp
)

target_link_libraries(@NAME@ PRIVATE nxc::nxc Qt6::Widgets)

set_target_properties(@NAME@ PROPERTIES
    WIN32_EXECUTABLE TRUE
    MACOSX_BUNDLE FALSE
)

if(MSVC)
    target_compile_options(@NAME@ PRIVATE /utf-8 /W4 /permissive-)
endif()

# Versi, nama produk, deskripsi, author, dan ikon dari package.json
# (lihat cmake/NxcApp.cmake) — ubah di package.json, bukan di sini.
include(cmake/NxcApp.cmake)
nxc_app_from_package(@NAME@)

# Dari SDK: salin nxc.dll + windeployqt setelah build -> exe langsung jalan.
nxc_deploy(@NAME@)
