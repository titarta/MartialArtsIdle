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

const version = JSON.parse(readFileSync(pkgPath, 'utf-8')).version;
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
if (!m) {
  console.error(`[sync-version] package.json version "${version}" is not plain semver (x.y.z)`);
  process.exit(1);
}
const [, major, minor, patch] = m.map(Number);
const newCode = major * 10000 + minor * 100 + patch;

let gradle = readFileSync(gradlePath, 'utf-8');
const codeMatch = /versionCode (\d+)/.exec(gradle);
const oldCode = codeMatch ? Number(codeMatch[1]) : 0;
if (newCode < oldCode) {
  console.error(
    `[sync-version] derived versionCode ${newCode} (from ${version}) is LOWER than the current ` +
    `${oldCode}. Play rejects downgrades. Bump package.json version.`,
  );
  process.exit(1);
}

gradle = gradle
  .replace(/versionCode \d+/, `versionCode ${newCode}`)
  .replace(/versionName "[^"]*"/, `versionName "${version}"`);
writeFileSync(gradlePath, gradle);
console.log(`[sync-version] android/app/build.gradle -> versionCode ${newCode}, versionName "${version}"`);
