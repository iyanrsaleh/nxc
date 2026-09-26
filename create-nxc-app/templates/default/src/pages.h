#ifndef PAGES_H
#define PAGES_H

#include <nxc/Router.h>

// Halaman aplikasi. Tambah halaman baru: buat kelas di sini, lalu daftarkan
// rutenya di MainWindow (nav->router()->addRoute(...)) dan item sidebar-nya.

class HomePage : public nxc::Page {
    Q_OBJECT

public:
    HomePage();
};

class ProductListPage : public nxc::Page {
    Q_OBJECT

public:
    ProductListPage();
};

// /produk/:id — contoh parameter rute + query (?tab=...).
class ProductPage : public nxc::Page {
    Q_OBJECT

public:
    explicit ProductPage(const QString& id);
    void onEnter(const nxc::Route& route) override;

private:
    class QLabel* m_tab = nullptr;
};

class SettingsPage : public nxc::Page {
    Q_OBJECT

public:
    SettingsPage();
};

#endif // PAGES_H
