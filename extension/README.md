# OnTrack browser extension

Log the job posting you are looking at straight into your OnTrack account.
Open a posting, click the OnTrack toolbar icon, and the popup comes up with
the company, role, job description, link and today's date already filled in.
Edit anything, press Save, and the application is created at status Applied.

It is a logging tool and nothing else. It never fills in or submits forms on
job sites, never runs on a page unless you click the icon, and never sends
page content anywhere except your own OnTrack backend.

## How sign-in works

The extension uses your existing OnTrack sign-in and **stores nothing**. There
is no token, no API key and no cookie value in any extension storage. When the
service worker calls the API it sends `credentials: "include"` and the browser
attaches the same `ontrack_session` cookie the web app already set, because the
manifest holds a host permission for the API.

The one thing it does keep is an unsaved draft of the fields you are editing,
in `chrome.storage.session`, which is memory backed and cleared when the
browser closes. That exists so signing in, or waiting out a backend cold start,
does not lose what you were about to save.

If you are signed out, the popup says so and offers a button that opens the
web app's login page.

## Supported sites

| Site | How it reads the posting |
| --- | --- |
| Greenhouse | The public board API (`boards-api.greenhouse.io`) |
| Lever | The public postings API (`api.lever.co`) |
| Ashby | The public job board API (`api.ashbyhq.com`) |
| Workday | The tenant's own `/wday/cxs/...` endpoint, read from inside the page |
| LinkedIn | The rendered page, through an ordered list of candidate selectors |
| Anything with schema.org `JobPosting` | The page's own JSON-LD |
| Anything else | Page heuristics, and an optional AI fallback you have to agree to |

Readers run best first and stop as soon as both the company and the role are
known. They merge field by field, so a board API that knows the role and the
description but not the company (Ashby carries no company name at all) still
gets the company from the page.

When nothing can read the page, the popup says so and offers two choices: fill
it in yourself, or spend one of your daily AI calls having Gemini read it.
Nothing is sent anywhere until you pick the second one, and the cost is shown
before you choose.

## Installing it unpacked

```bash
cd extension
npm install
npm run build
```

Then open `chrome://extensions`, turn on **Developer mode**, choose **Load
unpacked**, and pick `extension/.output/chrome-mv3`.

For Firefox, `npm run build:firefox` writes to `.output/firefox-mv2` (WXT
targets MV2 for Firefox), which you load through `about:debugging` as a
temporary add-on.

### The manifest key and the extension ID

An unpacked extension's ID is normally derived from its folder path, so it
would differ on every machine. `wxt.config.ts` pins a public key instead, which
fixes the ID at:

```
immfkodocchgncopfbmieneelgplgfai
```

That matters because the backend has to allow the extension's origin. Spring
rejects a request whose `Origin` is not in `app.cors.allowed-origins` with a
403, even though the browser itself would not enforce CORS for a host
permitted extension request. So the deployment needs:

```
CORS_ALLOWED_ORIGINS=https://ontrack.abhinavgonthina.dev,chrome-extension://immfkodocchgncopfbmieneelgplgfai
```

The private half of the key pair lives in `extension/.keys/`, which is
gitignored. It is only needed to sign a CRX; the committed public key is what
fixes the ID.

To recompute the ID from the key: take the SHA-256 of the DER public key, keep
the first 32 hex characters, and map each hex digit `0-f` to `a-p`.

**If the extension is ever published to a store**, Chrome Web Store or Edge
Add-ons assigns it a different ID, and that store ID has to be added to
`CORS_ALLOWED_ORIGINS` as well.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `WXT_API_URL` | `https://api.abhinavgonthina.dev` | OnTrack's API |
| `WXT_APP_URL` | `https://ontrack.abhinavgonthina.dev` | The web app, for links |

`.env.development` points both at localhost, and is picked up by
`wxt build --mode development` and `wxt dev`. That build also gets host
permissions for localhost and `*.ontrack.test`, which the production build
deliberately does not have; `test/manifest.test.ts` asserts that.

## Permissions, and why each one is needed

| Permission | Why |
| --- | --- |
| `activeTab` | Read the current tab, only after you click the icon |
| `scripting` | Inject the extractor into that one tab |
| `storage` | `chrome.storage.session` for the unsaved draft, never credentials |
| host `api.abhinavgonthina.dev` | Call OnTrack's API with your session cookie |
| host `boards-api.greenhouse.io`, `api.lever.co`, `api.ashbyhq.com` | Read structured posting data from the public board APIs |

There is deliberately no `<all_urls>`, no `tabs`, no `cookies`, no
`webRequest` and no persistent content script.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | WXT dev server with hot reload |
| `npm run build` | Production Chrome MV3 build, into `.output/chrome-mv3` |
| `npm run build:firefox` | Firefox build |
| `npm run build:e2e` | Development build the e2e suite loads |
| `npm run zip` | Zip for store submission |
| `npm test` | Unit tests (Vitest, jsdom) |
| `npm run e2e` | End to end tests (Playwright, real Chromium) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run icons` | Re-render the toolbar icons from the web app's `icon.svg` |

## Running the tests

Unit tests need nothing:

```bash
npm test
```

The e2e suite drives a real Chromium with the built extension against a local
OnTrack, and never touches production. From the repo root:

```powershell
# 1. A throwaway Postgres. Nothing here goes near Neon.
docker run -d --rm --name ontrack-ext-db -e POSTGRES_PASSWORD=test `
  -e POSTGRES_DB=ontrack -p 5434:5432 postgres:17

# 2. The backend, pointed at that container
.\extension\scripts\local-backend.ps1

# 3. The web app
cd frontend; npm run dev

# 4. A verified test user
curl -X POST http://localhost:8080/api/auth/signup -H "Content-Type: application/json" `
  -d '{\"email\":\"ext-test@example.com\",\"password\":\"ExtensionTest123!\"}'
docker exec ontrack-ext-db psql -U postgres -d ontrack `
  -c "UPDATE users SET email_verified = true WHERE email = 'ext-test@example.com';"

# 5. The suite
cd extension; npm run build:e2e; npm run e2e
```

Stop the container with `docker stop ontrack-ext-db` when you are done.

### The production-shape cookie test

`e2e/session-cookie.spec.ts` proves the cookie reaches the extension on
localhost. `e2e/session-cookie-production.spec.ts` proves the harder case: a
`SameSite=Lax` cookie set on a parent domain, with the app and the API on
sibling subdomains over HTTPS, which is the shape production actually uses. It
is skipped unless you start the HTTPS pair and opt in:

```powershell
.\extension\scripts\local-backend-https.ps1
node extension\scripts\app-https-stub.mjs
cd extension; $env:E2E_PRODUCTION_SHAPE="1"; npm run e2e:production
```

Chromium resolves `app.ontrack.test` and `api.ontrack.test` to 127.0.0.1
through `--host-resolver-rules`, so nothing is written to the hosts file and no
real DNS is involved. The certificate is a throwaway self-signed one and is
only trusted inside that test browser.

## Project layout

```
src/
  entrypoints/
    background.ts     service worker: API calls, board fetches, the badge
    extractor.ts      injected into the page on a toolbar click
    popup/            the React popup
  extract/
    pipeline.ts       reader ordering and field-by-field merging
    readers/          one per site, all pure functions
    canonicalUrl.ts   twin of the backend's ApplicationUrlCanonicalizer
    htmlToText.ts     HTML to plain text, with the 20,000 character cap
  popup/
    state.ts          the whole state machine, tested without rendering
    draftStore.ts     unsaved drafts in session storage
  api/                the OnTrack API client
  copy.ts             every user-facing string
test/
  fixtures/           real postings captured from public pages
e2e/                  Playwright specs
```
