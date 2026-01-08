#!/bin/bash

# Build and Archive for iOS (with Automatic Signing)
# This script uses Xcode's automatic signing instead of manual provisioning profiles

echo "🚀 Building iOS App for App Store..."

# Clean build folder
echo "🧹 Cleaning build folder..."
cd ios
xcodebuild clean -workspace JongCourtOwnerApp.xcworkspace -scheme JongSanamOwnerApp

# Archive the app
echo "📦 Creating archive..."
xcodebuild archive \
  -workspace JongCourtOwnerApp.xcworkspace \
  -scheme JongSanamOwnerApp \
  -configuration Release \
  -archivePath ./build/JongSanamOwnerApp.xcarchive \
  -allowProvisioningUpdates

echo "✅ Archive created successfully!"
echo "📍 Archive location: ios/build/JongSanamOwnerApp.xcarchive"
echo ""
echo "Next steps:"
echo "1. Open Xcode"
echo "2. Go to Window > Organizer"
echo "3. Select your archive"
echo "4. Click 'Distribute App'"
echo "5. Choose 'App Store Connect'"
echo "6. Follow the wizard to upload"
