#include <nxc/Application.h>

#include "mainwindow.h"

int main(int argc, char* argv[]) {
    nxc::Application app(argc, argv);
    app.setApplicationName(QStringLiteral("@NAME@"));
    app.setOrganizationName(QStringLiteral("@NAME@"));
    app.setWindowFactory([] { return new MainWindow; });
    return app.exec();
}
