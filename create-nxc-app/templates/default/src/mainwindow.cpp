#include "mainwindow.h"

#include "pages.h"

#include <nxc/NavigationView.h>
#include <nxc/Router.h>

#include <QApplication>

MainWindow::MainWindow(const QString& startRoute) {
    // Judul = productName di package.json (lewat nama aplikasi Qt).
    setTitle(QApplication::applicationName());

    // Sidebar navigasi + area halaman (nxc::Router di dalamnya).
    auto* nav = new nxc::NavigationView(this);
    nav->addItem(tr("Home"), QStringLiteral("/"), nxc::Glyph::Home);
    nav->addItem(tr("Produk"), QStringLiteral("/produk"), nxc::Glyph::Box); // aktif juga di /produk/42
    nav->addFooterItem(tr("Pengaturan"), QStringLiteral("/pengaturan"), nxc::Glyph::Settings);

    // Rute -> halaman (src/pages.cpp). Pola boleh berparameter: /produk/:id.
    nxc::Router* router = nav->router();
    router->addRoute(QStringLiteral("/"), [] { return new HomePage; });
    router->addRoute(QStringLiteral("/produk"), [] { return new ProductListPage; });
    router->addRoute(QStringLiteral("/produk/:id"), [](const nxc::Route& route) {
        return new ProductPage(route.param(QStringLiteral("id")));
    });
    router->addRoute(QStringLiteral("/pengaturan"), [] { return new SettingsPage; });

    setContent(nav);
    router->navigate(startRoute.isEmpty() ? QStringLiteral("/") : startRoute);
}
