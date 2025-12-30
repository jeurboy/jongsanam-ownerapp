# การทดสอบแอป Jong Court Owner

## ข้อมูลทดสอบ (Development)

### Mock Login Credentials
สำหรับการทดสอบในโหมด development คุณสามารถใช้:

```
Username: owner1
Password: password123
```

หรือ

```
Username: testowner
Password: test1234
```

## การเชื่อมต่อ API

### Local Development
แก้ไข `src/services/auth.service.ts`:
```typescript
const API_BASE_URL = 'http://localhost:3000';
```

### Production
```typescript
const API_BASE_URL = 'https://your-api-domain.com';
```

## API Endpoints ที่ต้องมี

### POST /api/auth/login
Request:
```json
{
  "username": "owner1",
  "password": "password123"
}
```

Response (Success - 200):
```json
{
  "user": {
    "id": "user_123",
    "username": "owner1",
    "email": "owner1@example.com",
    "role": "court_owner"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response (Error - 401):
```json
{
  "message": "Invalid credentials"
}
```

## การทดสอบ Flow

1. **เปิดแอป** → แสดงหน้า Login
2. **กรอก Username และ Password** → กด "เข้าสู่ระบบ"
3. **Login สำเร็จ** → นำไปหน้า Home Dashboard
4. **กด "ออกจากระบบ"** → กลับไปหน้า Login

## Debugging

### ดู Console Logs
```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

### ตรวจสอบ AsyncStorage
ใช้ React Native Debugger หรือ Flipper เพื่อดู:
- `auth_token`
- `user`

### Network Requests
ใช้ Flipper Network Plugin เพื่อดู API calls

## Common Issues

### 1. Login ไม่ผ่าน
- ตรวจสอบ API_BASE_URL ใน `auth.service.ts`
- ตรวจสอบว่า backend server รันอยู่
- ดู console logs สำหรับ error messages

### 2. Token ไม่ persist
- ตรวจสอบ AsyncStorage permissions
- ลองลบแอปและติดตั้งใหม่

### 3. Navigation ไม่ทำงาน
- ตรวจสอบว่า `react-native-gesture-handler` ติดตั้งถูกต้อง
- Rebuild แอป: `npm run ios` หรือ `npm run android`
