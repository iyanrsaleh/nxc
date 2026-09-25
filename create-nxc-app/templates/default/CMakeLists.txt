cmake_minimum_required(VERSION 3.21)

project(@NAME@ VERSION 0.1.0 LANGUAGES CXX)

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
)

target_link_libraries(@NAME@ PRIVATE nxc::nxc Qt6::Widgets)

set_target_properties(@NAME@ PROPERTIES
    WIN32_EXECUTABLE TRUE
    MACOSX_BUNDLE FALSE
)

if(MSVC)
    target_compile_options(@NAME@ PRIVATE /utf-8 /W4 /permissive-)
endif()

# Dari SDK: salin nxc.dll + windeployqt setelah build -> exe langsung jalan.
nxc_deploy(@NAME@)
