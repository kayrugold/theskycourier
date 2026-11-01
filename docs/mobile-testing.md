# Note 20 development and releases

The phone is the primary playtest device. The Three.js game can share its renderer,
rules, assets, and touch input across an Android app and browser demos. The current
project is a web game; it does not yet contain an Android project or produce an APK.

## Test immediately over Wi-Fi

On the PC, run `npm run dev`. Connect the phone to the same local Wi-Fi and open
the Network URL printed by Vite (normally `http://192.168.1.201:5173/` on this PC).
Keep the PC and server running. The phone downloads the game, not the repository.
Changes refresh through Vite. If the URL fails, check the PC's current LAN address,
Windows firewall access for Node on private networks, and Wi-Fi client isolation.
Do not forward these development ports on the router.

HTTP on a LAN address supports playtesting, but service workers require a secure
context. Use the phone's localhost server below for offline/install testing.

## Small transfer bundles

On the PC:

```sh
npm run package:phone
```

This creates two archives in `phone/`:

- `sky-courier-play.tar.gz`: built game plus a server with no npm dependencies.
  Use this for quick, repeatable playtests. No build is needed on the phone.
- `sky-courier-source.tar.gz`: editable game source and only the prepared assets
  imported by the game. Includes npm/pnpm lockfiles. Source FBXs, unused textures,
  screenshots, dependency folders, and asset preparation tools are excluded.

Transfer only the archive you need to the phone's Downloads folder. Extract into
Termux home; Android shared storage is unsuitable for dependency executables and
symlinks. With Termux storage permission already configured:

```sh
cd ~
tar -xzf ~/storage/downloads/sky-courier-play.tar.gz
cd sky-courier-play
node scripts/serve-phone.mjs
```

Open `http://127.0.0.1:4173/` in Chrome. The server listens only on the phone's
loopback interface. Keep Termux running during testing. Stop with Ctrl+C.
The production service worker can cache the game after an online localhost load;
wait for the initial download before testing offline.

To edit and build on the phone instead (Node.js 22.12+):

```sh
cd ~
tar -xzf ~/storage/downloads/sky-courier-source.tar.gz
cd sky-courier-source
npm ci
npm test
npm run dev
```

Open `http://127.0.0.1:5173/`. To test production caching:

```sh
npm run build
npm run serve:phone
```

Dependency installation initially needs internet. The editable bundle builds the
existing prepared assets; rebuilding source art remains a desktop task. Recreating
the transfer bundles also remains a desktop task. Stop the server before replacing
an extracted bundle with a newer version. If testing changes to offline behavior,
clear this localhost site's storage in Chrome to remove old cached versions.

## Portrait and landscape

During mobile play, the map starts collapsed; tap MAP to inspect the route and
CLOSE to return to the clear riding view. A compact top bar shows time and stats,
with short pickup/delivery and fork directions below it. Only one brief notice
appears along the bottom edge, prioritizing immediate threats over rewards.
Routine collision explanations and missing-equipment reminders are suppressed.
BOOST remains within thumb reach. Graphics, FPS, and sound controls are available
on the menu and pause screen instead of covering the running game.

The renderer uses the available viewport and updates on resize/rotation. The phone
does not need a separate copy of the game for portrait mode. Portrait menus and HUD
use responsive CSS, including safe-area spacing; wider desktop layouts remain
available. Phone input uses swipes, holds, and taps. The BOOST button spends a
collected tank; movement remains gesture controlled.

On the physical Note 20 check both orientations, browser toolbar resizing, menu
entry and audio unlock, swipe steering/jump/duck, holding to accelerate, vehicle
taps, deliveries, pause/resume, switching apps, heat and sustained frame rate.
Desktop emulation cannot establish real phone performance.

## Release direction

Keep one shared game with explicit release settings for the Android edition,
browser demo, and compact website embed. The Android edition can package the built
web assets in an Android WebView shell; an APK does not require rewriting Three.js.
Android packaging, device testing, lifecycle/back-button handling, signing, and
store submission are separate work still to implement. Plan a signed Android App
Bundle for store distribution and APKs for direct device tests.

The browser demo can use the full viewport. The product-page demo should load on
click inside an iframe with its own smaller asset/content budget and a full-screen
play option. A smaller iframe alone does not reduce downloaded game assets. Demo
content limits and the embed build are not implemented in this change.
