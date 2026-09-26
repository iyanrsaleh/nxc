#include "pages.h"

#include <nxc/Settings.h>
#include <nxc/Theme.h>

#include <QApplication>
#include <QCheckBox>
#include <QLabel>
#include <QVBoxLayout>

namespace {

// Tata letak halaman standar: margin Fluent + isi dari atas.
QVBoxLayout* pageLayout(QWidget* page) {
    auto* layout = new QVBoxLayout(page);
    layout->setContentsMargins(24, 8, 24, 24);
    layout->setSpacing(12);
    layout->setAlignment(Qt::AlignTop);
    return layout;
}

QLabel* paragraph(const QString& text, QWidget* parent) {
    auto* label = new QLabel(text, parent);
    label->setWordWrap(true);
    return label;
}

} // namespace

HomePage::HomePage() {
    auto* layout = pageLayout(this);
    layout->addWidget(paragraph(tr("Selamat datang di %1!").arg(QApplication::applicationName()), this));
    layout->addWidget(paragraph(
        tr("Halaman berganti lewat nxc::Router tanpa membuka jendela baru. Klik item "
           "sidebar, atau link di bawah — tombol Back (atau Alt+←) kembali ke halaman sebelumnya."),
        this));
    // Link ke halaman lain (router dicari otomatis dari widget induk).
    layout->addWidget(new nxc::Link(tr("→ Lihat daftar produk"), QStringLiteral("/produk"), this));
    layout->addWidget(new nxc::Link(tr("→ Buka produk 42 langsung"), QStringLiteral("/produk/42"), this));
}

ProductListPage::ProductListPage() {
    setKeepAlive(true); // scroll/isian tetap saat kembali dari detail
    auto* layout = pageLayout(this);
    layout->addWidget(paragraph(tr("Pilih produk (rute /produk/:id):"), this));
    for (int id : {1, 2, 3})
        layout->addWidget(new nxc::Link(tr("Produk %1").arg(id), QStringLiteral("/produk/%1").arg(id), this));

    // Link di dalam teks biasa: <a href="/..."> + Router::connectLinks.
    auto* rich = paragraph(tr("Atau buka <a href=\"/produk/7?tab=ulasan\">ulasan produk 7</a>."), this);
    nxc::Router::connectLinks(rich);
    layout->addWidget(rich);
}

ProductPage::ProductPage(const QString& id) {
    setTitle(tr("Produk %1").arg(id)); // header NavigationView
    auto* layout = pageLayout(this);
    layout->addWidget(paragraph(tr("Detail produk dengan id = %1 (parameter rute).").arg(id), this));
    m_tab = paragraph(QString(), this);
    layout->addWidget(m_tab);
    layout->addWidget(new nxc::Link(tr("Tab ulasan (?tab=ulasan)"),
                                    QStringLiteral("/produk/%1?tab=ulasan").arg(id), this));
    layout->addWidget(new nxc::Link(tr("← Kembali ke daftar"), QStringLiteral("/produk"), this));
}

void ProductPage::onEnter(const nxc::Route& route) {
    const QString tab = route.query(QStringLiteral("tab"));
    m_tab->setText(tab.isEmpty() ? tr("Tab: ringkasan") : tr("Tab: %1").arg(tab));
}

SettingsPage::SettingsPage() {
    auto* layout = pageLayout(this);
    auto* dark = new QCheckBox(tr("Tema gelap"), this);
    dark->setChecked(nxc::Theme::isDark());
    connect(dark, &QCheckBox::toggled, this, [](bool on) {
        nxc::Theme::apply(on);
        nxc::Settings::setDarkTheme(on);
    });
    layout->addWidget(dark);
}
