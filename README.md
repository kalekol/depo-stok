# 📦 Mobilya Depo & Koli Stok Takip Sistemi

**Çoklu koli yapısına sahip mobilya takımları (ör. Koli 1/3, Koli 2/3, Koli 3/3) ve tekli depo ürünleri için özel olarak geliştirilmiş, kamera/barkod okuyucu destekli, takım eksiğini otomatik hesaplayan mobil ve masaüstü uyumlu stok takip uygulaması.**

🌐 **Canlı Yayın Adresi (GitHub Pages):** [https://kalekol.github.io/depo-takip/](https://kalekol.github.io/depo-takip/)  
🔥 **Canlı Veritabanı:** Firebase Firestore (`depo-stok-ae5fe`)

---

## 🚀 1. GitHub Pages ve Firebase Canlı Senkronizasyon

Uygulama **Firebase Firestore** canlı veritabanına bağlıdır. Hem telefondan hem de bilgisayardan girildiğinde aynı veriler anında senkronize olur.

- **GitHub Depo & Pages:** `https://kalekol.github.io/depo-takip/`
- **Firebase Proje Adı:** `depo-stok`
- **Firebase Proje Kimliği:** `depo-stok-ae5fe`
- **Firebase Proje Numarası:** `534517681416`

---

## 📱 2. Telefondan (Mobil) Kullanım Kılavuzu

Uygulama **PWA (Progressive Web App)** uyumludur. Telefonunuzun ana ekranına ekleyerek **App Store veya Google Play'den indirilmiş gerçek bir uygulama gibi** tam ekran kullanabilirsiniz!

### 📲 iPhone (iOS - Safari) ile Ana Ekrana Ekleme:
1. `https://kalekol.github.io/depo-takip/` adresini **Safari** tarayıcısında açın.
2. Alt menüdeki **Paylaş (Share - Kare içinden yukarı ok)** butonuna dokunun.
3. Açılan menüden **"Ana Ekrana Ekle" (Add to Home Screen)** seçeneğini seçin.
4. Ana ekranınıza şık koli ikonuyla **"Depo Stok"** uygulaması eklenecektir.

### 📲 Android (Chrome) ile Ana Ekrana Ekleme:
1. `https://kalekol.github.io/depo-takip/` adresini **Google Chrome** tarayıcısında açın.
2. Sağ üstteki **Üç Nokta (⋮)** menüsüne dokunun.
3. **"Ana Ekrana Ekle"** veya **"Uygulamayı Yükle"** seçeneğine dokunun.

### 📷 Telefondan Barkod Okuma:
- Üst menüdeki **"Hızlı Barkod / Kamera"** butonuna dokunun.
- Telefonunuzun kamerasını kolinin üzerindeki barkoda tutun.
- Barkod algılandığı anda sesli/görsel bildirimle stoktan **otomatik olarak işlem yapılacak** ve tüm cihazlarda anında güncellenecektir.

---

## 💻 3. Bilgisayardan (PC / Masaüstü) Kullanım Kılavuzu

1. **USB / Lazer Barkod Okuyucu Desteği:**
   - Bilgisayarınıza bağlı herhangi bir USB veya kablosuz el tipi barkod okuyucu kullanabilirsiniz.
   - Hızlı Tara ekranında veya arama kutusunda okuttuğunuz barkod anında işlenir.
2. **Klavye Kısayolları ve Hızlı Arama:**
   - Üstteki arama çubuğuna ürün adı, kategori veya barkod numarası yazarak anında filtreleme yapabilirsiniz.
3. **Excel / CSV Yedekleme ve Raporlama:**
   - **Excel (CSV):** Tüm stok ve koli verilerinizi Excel'de açılabilir formata aktarır.

---

## 🛋️ 4. Öne Çıkan Özellikler ve Takım Mantığı

- **Gelişmiş Görüntüleme Modları:**
  - **Ürün & Koli Detaylı:** Hem takım özetini hem de kolilerin tek tek stoklarını gösterir.
  - **Sadece Ürün Özetleri:** Kalabalığı önlemek için sadece tam takım sayısını gösterir.
  - **Koli Olarak Gör (Liste):** Depodaki tüm kolileri barkodları ve adetleriyle satır satır liste biçiminde sunar.
- **Akıllı Takım Hesaplaması:**
  - Bir mobilya takımı örneğin 3 koliden oluşuyorsa (Koli 1, Koli 2, Koli 3); uygulama **en az stokta olan koliyi** baz alarak *"Hazır Sevk Edilebilir Tam Takım"* sayısını hesaplar.
- **Silme Onayı ve Güvenlik:**
  - Ürün silme işlemleri yanlışlıkla tıklamaya karşı çift onaylı modalla korunur.

