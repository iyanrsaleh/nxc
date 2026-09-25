#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <nxc/Window.h>

// Jendela utama: title bar, resize, tema, dan tombol window datang dari
// nxc::Window - isi (setContent) sepenuhnya milik aplikasi ini.
class MainWindow : public nxc::Window {
    Q_OBJECT

public:
    MainWindow();
};

#endif // MAINWINDOW_H
