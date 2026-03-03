/**
 * Configuration Expo - O'PIED DU MONT
 * Emplacement : /app.config.ts
 * Version : Fingerprint automatique SDK 51+
 */

import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "O'PIED DU MONT",
  slug: "opied-du-mont-mobile",
  version: "1.0.0",
  owner: "diomy",
  orientation: "portrait",
  icon: "./assets/logo.png",
  scheme: "opm-app",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.opieddumont.app",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/logo.png"
    },
    package: "com.opied_du_mont.app",
    permissions: ["POST_NOTIFICATIONS", "WRITE_EXTERNAL_STORAGE"],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/logo.png",
  },
  updates: {
    url: "https://u.expo.dev/5accbe7c-8052-4c53-9e57-ca8eef4c83fb",
    checkAutomatically: "ON_LOAD",
  },
  // ✅ Fingerprint automatique — EAS calcule l'empreinte du build natif
  runtimeVersion: {
    policy: "fingerprint"
  },
  extra: {
    eas: {
      projectId: "5accbe7c-8052-4c53-9e57-ca8eef4c83fb"
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
        backgroundColor: "#ffffff"
      }
    ],
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          kotlinVersion: "1.9.10",
          enableProguardInReleaseBuilds: true
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  }
};

export default config;