#include "mainwindow.h"

#include <QLabel>
#include <QVBoxLayout>

MainWindow::MainWindow() {
    setTitle(QStringLiteral("@NAME@"));

    auto* body = new QWidget(this);
    auto* layout = new QVBoxLayout(body);
    layout->setContentsMargins(16, 16, 16, 16);

    auto* heading = new QLabel(tr("Halo dari @NAME@!"), body);
    heading->setObjectName(QStringLiteral("Heading"));
    layout->addWidget(heading);
    layout->addStretch(1);

    setContent(body);
}
