---
name: mobile-test
description:
  Automate iOS simulator setup, app launch, and sign-in for mobile testing
---

# Mobile Test Automation

Automates the full mobile app testing flow: Docker services, API server, iOS
simulator, and sign-in.

## When to Use

Activate when:

- User wants to test the mobile app on iOS simulator
- User mentions "test mobile", "iOS simulator", "sign in mobile"
- Need to verify mobile app functionality after code changes

## Prerequisites

The following must be installed:

- Docker Desktop (for Postgres, MongoDB, PowerSync containers)
- Xcode with iOS Simulator
- Maestro CLI (`curl -Ls "https://get.maestro.mobile.dev" | bash`)
- Node.js and pnpm

## Quick Start Command

Run this flow to get from zero to signed-in app:

```bash
# 1. Start Docker containers
docker compose up -d

# 2. Start API server (background)
pnpm --filter @operator/api run dev &

# 3. Boot iOS simulator
xcrun simctl boot "iPhone 16 Pro" 2>/dev/null || true
open -a Simulator

# 4. Build and run iOS app
cd apps/mobile && npx expo run:ios --device "iPhone 16 Pro"
```

## Step-by-Step Flow

### 1. Check and Start Docker

```bash
# Verify Docker is running
docker info > /dev/null 2>&1 && echo "Docker OK" || echo "Start Docker Desktop first!"

# Start containers
docker compose up -d

# Verify containers
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "postgres|mongo|powersync"
```

### 2. Start API Server

```bash
# Start in background
pnpm --filter @operator/api run dev > /tmp/api-server.log 2>&1 &

# Wait and verify
sleep 4
curl -s http://localhost:3011/health
```

### 3. Update API URL (Important!)

The mobile app's `.env.local` must have the correct local IP:

```bash
# Get current IP
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo "Current IP: $IP"

# Update .env.local if needed
# EXPO_PUBLIC_API_URL=http://$IP:3011
```

Check `apps/mobile/.env.local` and update `EXPO_PUBLIC_API_URL` if the IP has
changed.

### 4. Boot iOS Simulator

```bash
# List available simulators
xcrun simctl list devices available | grep iPhone

# Boot simulator (iPhone 16 Pro recommended)
xcrun simctl boot "iPhone 16 Pro" 2>/dev/null || true
open -a Simulator
```

### 5. Build and Run App

```bash
cd apps/mobile
npx expo run:ios --device "iPhone 16 Pro"
```

This builds the native app and installs it on the simulator. First build takes
~2-3 minutes.

### 6. Automate Sign-In with Maestro

Once the app shows the sign-in screen, use Maestro to automate login:

```bash
# Get simulator device ID
DEVICE_ID=$(xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -1)
```

Then use Maestro MCP tools:

1. `mcp__maestro__take_screenshot` - Verify app is on sign-in screen
2. `mcp__maestro__tap_on` with text "Email"
3. `mcp__maestro__input_text` with "admin@operator.local"
4. `mcp__maestro__tap_on` with text "Password"
5. `mcp__maestro__input_text` with "admin123"
6. `mcp__maestro__tap_on` with text "Sign In"
7. Wait 3-5 seconds
8. `mcp__maestro__take_screenshot` - Verify signed in (should show Projects
   screen)

## Test Credentials

Default seeded user:

- Email: `admin@operator.local`
- Password: `admin123`

## Maestro Flow File (Alternative)

Save as `apps/mobile/maestro/sign-in.yaml`:

```yaml
appId: com.operator.editor
---
- launchApp:
    clearState: true
- assertVisible: "Hello Again"
- tapOn:
    text: "Email"
- inputText: "admin@operator.local"
- tapOn:
    text: "Password"
- inputText: "admin123"
- pressKey: Enter
- assertVisible: "Projects"
```

Run with: `maestro test apps/mobile/maestro/sign-in.yaml`

## Troubleshooting

### App stuck on loading spinner

- API server not running or wrong IP in `.env.local`
- Check: `curl http://localhost:3011/health`

### "No script URL provided" error

- Metro bundler not running
- Restart with: `CI=1 npx expo start --port 8081`

### Native module errors

- Need development build, not Expo Go
- Run `npx expo run:ios` instead of using Expo Go app

### iOS simulator not found

- Check available: `xcrun simctl list devices available`
- Install runtime: Xcode > Settings > Components

### better-sqlite3 version mismatch

- Rebuild: `cd node_modules/better-sqlite3 && npm rebuild`

## Cleanup

```bash
# Stop API server
pkill -f "@operator/api"

# Stop Metro
pkill -f "expo start"

# Shutdown simulator
xcrun simctl shutdown all

# Stop Docker containers (optional)
docker compose down
```
