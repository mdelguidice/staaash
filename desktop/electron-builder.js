/**
 * electron-builder configuration.
 *
 * JS rather than the YAML this replaces, for one reason: signing has to be
 * OPT-IN. A local `npm run dist` with no credentials must keep producing exactly
 * what it produced before — an unsigned, ad-hoc-signed arm64 build that runs on
 * this machine without a Developer ID. Static YAML cannot express that, because
 * dropping `identity: null` would make every local build start hunting for a
 * certificate.
 *
 * ── Local build (no env vars) ────────────────────────────────────────────────
 *   npm run dist
 * Unchanged from before: identity null, no notarization, arm64 dmg + dir.
 * The result is ad-hoc signed, which is the minimum arm64 macOS needs to execute
 * anything, and it opens without a Gatekeeper prompt because a locally built
 * file never receives the com.apple.quarantine attribute.
 *
 * ── Release build (credentials present) ──────────────────────────────────────
 *   export APPLE_ID="you@example.com"
 *   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"   # appleid.apple.com
 *   export APPLE_TEAM_ID="YOURTEAMID"
 *   npm run dist
 * Signs with the Developer ID Application certificate in the login keychain,
 * enables the hardened runtime (a notarization requirement), then submits to
 * Apple and staples the ticket. Requires an Apple Developer Program membership;
 * a self-signed certificate cannot work, since Gatekeeper only trusts chains
 * ending at Apple.
 *
 * App Store Connect API keys work too, in place of the Apple ID trio:
 *   APPLE_API_KEY, APPLE_API_KEY_ID, APPLE_API_ISSUER
 *
 * Verify a release build with:
 *   spctl --assess --type execute --verbose dist/mac-arm64/staaash.app
 * Expect "accepted" and "source=Notarized Developer ID". A local build reports
 * "rejected", which is correct and not a failure.
 *
 * ── Why arm64 only ───────────────────────────────────────────────────────────
 * NOT a config toggle. scripts/fetch-sqlite-prebuild.mjs calls prebuild-install
 * with no --arch, so it fetches the better-sqlite3 binary for the HOST
 * architecture. Adding x64 here would package an arm64 .node into an Intel
 * build: it would install, launch, and then crash on the first database call.
 * Shipping to Intel Macs means teaching that script to fetch both slices and
 * giving electron-builder the right one per target — real work, not a flag.
 */

const env = process.env

// Any one of these means a certificate is available: CSC_LINK/CSC_NAME are
// electron-builder's own, APPLE_TEAM_ID comes with the notarization credentials.
const signing = Boolean(env.CSC_LINK || env.CSC_NAME || env.APPLE_TEAM_ID)

// Notarization needs a full credential set. Signing without one is legal and
// still useful (it is what a CI signing step produces before a release job
// notarizes), so it is allowed — but it is called out, because a signed
// un-notarized app is still blocked by Gatekeeper on someone else's Mac and
// that is a confusing way to find out.
const notarize =
  Boolean(env.APPLE_ID && env.APPLE_APP_SPECIFIC_PASSWORD && env.APPLE_TEAM_ID) ||
  Boolean(env.APPLE_API_KEY && env.APPLE_API_KEY_ID && env.APPLE_API_ISSUER)

if (signing) {
  console.log(
    `[staaash] signing enabled${notarize ? ' + notarization' : ''}` +
      `${env.CSC_NAME ? ` (identity: ${env.CSC_NAME})` : ' (identity: auto-discovered)'}`
  )
  if (!notarize) {
    console.warn(
      '[staaash] WARNING: signing without notarization. The build will still be ' +
        'blocked by Gatekeeper on any Mac that did not build it. Set APPLE_ID, ' +
        'APPLE_APP_SPECIFIC_PASSWORD and APPLE_TEAM_ID to notarize.'
    )
  }
}

export default {
  appId: 'com.mikedelguidice.staaash',
  productName: 'staaash',
  directories: {
    buildResources: 'build',
    output: 'dist'
  },
  files: ['out/**', 'package.json'],
  npmRebuild: false,
  mac: {
    category: 'public.app-category.productivity',
    icon: 'build/icon.icns',
    // identity: null is what disables signing. When a certificate IS available
    // the key is omitted entirely rather than set — omitted means "discover it",
    // whereas null means "do not sign", and electron-builder reads CSC_NAME and
    // CSC_LINK itself.
    ...(signing ? { hardenedRuntime: true, notarize } : { identity: null }),
    target: [
      { target: 'dmg', arch: 'arm64' },
      { target: 'dir', arch: 'arm64' }
    ]
  },
  dmg: {
    title: 'staaash'
  }
}
