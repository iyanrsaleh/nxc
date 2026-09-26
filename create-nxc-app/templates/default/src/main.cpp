#include <nxc/Application.h>

#include <QApplication>
#include <QIcon>

#include "mainwindow.h"

// NXC_APP_NAME / NXC_APP_VERSION / NXC_APP_HAS_ICON diisi dari package.json
// (productName, version, nxc.icon) oleh cmake/NxcApp.cmake.
#ifndef NXC_APP_NAME
#define NXC_APP_NAME "@NAME@"
#endif
#ifndef NXC_APP_VERSION
#define NXC_APP_VERSION "0.1.0"
#endif

int main(int argc, char* argv[]) {
    nxc::Application app(argc, argv);
    app.setApplicationName(QStringLiteral(NXC_APP_NAME));
    app.setApplicationVersion(QStringLiteral(NXC_APP_VERSION));
    app.setOrganizationName(QStringLiteral(NXC_APP_NAME));
#ifdef NXC_APP_HAS_ICON
    // Ikon window, title bar, dan tray (nxc.icon di package.json).
    QApplication::setWindowIcon(QIcon(QStringLiteral(":/app/icon")));
#endif
    app.setWindowFactory([] { return new MainWindow; });
    return app.exec();
}
