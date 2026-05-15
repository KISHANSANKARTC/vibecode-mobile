// Bootstrap side-effects — these MUST run before any other code touches them.
// Order matters:
//   1. polyfill for crypto.getRandomValues (used by uuid + jose)
//   2. reanimated worklet runtime registration (must initialize before any worklet is touched)
//   3. NativeWind global Tailwind stylesheet
//   4. expo-router entry — bootstraps the file-based router and renders src/app/_layout.tsx
//
// This file is .js (not .ts) intentionally so Metro on every OS — including Windows —
// resolves it from the `main` field in package.json without needing TS-aware resolution.
// It uses no TypeScript-specific syntax.

import "react-native-get-random-values";
import "react-native-reanimated";
import { LogBox } from "react-native";
import "./global.css";
import "expo-router/entry";

LogBox.ignoreLogs(["Expo AV has been deprecated", "Disconnected from Metro"]);
