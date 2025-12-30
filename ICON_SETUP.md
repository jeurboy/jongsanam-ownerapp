# App Icon Setup Guide

## 🎨 สร้าง App Icon สำหรับ JongSanam

### วิธีที่ 1: ใช้ Icon Generator (แนะนำ)

1. เปิดไฟล์ `icon-generator.html` ในเบราว์เซอร์
2. คลิก "Download Icon (1024x1024)" เพื่อดาวน์โหลด icon
3. ใช้เครื่องมือออนไลน์สร้าง icon ทุกขนาด:
   - **iOS & Android**: https://www.appicon.co/
   - **Alternative**: https://easyappicon.com/

### วิธีที่ 2: ใช้ React Native Asset

```bash
# ติดตั้ง react-native-asset
npm install -g react-native-asset

# วาง icon ที่ดาวน์โหลดไว้ที่
# assets/icon.png (1024x1024)

# รันคำสั่ง
npx react-native-asset
```

### วิธีที่ 3: Manual Setup

#### iOS
1. เปิด Xcode
2. ไปที่ `ios/JongCourtOwnerApp/Images.xcassets/AppIcon.appiconset`
3. ลาก icon ทุกขนาดที่ต้องการ:
   - 20x20 (@2x, @3x)
   - 29x29 (@2x, @3x)
   - 40x40 (@2x, @3x)
   - 60x60 (@2x, @3x)
   - 76x76 (@1x, @2x)
   - 83.5x83.5 (@2x)
   - 1024x1024 (@1x)

#### Android
1. สร้าง icon หลายขนาด:
   - mipmap-mdpi: 48x48
   - mipmap-hdpi: 72x72
   - mipmap-xhdpi: 96x96
   - mipmap-xxhdpi: 144x144
   - mipmap-xxxhdpi: 192x192

2. วางไฟล์ใน:
   ```
   android/app/src/main/res/
   ├── mipmap-mdpi/ic_launcher.png
   ├── mipmap-hdpi/ic_launcher.png
   ├── mipmap-xhdpi/ic_launcher.png
   ├── mipmap-xxhdpi/ic_launcher.png
   └── mipmap-xxxhdpi/ic_launcher.png
   ```

### 🎯 Icon Design Specs

**Current Design:**
- Background: Blue gradient (#1e40af → #3b82f6)
- Text: "JS" in white, bold sans-serif
- Style: Modern, minimalist, professional
- Corner Radius: 22.5% (iOS standard)

**Customization:**
แก้ไขไฟล์ `icon-generator.html` เพื่อปรับแต่ง:
- สี gradient (line 62-64)
- ขนาดตัวอักษร (line 78)
- เอฟเฟกต์เงา (line 81-84)

### 🔧 Quick Commands

```bash
# Clean and rebuild iOS
cd ios && pod install && cd ..
npm run ios

# Clean and rebuild Android
cd android && ./gradlew clean && cd ..
npm run android
```

### 📱 Testing

หลังจากเพิ่ม icon แล้ว:
1. ลบแอปออกจาก simulator/device
2. Build ใหม่
3. ตรวจสอบว่า icon แสดงผลถูกต้องบน home screen

### 🌐 Online Tools

- **AppIcon.co**: https://www.appicon.co/ (รองรับทั้ง iOS และ Android)
- **MakeAppIcon**: https://makeappicon.com/
- **App Icon Generator**: https://appicon.co/
- **Icon Kitchen**: https://icon.kitchen/

---

**Note:** Icon ที่สร้างจาก `icon-generator.html` มีขนาด 1024x1024px ซึ่งเป็นขนาดมาตรฐานสำหรับ App Store และ Google Play
