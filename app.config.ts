// app.config.ts
// Configuration optimisée pour le build APK de O'PIED DU MONT
// Suppression temporaire de expo-audio et expo-video pour résoudre les erreurs Gradle

import type { ExpoConfig } from "expo/config";

// Bundle ID format: com.opieddumont.<timestamp>
const rawBundleId = "com.opieddumont.mobile.t20260226211752";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") 
    .replace(/[^a-zA-Z0-9.]/g, "") 
    .replace(/\.+/g, ".") 
    .replace(/^\.+|\.+$/g, "") 
    .toLowerCase()
    .split(".")
    .map((segment) => {
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "com.opieddumont.app";

const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `opm${timestamp}`;

const env = {
  appName: "O'PIED DU MONT",
  appSlug: "opied-du-mont-mobile",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/logo.png", // Utilisation de ton logo PNG converti
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/logo.png",
      backgroundImage: "./assets/logo.png", 
    },
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS", "WRITE_EXTERNAL_STORAGE"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/logo.png",
  },
  extra: {
    eas: {
      projectId: "53a61250-3e29-44e4-bcf3-33aa78d530fe"
    }
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/logo.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          buildToolsVersion: "34.0.0"
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;