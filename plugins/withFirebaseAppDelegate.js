const { withAppDelegate } = require("expo/config-plugins");

function withFirebaseAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;

    // Add Firebase import if not exists
    if (!contents.includes("import FirebaseCore")) {
      contents = contents.replace(
        "import Expo",
        "import Expo\nimport FirebaseCore"
      );
    }

    // Add FirebaseApp.configure() if not exists
    if (!contents.includes("FirebaseApp.configure()")) {
      contents = contents.replace(
        "didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil\n  ) -> Bool {",
        `didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withFirebaseAppDelegate;
