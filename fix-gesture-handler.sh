#!/bin/bash

echo "🔧 Fixing RNGestureHandlerModule Error..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${YELLOW}Step 1: Cleaning build artifacts...${NC}"
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock
echo "${GREEN}✓ Build artifacts cleaned${NC}"
echo ""

echo "${YELLOW}Step 2: Cleaning Metro cache...${NC}"
rm -rf /tmp/metro-* 2>/dev/null
rm -rf /tmp/react-* 2>/dev/null
watchman watch-del-all 2>/dev/null || echo "Watchman not installed (optional)"
echo "${GREEN}✓ Metro cache cleaned${NC}"
echo ""

echo "${YELLOW}Step 3: Installing iOS dependencies...${NC}"
cd ios
pod install
cd ..
echo "${GREEN}✓ Pods installed${NC}"
echo ""

echo "${GREEN}✅ All done!${NC}"
echo ""
echo "Now run:"
echo "  ${YELLOW}npm start -- --reset-cache${NC}"
echo ""
echo "In another terminal:"
echo "  ${YELLOW}npm run ios${NC}"
