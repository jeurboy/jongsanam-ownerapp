# 📱 คู่มือการ Build และ Submit iOS App ไป App Store

## 🎯 วิธีที่แนะนำ: ใช้ Xcode (ง่ายและปลอดภัยที่สุด)

### ขั้นตอนที่ 1: เตรียมโปรเจกต์

```bash
# 1. ติดตั้ง dependencies
cd ios
pod install
cd ..

# 2. Clean build folder
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/JongCourtOwnerApp-*
```

### ขั้นตอนที่ 2: เปิดโปรเจกต์ใน Xcode

```bash
open ios/JongCourtOwnerApp.xcworkspace
```

### ขั้นตอนที่ 3: Configure Signing

1. เลือก project `JongSanamOwnerApp` ในซ้ายสุด
2. เลือก target `JongSanamOwnerApp`
3. ไปที่แท็บ **Signing & Capabilities**
4. เลือก **Automatically manage signing** ✅
5. เลือก Team: **Pornprasith Mahasith (XUJH3DUPSU)**
6. ตรวจสอบ Bundle Identifier: `com.jongsanam.ownerapp`

### ขั้นตอนที่ 4: เลือก Build Configuration

1. ที่ toolbar ด้านบน เลือก target เป็น **Any iOS Device (arm64)**
2. ไปที่ **Product > Scheme > Edit Scheme...**
3. เลือก **Archive** ทางซ้าย
4. ตรวจสอบว่า Build Configuration เป็น **Release**
5. คลิก **Close**

### ขั้นตอนที่ 5: Archive แอป

1. ไปที่ **Product > Archive**
2. รอให้ build เสร็จ (อาจใช้เวลา 5-10 นาที)
3. เมื่อเสร็จจะเปิดหน้าต่าง **Organizer** อัตโนมัติ

### ขั้นตอนที่ 6: Distribute แอป

1. ในหน้าต่าง **Organizer** (หรือเปิดด้วย **Window > Organizer**)
2. เลือก archive ที่เพิ่งสร้าง
3. คลิก **Distribute App**
4. เลือก **App Store Connect**
5. คลิก **Next**
6. เลือก **Upload**
7. คลิก **Next**
8. เลือกตัวเลือกต่างๆ:
   - ✅ **Automatically manage signing**
   - ✅ **Upload your app's symbols**
   - ❌ **Include bitcode** (ไม่จำเป็นแล้ว)
9. คลิก **Next**
10. Review และคลิก **Upload**
11. รอให้อัปโหลดเสร็จ

### ขั้นตอนที่ 7: Submit ใน App Store Connect

1. เข้า [App Store Connect](https://appstoreconnect.apple.com)
2. ไปที่ **My Apps**
3. เลือกแอปของคุณ (หรือสร้างใหม่ถ้ายังไม่มี)
4. ไปที่แท็บ **TestFlight** หรือ **App Store**
5. เลือก build ที่เพิ่งอัปโหลด
6. กรอกข้อมูลที่จำเป็น:
   - App Name
   - Description
   - Screenshots
   - Keywords
   - Support URL
   - Privacy Policy URL
7. คลิก **Submit for Review**

---

## 🔧 วิธีทางเลือก: ใช้ Command Line

### สำหรับ Development Build (ทดสอบบน device)

```bash
# รันบน device ที่เชื่อมต่ออยู่
npm run ios -- --device
```

### สำหรับ Release Build (ทดสอบ)

```bash
# รันแบบ release mode
npm run ios -- --configuration Release --device
```

---

## ⚠️ ปัญหาที่พบบ่อยและวิธีแก้

### 1. "Scheme is not configured for archive action"

**วิธีแก้:**
- ใช้ Xcode แทน command line
- หรือแก้ไข scheme ใน Xcode:
  1. Product > Scheme > Edit Scheme
  2. เลือก Archive
  3. ตรวจสอบว่า Build Configuration เป็น Release

### 2. "No signing certificate found"

**วิธีแก้:**
1. เปิด Xcode > Preferences > Accounts
2. เพิ่ม Apple ID ของคุณ
3. คลิก **Manage Certificates**
4. คลิก **+** และเลือก **Apple Distribution**

### 3. "Provisioning profile not found"

**วิธีแก้:**
- เลือก **Automatically manage signing** ใน Xcode
- Xcode จะสร้าง provisioning profile ให้อัตโนมัติ

### 4. Build ช้ามาก

**วิธีแก้:**
```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Clean build folder
cd ios
xcodebuild clean -workspace JongCourtOwnerApp.xcworkspace -scheme JongSanamOwnerApp
cd ..
```

---

## 📋 Checklist ก่อน Submit

- [ ] ทดสอบแอปบน device จริง
- [ ] ตรวจสอบ version และ build number
- [ ] เตรียม screenshots (ขนาดต่างๆ)
- [ ] เตรียม app icon (1024x1024)
- [ ] เขียน description และ keywords
- [ ] ตรวจสอบ Privacy Policy URL
- [ ] ตรวจสอบ Support URL
- [ ] ทดสอบ in-app purchases (ถ้ามี)
- [ ] ทดสอบ push notifications (ถ้ามี)

---

## 🎯 ข้อมูลสำคัญ

**Team ID:** `XUJH3DUPSU`  
**Bundle ID:** `com.jongsanam.ownerapp`  
**App Name:** `Jong Court Owner`  

**URLs:**
- Privacy Policy: `https://jongsanam.online/privacy-policy`
- Terms of Service: `https://jongsanam.online/terms-of-service`
- Support: `https://jongsanam.online`

**Contact:**
- Email: `jeurboy@gmail.com`
- Phone: `081-8200-0253`

---

## 💡 Tips

1. **ใช้ TestFlight ก่อน:** ทดสอบกับ beta testers ก่อน submit production
2. **Version Numbering:** ใช้ semantic versioning (1.0.0, 1.0.1, 1.1.0)
3. **Build Number:** เพิ่มทุกครั้งที่ upload (1, 2, 3, ...)
4. **Screenshots:** ถ่ายจากหน้าจอจริง ไม่ใช้ mockup
5. **Review Time:** โดยปกติใช้เวลา 1-3 วัน

---

## 🚀 Quick Start

```bash
# วิธีที่เร็วที่สุด
open ios/JongCourtOwnerApp.xcworkspace
```

จากนั้นทำตามขั้นตอนที่ 3-7 ข้างบน
