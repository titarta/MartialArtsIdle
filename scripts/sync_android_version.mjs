/**
 * sync_android_version.mjs - single-source-of-truth versioning.
 *
 * package.json "version" is the ONLY place a release version is bumped.
 * This script copies it into android/app/build.gradle before every Android
 * release build (wired into the release:android* npm scripts):
 *
 *   versionName = package.json version (what players/Play listing see)
 *   versionCode = major*10000 + minor*100 + patch (monotonic, Play's int)
 *
 * e.g. 1.0.17 -> versionName "1.0.17", versionCode 10017.
 *
 * The in-app version (Settings/About, analytics, support diagnostics) comes
 * from __MAI_VERSION__, which vite.config.js injects from the same
 * package.json field, so app UI and store version can never drift again.
 * Historic manual versionCodes stopped at 20, so the derived scheme is
 * always higher and Play accepts the jump.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pkgPath = path.join(root, 'package.json');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);
if (!m) {
  console.error(`[sync-version] package.json version "${pkg.version}" is not plain semver (x.y.z)`);
  process.exit(1);
}
let [, major, minor, patch] = m.map(Number);
const codeFrom = (mj, mn, pt) => mj * 10000 + mn * 100 + pt;

let gradle = readFileSync(gradlePath, 'utf-8');
const codeMatch = /versionCode (\d+)/.exec(gradle);
const oldCode = codeMatch ? Number(codeMatch[1]) : 0;

// Auto-bump patch until derived versionCode > what's already in gradle.
// Play rejects re-uploads with the same versionCode, so a "build again with
// no source change" still has to produce a fresh code. The patch bump is
// mirrored back into package.json so __MAI_VERSION__, the in-app About
// screen, and analytics all stay in lockstep with the store listing.
let newCode = codeFrom(major, minor, patch);
if (newCode <= oldCode) {
  const bumped = oldCode + 1;
  major = Math.floor(bumped / 10000);
  minor = Math.floor((bumped % 10000) / 100);
  patch = bumped % 100;
  newCode = bumped;
  pkg.version = `${major}.${minor}.${patch}`;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`[sync-version] auto-bumped package.json version -> ${pkg.version} (gradle was at ${oldCode})`);
}

gradle = gradle
  .replace(/versionCode \d+/, `versionCode ${newCode}`)
  .replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
writeFileSync(gradlePath, gradle);
console.log(`[sync-version] android/app/build.gradle -> versionCode ${newCode}, versionName "${pkg.version}"`);
