import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import React from 'react';

// Cette fonction gère le routage automatique d'Expo
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);