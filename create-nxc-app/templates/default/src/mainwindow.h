#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <nxc/Window.h>

// Jendela utama: title bar, resize, tema, dan tombol window datang dari
// nxc::Window; isinya sidebar navigasi + halaman (nxc::NavigationView +
// nxc::Router). Halaman ada di pages.h/.cpp.
class MainWindow : public nxc::Window {
    Q_OBJECT

public:
    // startRoute: halaman awal (default "/"); dari argumen --route /produk/42.
    explicit MainWindow(const QString& startRoute = {});
};

#endif // MAINWINDOW_H
