#!/bin/bash

# Build iOS App using React Native CLI (simpler approach)
# This uses React Native's built-in build system

echo "🚀 Building iOS App for Release..."
echo ""

# Set environment to production
export ENVFILE=.env.production

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd ios
rm -rf build
rm -rf ~/Library/Developer/Xcode/DerivedData/JongCourtOwnerApp-*
cd ..

# Install pods
echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install
cd ..

# Build using React Native CLI
echo "🔨 Building Release version..."
npx react-native run-ios --configuration Release --device

echo ""
echo "✅ Build completed!"
echo ""
echo "📱 Next steps for App Store submission:"
echo "1. Open Xcode: open ios/JongCourtOwnerApp.xcworkspace"
echo "2. Select 'Any iOS Device' as target"
echo "3. Product > Archive"
echo "4. Window > Organizer"
echo "5. Select your archive and click 'Distribute App'"
echo "6. Choose 'App Store Connect'"
echo "7. Follow the wizard"
