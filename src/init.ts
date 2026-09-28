/**
 * init.ts
 *
 * Initializes SceneryStack with simulation metadata.
 *
 * IMPORTANT: This file is the START of the EXECUTION chain (deepest import runs first):
 *   init.ts → assert.ts → splash.ts → brand.ts → main.ts
 *
 * Import nesting is the reverse (main → brand → splash → assert → init).
 * brand.js must be the first import in main.ts so this file runs before any other
 * SceneryStack module is imported.
 *
 * ── How to customize ─────────────────────────────────────────────────────────
 * 1. Change `name` to match your package.json "name" field (kebab-case)
 * 2. `version` is read from package.json — bump it there (`npm version`), never here
 * 3. Update `availableLocales` when you add new translation files
 */
import { init, madeWithSceneryStackSplashDataURI } from "scenerystack/init";
import { version } from "../package.json";

init({
  name: "variable-star-photometry",
  version,
  brand: "made-with-scenerystack",
  locale: "en",
  availableLocales: ["en", "es", "fr"],
  splashDataURI: madeWithSceneryStackSplashDataURI,
  allowLocaleSwitching: true,
  colorProfiles: ["default", "projector"],
});
