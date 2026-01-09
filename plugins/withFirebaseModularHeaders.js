const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let podfileContent = fs.readFileSync(podfilePath, "utf-8");

      // Firebase modular headers to add
      const firebaseModularHeaders = `
  # Firebase modular headers for static libraries (added by plugin)
  pod 'GoogleUtilities', :modular_headers => true
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseInstallations', :modular_headers => true
  pod 'FirebaseCoreExtension', :modular_headers => true
  pod 'GoogleDataTransport', :modular_headers => true
  pod 'nanopb', :modular_headers => true
`;

      // Check if already added
      if (!podfileContent.includes("Firebase modular headers")) {
        // Find the target block and insert after use_expo_modules!
        podfileContent = podfileContent.replace(
          /(target\s+'[^']+'\s+do\s*\n\s*use_expo_modules!)/,
          `$1\n${firebaseModularHeaders}`
        );

        fs.writeFileSync(podfilePath, podfileContent);
        console.log("✅ Added Firebase modular headers to Podfile");
      } else {
        console.log("ℹ️ Firebase modular headers already in Podfile");
      }

      return config;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
