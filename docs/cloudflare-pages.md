# Cloudflare Pages

Connect the public `kayrugold/theskycourier` GitHub repository to a Cloudflare
Pages project. This game is a static Vite build; it needs no backend, database,
secrets, or Worker.

In Cloudflare's Workers & Pages dashboard, create a **Pages** project and import
the GitHub repository. Use these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | Vite (or None with the settings below) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Leave empty |
| Node.js | 22.12 or newer (the repository pins Node in `.nvmrc`) |

Save and deploy. Open the returned HTTPS `pages.dev` address on the tablet and
Note 20. Use Chrome's **Add to Home screen / Install app** option for standalone
play. The first visit downloads the city, characters, and audio; keep the page
open until loading finishes before testing offline. Best scores and settings
remain local to each device.

Push commits to `main` to update production automatically. Pull requests receive
preview deployments when enabled in Cloudflare. GitHub Actions independently
runs the tests and build. Local development remains `npm ci`, then `npm run dev`.

The repository contains the prepared game models and textures needed to build
from a clean clone. Original art exports, local screenshots, dependencies, phone
archives, and build output stay outside Git. Asset-preparation scripts require
the original art files kept on the development machine.

After deployment, test both orientations, entering the game and audio, jump and
slide gestures, steering, BOOST, pause/resume, and app switching on both physical
devices. Desktop emulation verifies layout and input wiring, not sustained device
performance.

Reference: [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/).
