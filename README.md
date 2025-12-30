# Jong Court Owner App

แอปพลิเคชันสำหรับเจ้าของสนามกีฬา รองรับ iOS และ Android พร้อม Tablet Mode

## Features

- ✅ หน้าเข้าสู่ระบบ (Login) พร้อม Authentication
- ✅ หน้า Home Dashboard
- ✅ รองรับ Tablet Mode (iPad)
- ✅ Responsive Design
- ✅ Thai Language Support
- ✅ Token-based Authentication

## Tech Stack

- React Native 0.83.1
- React Navigation
- TypeScript
- AsyncStorage (Token Management)

## Installation

```bash
# Install dependencies
npm install

# Install iOS pods
cd ios && pod install && cd ..
```

## Running the App

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

## Configuration

### API Endpoint
แก้ไข API URL ใน `src/services/auth.service.ts`:
```typescript
const API_BASE_URL = 'http://localhost:3000'; // เปลี่ยนเป็น API ของคุณ
```

### Authentication Flow

1. **Login Screen** - ผู้ใช้กรอก username และ password
2. **API Call** - เรียก `/api/auth/login` endpoint
3. **Token Storage** - เก็บ token และ user data ใน AsyncStorage
4. **Navigate to Home** - นำไปหน้า Home เมื่อ login สำเร็จ

### API Response Format

Login endpoint ควร return:
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "role": "court_owner"
  },
  "token": "string"
}
```

## Project Structure

```
src/
├── components/       # Reusable components
├── context/         # React Context (AuthContext)
├── navigation/      # Navigation setup
├── screens/         # Screen components
│   ├── LoginScreen.tsx
│   └── HomeScreen.tsx
├── services/        # API services
│   └── auth.service.ts
├── theme/          # Design tokens
│   └── tokens.ts
├── types/          # TypeScript types
│   └── auth.ts
└── utils/          # Utility functions
    └── responsive.ts
```

## Design System

### Colors
- Primary: `#2563EB` (Blue-600)
- Neutral: Slate color palette
- Error: `#EF4444`
- Success: `#10B981`

### Spacing
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

## Tablet Support

แอปจะตรวจจับขนาดหน้าจออัตโนมัติ:
- Tablet breakpoint: 768px
- รองรับทุก orientation (Portrait, Landscape)
- Layout ปรับตามขนาดหน้าจอ

## Development

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Lint
npm run lint

# Test
npm test
```

## Troubleshooting

### iOS Build Issues
หาก build ไม่ผ่าน ลองทำตามนี้:
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Android Build Issues
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## License

Private - Jong Court Project
