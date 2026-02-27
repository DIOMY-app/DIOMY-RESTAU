// app.config.ts
// Load environment variables with proper priority (system > .env)
// import "./scripts/load-env.js"; 

import type { ExpoConfig } from "expo/config";

// Bundle ID format: com.opieddumont.<timestamp>
// Remplacement de "manus" par "opieddumont" pour une identité propre
const rawBundleId = "com.opieddumont.mobile.t20260226211752";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "com.opieddumont.app";

const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
// Remplacement du scheme "manus" par "opm" (O'Pied du Mont)
const schemeFromBundleId = `opm${timestamp}`;

const env = {
  appName: "O'PIED DU MONT",
  appSlug: "opied-du-mont-mobile",
  logoUrl: "",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  // Utilisation de ton logo pour l'icône générale
  icon: "./assets/logo.png",
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
      // Ton logo pour l'icône Android
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
  plugins: [
    "expo-router",
    [
      "expo-audio",
      {
        microphonePermission: "Allow O'PIED DU MONT to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        // Ton logo sur l'écran de démarrage
        image: "./assets/logo.png",
        imageWidth: 250,
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
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;