# 📦 Mobilya Depo & Koli Stok Takip Sistemi

**Çoklu koli yapısına sahip mobilya takımları (ör. Koli 1/3, Koli 2/3, Koli 3/3) ve tekli depo ürünleri için özel olarak geliştirilmiş, kamera/barkod okuyucu destekli, takım eksiğini otomatik hesaplayan mobil ve masaüstü uyumlu stok takip uygulaması.**

---

## 🚀 1. GitHub'a Yükleme ve Ücretsiz Yayınlama (GitHub Pages / Vercel / Netlify)

Bu uygulamayı GitHub üzerinden **hem telefon hem de bilgisayar** tarayıcılarından açılacak şekilde saniyeler içinde yayınlayabilirsiniz.

### A. GitHub Pages ile Ücretsiz Yayınlama (En Kolay Yöntem)
1. GitHub hesabınızda **Yeni Bir Repository (Depo)** oluşturun (ör: `mobilya-stok-takip`).
2. Kodları GitHub deponuza yükleyin (Push edin).
3. Deponuzun **Settings > Pages** sekmesine gidin:
   - **Source:** `GitHub Actions` seçin.
   - Ya da projenizde Terminal'de `npm run build` komutunu çalıştırıp `dist/` klasörünü herhangi bir statik sunucuya yükleyebilirsiniz.
4. (Alternatif - Vercel veya Netlify):
   - [Vercel.com](https://vercel.com) veya [Netlify.com](https://netlify.com) üzerinden GitHub deponuzu bağlayın.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - Projeniz anında `https://sizin-uygulamaniz.vercel.app` gibi bir link ile canlıya alınır!

---

## 📱 2. Telefondan (Mobil) Kullanım Kılavuzu

Uygulama **PWA (Progressive Web App)** uyumludur. Telefonunuzun ana ekranına ekleyerek **App Store veya Google Play'den indirilmiş gerçek bir uygulama gibi** tam ekran kullanabilirsiniz!

### 📲 iPhone (iOS - Safari) ile Ana Ekrana Ekleme:
1. Uygulama linkini **Safari** tarayıcısında açın.
2. Alt menüdeki **Paylaş (Share - Kare içinden yukarı ok)** butonuna dokunun.
3. Açılan menüden **"Ana Ekrana Ekle" (Add to Home Screen)** seçeneğini seçin.
4. Ana ekranınıza şık koli ikonuyla **"Depo Stok"** uygulaması eklenecektir.

### 📲 Android (Chrome) ile Ana Ekrana Ekleme:
1. Uygulama linkini **Google Chrome** tarayıcısında açın.
2. Sağ üstteki **Üç Nokta (⋮)** menüsüne dokunun.
3. **"Ana Ekrana Ekle"** veya **"Uygulamayı Yükle"** seçeneğine dokunun.

### 📷 Telefondan Barkod Okuma:
- Üst menüdeki **"Hızlı Tara & Düş"** butonuna dokunun.
- Telefonunuzun kamerasını kolinin üzerindeki barkoda tutun.
- Barkod algılandığı anda sesli/görsel bildirimle stoktan **otomatik olarak 1 adet düşülecek** ve takım durumu güncellenecektir.

---

## 💻 3. Bilgisayardan (PC / Masaüstü) Kullanım Kılavuzu

1. **USB / Lazer Barkod Okuyucu Desteği:**
   - Bilgisayarınıza bağlı herhangi bir USB veya kablosuz el tipi barkod okuyucu kullanabilirsiniz.
   - Arama kutusuna veya Hızlı Tara ekranına tıkladığınızda okuttuğunuz barkod anında işlenir.
2. **Klavye Kısayolları ve Hızlı Arama:**
   - Üstteki arama çubuğuna ürün adı, kategori veya barkod numarası yazarak anında filtreleme yapabilirsiniz.
3. **Excel / CSV Yedekleme ve Geri Yükleme:**
   - **CSV İndir:** Tüm stok ve koli verilerinizi Excel'de açılabilir formata aktarır.
   - **CSV Yükle:** Başka bir bilgisayar veya telefondan aldığınız yedeği anında geri yüklemenizi sağlar.

---

## 🛋️ 4. Öne Çıkan Özellikler ve Takım Mantığı

- **Gelişmiş Görüntüleme Modları:**
  - **Ürün & Koli Detaylı:** Hem takım özetini hem de kolilerin tek tek stoklarını gösterir.
  - **Sadece Ürün Özetleri:** Kalabalığı önlemek için sadece tam takım sayısını gösterir.
  - **Koli Olarak Gör (Liste):** Depodaki tüm kolileri barkodları ve adetleriyle satır satır liste biçiminde sunar.
- **Akıllı Takım Hesaplaması:**
  - Bir mobilya takımı örneğin 3 koliden oluşuyorsa (Koli 1, Koli 2, Koli 3); uygulama **en az stokta olan koliyi** baz alarak *"Hazır Sevk Edilebilir Tam Takım"* sayısını hesaplar.
- **Eksik Koliler ve Tamamlama Raporu:**
  - Sayfanın en altındaki özel panelde, takımların sevk edilmesini engelleyen **yarım kalmış/eksik koliler** hedef sayısıyla birlikte listelenir. Tek tıkla `+1` eklenerek eksikler tamamlanabilir.
- **Silme Onayı ve Güvenlik:**
  - Ürün silme işlemleri yanlışlıkla tıklamaya karşı çift onaylı modalla korunur.
