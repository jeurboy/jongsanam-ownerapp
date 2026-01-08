#!/bin/bash

# Configuration
SOURCE="assets/icon.png"
IOS_DIR="ios/JongCourtOwnerApp/Images.xcassets/AppIcon.appiconset"
ANDROID_DIR="android/app/src/main/res"

echo "🚀 Starting Icon Generation..."

# Function to resize using sips
resize() {
  local size=$1
  local src=$2
  local dest=$3
  sips -s format png -z $size $size "$src" --out "$dest" > /dev/null
}

# --- iOS Generation ---
# --- iOS Generation ---
echo "📱 Generating iOS Icons..."
mkdir -p "$IOS_DIR"

# 20pt
resize 20 "$SOURCE" "$IOS_DIR/icon-20.png"
resize 40 "$SOURCE" "$IOS_DIR/icon-20@2x.png"
resize 60 "$SOURCE" "$IOS_DIR/icon-20@3x.png"

# 29pt
resize 29 "$SOURCE" "$IOS_DIR/icon-29.png"
resize 58 "$SOURCE" "$IOS_DIR/icon-29@2x.png"
resize 87 "$SOURCE" "$IOS_DIR/icon-29@3x.png"

# 40pt
resize 40 "$SOURCE" "$IOS_DIR/icon-40.png"
resize 80 "$SOURCE" "$IOS_DIR/icon-40@2x.png"
resize 120 "$SOURCE" "$IOS_DIR/icon-40@3x.png"

# 60pt
resize 120 "$SOURCE" "$IOS_DIR/icon-60@2x.png"
resize 180 "$SOURCE" "$IOS_DIR/icon-60@3x.png"

# 76pt (iPad)
resize 76 "$SOURCE" "$IOS_DIR/icon-76.png"
resize 152 "$SOURCE" "$IOS_DIR/icon-76@2x.png"

# 83.5pt (iPad Pro)
resize 167 "$SOURCE" "$IOS_DIR/icon-83.5@2x.png"

# 1024pt
resize 1024 "$SOURCE" "$IOS_DIR/icon-1024.png"

# Write Contents.json
cat > "$IOS_DIR/Contents.json" <<EOL
{
  "images" : [
    {
      "size" : "20x20",
      "idiom" : "iphone",
      "filename" : "icon-20@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "20x20",
      "idiom" : "iphone",
      "filename" : "icon-20@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "29x29",
      "idiom" : "iphone",
      "filename" : "icon-29@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "29x29",
      "idiom" : "iphone",
      "filename" : "icon-29@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "40x40",
      "idiom" : "iphone",
      "filename" : "icon-40@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "40x40",
      "idiom" : "iphone",
      "filename" : "icon-40@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "60x60",
      "idiom" : "iphone",
      "filename" : "icon-60@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "60x60",
      "idiom" : "iphone",
      "filename" : "icon-60@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "20x20",
      "idiom" : "ipad",
      "filename" : "icon-20.png",
      "scale" : "1x"
    },
    {
      "size" : "20x20",
      "idiom" : "ipad",
      "filename" : "icon-20@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "29x29",
      "idiom" : "ipad",
      "filename" : "icon-29.png",
      "scale" : "1x"
    },
    {
      "size" : "29x29",
      "idiom" : "ipad",
      "filename" : "icon-29@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "40x40",
      "idiom" : "ipad",
      "filename" : "icon-40.png",
      "scale" : "1x"
    },
    {
      "size" : "40x40",
      "idiom" : "ipad",
      "filename" : "icon-40@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "76x76",
      "idiom" : "ipad",
      "filename" : "icon-76.png",
      "scale" : "1x"
    },
    {
      "size" : "76x76",
      "idiom" : "ipad",
      "filename" : "icon-76@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "83.5x83.5",
      "idiom" : "ipad",
      "filename" : "icon-83.5@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "1024x1024",
      "idiom" : "ios-marketing",
      "filename" : "icon-1024.png",
      "scale" : "1x"
    }
  ],
  "info" : {
    "version" : 1,
    "author" : "xcode"
  }
}
EOL

# --- Android Generation ---
echo "🤖 Generating Android Icons..."

# mdpi (48x48)
mkdir -p "$ANDROID_DIR/mipmap-mdpi"
resize 48 "$SOURCE" "$ANDROID_DIR/mipmap-mdpi/ic_launcher.png"
resize 48 "$SOURCE" "$ANDROID_DIR/mipmap-mdpi/ic_launcher_round.png"

# hdpi (72x72)
mkdir -p "$ANDROID_DIR/mipmap-hdpi"
resize 72 "$SOURCE" "$ANDROID_DIR/mipmap-hdpi/ic_launcher.png"
resize 72 "$SOURCE" "$ANDROID_DIR/mipmap-hdpi/ic_launcher_round.png"

# xhdpi (96x96)
mkdir -p "$ANDROID_DIR/mipmap-xhdpi"
resize 96 "$SOURCE" "$ANDROID_DIR/mipmap-xhdpi/ic_launcher.png"
resize 96 "$SOURCE" "$ANDROID_DIR/mipmap-xhdpi/ic_launcher_round.png"

# xxhdpi (144x144)
mkdir -p "$ANDROID_DIR/mipmap-xxhdpi"
resize 144 "$SOURCE" "$ANDROID_DIR/mipmap-xxhdpi/ic_launcher.png"
resize 144 "$SOURCE" "$ANDROID_DIR/mipmap-xxhdpi/ic_launcher_round.png"

# xxxhdpi (192x192)
mkdir -p "$ANDROID_DIR/mipmap-xxxhdpi"
resize 192 "$SOURCE" "$ANDROID_DIR/mipmap-xxxhdpi/ic_launcher.png"
resize 192 "$SOURCE" "$ANDROID_DIR/mipmap-xxxhdpi/ic_launcher_round.png"

echo "✅ Done! Icons have been updated."
