# Identitas aplikasi dari package.json (satu sumber, seperti electron-builder).
#
#   nxc_app_from_package(<target>)
#
# Dibaca dari package.json di root project:
#   version       -> versi exe (klik kanan > Properties > Details) + NXC_APP_VERSION
#   productName   -> nama produk exe + NXC_APP_NAME (default: nama target)
#   description   -> FileDescription exe
#   author        -> CompanyName/Copyright exe (string atau { "name": ... })
#   nxc.icon      -> ikon .exe (Explorer/taskbar) + ikon window ":/app/icon"
#                    (.png diubah otomatis ke .ico; .ico dipakai apa adanya)
#
# package.json berubah -> CMake configure ulang sendiri saat build berikutnya.
# Dipakai juga oleh `cmake` langsung (tanpa npm).

function(_nxc_json_get out json)
    string(JSON value ERROR_VARIABLE error GET "${json}" ${ARGN})
    if(error)
        set(value "")
    endif()
    set(${out} "${value}" PARENT_SCOPE)
endfunction()

# Teks untuk string literal C/RC: escape \ dan ".
function(_nxc_escape out text)
    string(REPLACE "\\" "\\\\" text "${text}")
    string(REPLACE "\"" "\\\"" text "${text}")
    set(${out} "${text}" PARENT_SCOPE)
endfunction()

function(nxc_app_from_package target)
    set(pkg "${CMAKE_CURRENT_SOURCE_DIR}/package.json")
    if(NOT EXISTS "${pkg}")
        message(WARNING "nxc_app_from_package: package.json tidak ada - identitas default dipakai")
        return()
    endif()
    set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS "${pkg}")
    file(READ "${pkg}" json)

    _nxc_json_get(version "${json}" version)
    _nxc_json_get(product "${json}" productName)
    _nxc_json_get(description "${json}" description)
    _nxc_json_get(author "${json}" author name)
    if(author STREQUAL "")
        _nxc_json_get(author "${json}" author)
    endif()
    _nxc_json_get(icon "${json}" nxc icon)
    if(version STREQUAL "")
        set(version "0.1.0")
    endif()
    if(product STREQUAL "")
        set(product "${target}")
    endif()
    if(description STREQUAL "")
        set(description "${product}")
    endif()

    # "1.2.3-beta" -> 1,2,3,0 untuk VERSIONINFO (hanya angka).
    string(REGEX MATCH "^([0-9]+)(\\.([0-9]+))?(\\.([0-9]+))?" _ "${version}")
    set(v1 "${CMAKE_MATCH_1}")
    set(v2 "${CMAKE_MATCH_3}")
    set(v3 "${CMAKE_MATCH_5}")
    foreach(v v1 v2 v3)
        if("${${v}}" STREQUAL "")
            set(${v} 0)
        endif()
    endforeach()

    _nxc_escape(e_version "${version}")
    _nxc_escape(e_product "${product}")
    _nxc_escape(e_description "${description}")
    _nxc_escape(e_author "${author}")
    target_compile_definitions(${target} PRIVATE
        "NXC_APP_VERSION=\"${e_version}\""
        "NXC_APP_NAME=\"${e_product}\"")

    # Ikon: resource Qt (window/title bar/tray) + .ico untuk file exe.
    set(ico "")
    if(NOT icon STREQUAL "")
        get_filename_component(icon_path "${icon}" ABSOLUTE BASE_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
        if(NOT EXISTS "${icon_path}")
            message(WARNING "nxc_app_from_package: nxc.icon '${icon}' tidak ditemukan")
        else()
            set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS "${icon_path}")
            get_filename_component(ext "${icon_path}" LAST_EXT)
            string(TOLOWER "${ext}" ext)
            # ":/app/icon" apa pun nama & format file aslinya.
            set_source_files_properties("${icon_path}" PROPERTIES QT_RESOURCE_ALIAS "icon")
            qt_add_resources(${target} "nxc_app_icon"
                PREFIX "/app"
                FILES "${icon_path}")
            target_compile_definitions(${target} PRIVATE NXC_APP_HAS_ICON=1)
            if(ext STREQUAL ".ico")
                set(ico "${icon_path}")
            elseif(WIN32 AND ext STREQUAL ".png")
                # ICO berisi PNG apa adanya (didukung Windows Vista+): header 6
                # byte + satu entri 16 byte + data PNG. Tanpa alat konversi.
                set(ico "${CMAKE_CURRENT_BINARY_DIR}/nxc_app_icon.ico")
                file(TO_NATIVE_PATH "${icon_path}" n_png)
                file(TO_NATIVE_PATH "${ico}" n_ico)
                execute_process(
                    COMMAND powershell -NoProfile -NonInteractive -Command
                        "$p=[IO.File]::ReadAllBytes('${n_png}');$w=[BitConverter]::ToUInt32([byte[]]($p[19],$p[18],$p[17],$p[16]),0);$h=[BitConverter]::ToUInt32([byte[]]($p[23],$p[22],$p[21],$p[20]),0);$ms=New-Object IO.MemoryStream;$b=New-Object IO.BinaryWriter($ms);$b.Write([UInt16]0);$b.Write([UInt16]1);$b.Write([UInt16]1);$b.Write([byte]($(if($w -ge 256){0}else{$w})));$b.Write([byte]($(if($h -ge 256){0}else{$h})));$b.Write([byte]0);$b.Write([byte]0);$b.Write([UInt16]1);$b.Write([UInt16]32);$b.Write([UInt32]$p.Length);$b.Write([UInt32]22);$b.Write($p);$b.Flush();[IO.File]::WriteAllBytes('${n_ico}',$ms.ToArray())"
                    RESULT_VARIABLE rc)
                if(NOT rc EQUAL 0 OR NOT EXISTS "${ico}")
                    message(WARNING "nxc_app_from_package: gagal membuat .ico dari ${icon}")
                    set(ico "")
                endif()
            endif()
        endif()
    endif()

    # Windows: VERSIONINFO + ikon file exe lewat resource .rc.
    if(WIN32)
        set(rc_icon "")
        if(ico)
            file(TO_CMAKE_PATH "${ico}" ico_fwd)
            set(rc_icon "IDI_APP_ICON ICON \"${ico_fwd}\"\n")
        endif()
        string(TIMESTAMP year "%Y")
        set(copyright "")
        if(NOT author STREQUAL "")
            set(copyright "Copyright (C) ${year} ${e_author}")
        endif()
        file(CONFIGURE OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/nxc_app.rc" CONTENT
"#include <winver.h>
${rc_icon}
VS_VERSION_INFO VERSIONINFO
FILEVERSION ${v1},${v2},${v3},0
PRODUCTVERSION ${v1},${v2},${v3},0
FILEFLAGSMASK 0x3fL
FILEFLAGS 0x0L
FILEOS VOS_NT_WINDOWS32
FILETYPE VFT_APP
FILESUBTYPE 0x0L
BEGIN
    BLOCK \"StringFileInfo\"
    BEGIN
        BLOCK \"040904b0\"
        BEGIN
            VALUE \"CompanyName\", \"${e_author}\"
            VALUE \"FileDescription\", \"${e_description}\"
            VALUE \"FileVersion\", \"${e_version}\"
            VALUE \"InternalName\", \"${target}\"
            VALUE \"LegalCopyright\", \"${copyright}\"
            VALUE \"OriginalFilename\", \"${target}.exe\"
            VALUE \"ProductName\", \"${e_product}\"
            VALUE \"ProductVersion\", \"${e_version}\"
        END
    END
    BLOCK \"VarFileInfo\"
    BEGIN
        VALUE \"Translation\", 0x409, 1200
    END
END
" @ONLY)
        target_sources(${target} PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/nxc_app.rc")
    endif()
endfunction()
