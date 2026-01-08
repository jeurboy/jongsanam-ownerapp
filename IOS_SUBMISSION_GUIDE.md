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
open ios/JongSanamOwnerApp.xcworkspace
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
4. เลือก **App Store Connect** (สำหรับส่งขึ้น Store) หรือ **TestFlight** (สำหรับทดสอบ)
5. คลิก **Next** ไปเรื่อยๆ
6. เลือก **Upload**
7. รอให้กระบวนการเสร็จสิ้น

### ขั้นตอนที่ 7: Submit ใน App Store Connect

1. เข้า [App Store Connect](https://appstoreconnect.apple.com)
2. ไปที่ **My Apps** เลือกแอป **Jong Court Owner**
3. ไปที่แท็บ **TestFlight** เพื่อดู build ที่เพิ่งอัปโหลด
4. เมื่อพร้อมขายจริง ให้ไปที่แท็บ **App Store** และเลือก Build นั้นเพื่อ Submit for Review

---

## 🔧 วิธีทางเลือก: ใช้ Command Line

### สำหรับ Release Build (ทดสอบ)

```bash
# รันแบบ release mode ลงเครื่อง
npm run ios -- --configuration Release --device
```

---

## ⚠️ ปัญหาที่พบบ่อยและวิธีแก้

### 4. Build ช้ามาก

**วิธีแก้:**
```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Clean build folder
cd ios
xcodebuild clean -workspace JongSanamOwnerApp.xcworkspace -scheme JongSanamOwnerApp
cd ..
```

---

## 🎯 ข้อมูลสำคัญ

**Team ID:** `XUJH3DUPSU`
**Bundle ID:** `com.jongsanam.ownerapp`
**App Name:** `Jong Court Owner`

**URLs:**
- Privacy Policy: `https://jongsanam.online/privacy-policy`
- Support: `https://jongsanam.online`

**Contact:**
- Email: `jeurboy@gmail.com`


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
