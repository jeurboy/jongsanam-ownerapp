# Environment Configuration Guide

## การตั้งค่า API URL

แอปใช้ environment configuration เพื่อเชื่อมต่อกับ Next.js API

### 1. สร้างไฟล์ .env

```bash
cp .env.example .env
```

### 2. แก้ไข API URL ตามสภาพแวดล้อม

#### Development (Local)

**iOS Simulator:**
```env
API_URL=http://localhost:3000
```

**Android Emulator:**
```env
API_URL=http://10.0.2.2:3000
```

**Physical Device (ต้องใช้ IP ของเครื่อง Mac/PC):**
```env
API_URL=http://192.168.1.100:3000
```

หา IP ของเครื่อง:
```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

#### Production
```env
API_URL=https://api.jongsanam.com
```

## การใช้งาน Environment Config

### ใน Code

```typescript
import env from '../config/env';

// ใช้ API URL
const response = await fetch(`${env.apiUrl}/api/auth/login`, {
  method: 'POST',
  // ...
});
```

### Platform-Specific URLs

ไฟล์ `src/config/env.ts` จะเลือก URL อัตโนมัติตาม platform:

```typescript
const ENV = {
  dev: {
    apiUrl: Platform.select({
      ios: 'http://localhost:3000',      // iOS Simulator
      android: 'http://10.0.2.2:3000',   // Android Emulator
      default: 'http://localhost:3000',
    }),
  },
  // ...
};
```

## Next.js API Endpoints

แอปจะเรียก API endpoints ต่อไปนี้:

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/logout` - ออกจากระบบ (optional)
- `GET /api/auth/me` - ดึงข้อมูลผู้ใช้ปัจจุบัน (optional)

### Request Format

**Login:**
```json
POST /api/auth/login
Content-Type: application/json

{
  "username": "owner1",
  "password": "password123"
}
```

**Response:**
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

## CORS Configuration

ตรวจสอบว่า Next.js API อนุญาต CORS สำหรับ mobile app:

```typescript
// next.config.js หรือ API route
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## Troubleshooting

### 1. Cannot connect to API

**iOS Simulator:**
- ใช้ `http://localhost:3000`
- ตรวจสอบว่า Next.js server รันอยู่

**Android Emulator:**
- ใช้ `http://10.0.2.2:3000` (10.0.2.2 คือ localhost ของ host machine)
- ห้ามใช้ `localhost` หรือ `127.0.0.1`

**Physical Device:**
- ต้องใช้ IP address ของเครื่อง (เช่น `http://192.168.1.100:3000`)
- เครื่องและ device ต้องอยู่ใน network เดียวกัน
- ตรวจสอบ firewall settings

### 2. Network Request Failed

```bash
# ตรวจสอบว่า Next.js server รันอยู่
cd jong-court-web
yarn dev

# ควรเห็น
# ▲ Next.js 14.x.x
# - Local:        http://localhost:3000
```

### 3. CORS Error

เพิ่ม CORS middleware ใน Next.js API routes:

```typescript
// pages/api/auth/login.ts
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Your login logic...
}
```

## Environment Switching

### Development Mode
```typescript
// src/config/env.ts
if (__DEV__) {
  return ENV.dev;  // ใช้ localhost
}
```

### Production Build
```bash
# iOS
npm run ios --configuration Release

# Android
cd android && ./gradlew assembleRelease
```

Production build จะใช้ `ENV.prod` configuration อัตโนมัติ

## Best Practices

1. **ห้าม commit `.env`** - มีใน `.gitignore` แล้ว
2. **ใช้ `.env.example`** - เป็น template สำหรับทีม
3. **แยก environment** - dev, staging, production
4. **ใช้ HTTPS** - ใน production เท่านั้น
5. **เก็บ secrets** - ใช้ secure storage สำหรับ sensitive data
