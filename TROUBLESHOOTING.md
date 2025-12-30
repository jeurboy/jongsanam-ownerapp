# แก้ไข RNGestureHandlerModule Error

## Error Message
```
[runtime not ready]: Invariant Violation: TurboModuleRegistry.getEnforcing(...): 
'RNGestureHandlerModule' could not be found.
```

## สาเหตุ
`react-native-gesture-handler` ยังไม่ได้ link กับ native code ให้ถูกต้อง

## วิธีแก้ไข

### วิธีที่ 1: Clean และ Rebuild (แนะนำ)

```bash
# 1. ลบ build cache
cd ios
rm -rf build
rm -rf Pods
rm -rf Podfile.lock

# 2. ติดตั้ง pods ใหม่
pod install

# 3. กลับไปที่ root
cd ..

# 4. ลบ Metro cache
rm -rf /tmp/metro-*
watchman watch-del-all

# 5. รันใหม่
npm start -- --reset-cache

# ใน terminal อื่น
npm run ios
```

### วิธีที่ 2: ตรวจสอบ Xcode Project Settings

1. เปิด `ios/JongCourtOwnerApp.xcworkspace` ใน Xcode
2. เลือก project "JongCourtOwnerApp" ใน navigator
3. ไปที่ "Build Settings"
4. ค้นหา "Objective-C Bridging Header"
5. ตั้งค่าเป็น: `JongCourtOwnerApp/JongCourtOwnerApp-Bridging-Header.h`
6. Clean Build Folder (Cmd + Shift + K)
7. Build (Cmd + B)

### วิธีที่ 3: ตรวจสอบ index.js

ตรวจสอบว่ามีบรรทัดนี้อยู่บรรทัดแรกของ `index.js`:

```javascript
import 'react-native-gesture-handler';
```

### วิธีที่ 4: ตรวจสอบ Podfile

ตรวจสอบว่า Podfile มี RNGestureHandler:

```ruby
# ใน ios/Podfile
use_react_native!(
  :path => config[:reactNativePath],
  :app_path => "#{Pod::Config.instance.installation_root}/.."
)
```

## การทดสอบว่าแก้ไขสำเร็จ

หลังจากทำตามขั้นตอนแล้ว:

1. ปิดแอปใน simulator ให้หมด
2. รัน `npm run ios` ใหม่
3. ถ้าไม่มี error แดงๆ แสดงว่าแก้ไขสำเร็จ

## หาก Error ยังคงอยู่

### ลอง Rebuild ทั้งหมด

```bash
# ลบทุกอย่าง
rm -rf node_modules
rm -rf ios/Pods
rm -rf ios/build
rm package-lock.json

# ติดตั้งใหม่
npm install
cd ios && pod install && cd ..

# รันใหม่
npm run ios
```

### ตรวจสอบ React Native Version

```bash
npx react-native doctor
```

### ดู Logs

```bash
# ดู iOS logs
npx react-native log-ios

# หรือใน Xcode
# View > Debug Area > Activate Console
```

## Common Issues

### 1. Pods ไม่ติดตั้ง
```bash
cd ios
pod deintegrate
pod install
```

### 2. Cache ไม่ clear
```bash
watchman watch-del-all
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
```

### 3. Xcode Build Settings ผิด
- ตรวจสอบ Deployment Target (ควรเป็น iOS 15.1+)
- ตรวจสอบ Swift Version (ควรเป็น 5.x)

## Quick Fix Script

สร้างไฟล์ `fix-gesture-handler.sh`:

```bash
#!/bin/bash

echo "🧹 Cleaning..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock
rm -rf /tmp/metro-*

echo "📦 Installing pods..."
cd ios && pod install && cd ..

echo "🔄 Resetting Metro cache..."
watchman watch-del-all

echo "✅ Done! Now run: npm run ios"
```

รัน:
```bash
chmod +x fix-gesture-handler.sh
./fix-gesture-handler.sh
```

## ถ้ายังไม่ได้ผล

ติดต่อทีม หรือ:
1. ลองรันบน Android ดูว่าทำงานไหม
2. ตรวจสอบ React Native version compatibility
3. ดู GitHub Issues ของ react-native-gesture-handler
