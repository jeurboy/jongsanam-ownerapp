#!/bin/bash

# Fix for "Redefinition of module 'react_runtime'" error on Xcode 26.2
# This script renames the module in React-jsitooling.modulemap to avoid conflict

MODULEMAP_FILE="ios/Pods/Target Support Files/React-jsitooling/React-jsitooling.modulemap"

if [ -f "$MODULEMAP_FILE" ]; then
  echo "🔧 Patching React-jsitooling.modulemap..."
  
  # Replace 'module react_runtime' with 'module react_jsitooling'
  sed -i '' 's/module react_runtime/module react_jsitooling/' "$MODULEMAP_FILE"
  
  echo "✅ Patch applied successfully!"
  cat "$MODULEMAP_FILE"
else
  echo "❌ File not found: $MODULEMAP_FILE"
  exit 1
fi
