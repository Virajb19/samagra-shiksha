# Secure Delivery Mobile App

Government-grade secure mobile application for delivery personnel tracking sealed question paper cartons.

## Tech Stack

- React Native (Expo)
- Expo Router (file-based routing)
- expo-secure-store (AES-256 encrypted storage)
- expo-camera (camera-only photo capture)
- expo-location (GPS coordinates)
- Axios (API client)
- TypeScript

## Security Features

- **Device Binding**: Unique device ID bound on first login
- **Secure Storage**: All tokens stored with AES-256 encryption
- **Role Enforcement**: Only DELIVERY role users can access
- **Immutable Events**: Backend enforces event immutability
- **Server-side Timestamps**: Prevents time manipulation

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Project Structure

```
mobile-app/
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Entry redirect
│   ├── login.tsx           # Login screen
│   └── (protected)/        # Auth-protected routes
│       └── tasks/
├── src/
│   ├── api/                # API client
│   ├── contexts/           # React contexts
│   ├── services/           # API services
│   ├── utils/              # Utilities
│   ├── types/              # TypeScript types
│   └── constants/          # Config constants
└── assets/                 # App icons and images
```

## Development Phases

- [x] Phase 1: Project Setup & Login
- [ ] Phase 2: Tasks List
- [ ] Phase 3: Task Execution (Camera + GPS)
- [ ] Phase 4: Hardening

## Backend Integration

Backend runs on `http://localhost:3001/api`

### Auth API
- `POST /auth/login` - Login with phone + device_id

### Delivery APIs
- `GET /tasks/my` - Get assigned tasks
- `GET /tasks/:taskId` - Get task details
- `POST /tasks/:taskId/events` - Submit event with image
