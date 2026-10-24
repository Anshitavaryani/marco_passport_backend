# Frontend handoff: email links, itineraries, maps

Backend branch: `cleanup/remove-dead-code` (marco_passport_backend). This note
lists what the frontend (public site + admin panel) must change to match it.
Base URL for everything below: `<API>/api/v1`.

## 0. Conventions (unchanged, for reference)

- Every response: `{ success, status, message, data }`. Show `message` on errors.
- User auth header: `x-access-token: <tokens.access.token>`.
- Optional headers: `role_id` (defaults to the user role; don't send it),
  `timezone` (IANA name, e.g. `America/Cayman`; used for login history).
- Access tokens last **30 minutes** and there is no refresh token. Treat any
  **401** on a user route as "logged out": clear the stored token and show the
  login popup. Don't lose what the user was doing (see the itinerary draft below).
- Image fields (`featured_image`, etc.) are paths like `/images/abc.jpg`,
  relative to the API host.

## 1. Breaking changes (do these first)

| Was | Now |
|---|---|
| `POST /user/auth/reset-password` (logged in: old/new/confirm password) | `POST /user/auth/change-password`, same body |
| `POST /user/auth/forgot-password` (OTP-based, never worked) | Link-based flow, see §2.3 |
| Register logged the user in / account active immediately | Account is `PENDING` until the emailed link is opened, see §2.1 |
| `/user/passport/*` | Removed. Use `/user/itineraries/*`, see §3 |
| `is_in_passport` on place list/detail responses | `is_in_itinerary` (place is in *any* of the user's itineraries) |
| `/payment/*` | Removed (no payments in the app). Delete any Stripe code/keys. |
| Admin: `passports_count` / `user_passports` on users | `itineraries_count` / `itineraries[].items[].place` |
| Admin: `GET /admin/user*`, `GET /explore/admin*`, `GET /business-submission` had no auth | Need the admin `x-access-token` (same as the other admin calls) |
| Revoked/logged-out user token returned 400 "Token Not Found" | Now **401** "Session expired. Please log in again." |

## 2. Accounts

### 2.1 Sign up → verify email

1. `POST /user/auth/register` `{ name, email, password, confirm_password }`
   - 201 → `data: { email }`. Show a "Check your inbox" screen with a
     **Resend email** button. Do *not* treat the user as logged in.
   - 400 with message "This email is registered but not verified yet…" →
     show the same "check your inbox / resend" screen.
   - 503 → the email couldn't be sent; nothing was saved; ask them to retry.
   - Password rules: ≥ 8 chars, ≥ 2 digits, no spaces, ≤ 72 bytes.
2. The email links to **`<FRONTEND_URL>/?auth=verify-email&token=<64 hex chars>`**,
   which opens the verify dialog over the home page:
   - On open, `POST /user/auth/verify-email` `{ token }` (POST, not GET, so
     email link scanners can't verify accounts on their own).
   - 200 → `data` is the **same shape as login** (§2.2): store the token, the
     user is now logged in. Then run the "save pending draft" step (§3.3) and
     redirect (to the saved itinerary if there was a draft, else home).
   - 400 "invalid or has expired" → show an error with a link to log in and a
     resend form.
3. `POST /user/auth/resend-verification` `{ email }` → always 200 with a
   generic message (by design). The backend ignores repeats within 60s.
   Register, resend-verification and forgot-password each allow 5 requests
   an hour per IP in production (counted separately); past that they answer
   **429** "Too many email requests".
4. Accounts not verified within **24 hours** of sign-up are deleted
   automatically; the user then has to register again. Mention "the link
   expires in 24 hours" on the check-your-inbox screen.

### 2.2 Login

`POST /user/auth/login` `{ email, password }`
- 200 → `data: { id, name, email, role_id, tokens: { access: { token, expires }, refresh: {…empty} } }`
- 400 → wrong email/password.
- **403** "Please verify your email…" → show the check-your-inbox screen with Resend.

### 2.3 Forgot password (new, link-based)

1. "Forgot password?" → email field → `POST /user/auth/forgot-password` `{ email }`.
   Always 200 with a generic message ("If an account exists…"). Show it as is.
2. The email links to **`<FRONTEND_URL>/?auth=reset-password&token=<64 hex chars>`**
   (valid **1 hour**, single use), which opens the reset dialog with
   **New password** and **Confirm password** fields, then
   `POST /user/auth/reset-password` `{ token, password, confirm_password }`.
   - 200 → "Password changed, please log in" → open the login popup.
   - 400 → show `message` (rule violation, mismatch, or invalid/expired link;
     for the last one offer "send a new link").
   - **429** → the password was changed or reset in the last 12 hours; show
     `message`, which says how long to wait.
   - Success signs the user out everywhere, so clear any stored token.

### 2.4 Other user auth routes (unchanged)

`POST /user/auth/change-password` (logged in) `{ old_password, new_password, confirm_password }`
→ returns new `tokens` (the old token is revoked; replace it). Same 12-hour
limit as a reset: **429** with a `message` saying how long to wait.
`GET /user/auth/logout`, `GET /user/profile`, `POST /user/notifications`, `DELETE /user/deactivate`.

The site has no separate auth pages: the links above open dialogs over the
home page, and the old `/verify-email` and `/reset-password` paths redirect
there (keeping the token). The backend builds the links from `FRONTEND_URL`.

## 3. My Passport = itineraries

Users can only pick **places listed by the admin** (the explore and places
pages): no free-text or "search Google" places. Every itinerary item is a
`place_id` from those listings, and the backend rejects anything else.

A user can have **many itineraries** (trip plans). Each has a name, optional
start/end dates, and an **ordered** list of places, each with an optional
visit date. Order = visiting order = the route drawn on the map. Max **20
places** per itinerary; a place can appear only once per itinerary.

### 3.1 API (all need `x-access-token`; 401 → login popup)

| Method & path | Body | Returns |
|---|---|---|
| `GET /user/itineraries` | – | array of itineraries, newest-edited first; `items[].place` has `id, name, slug, featured_image`; plus `item_count` |
| `POST /user/itineraries` | `{ name?, start_date?, end_date?, items?: [{ place_id, visit_date? }] }` | 201, full itinerary |
| `GET /user/itineraries/:id` | – | full itinerary |
| `PUT /user/itineraries/:id` | any of `name, start_date, end_date, items` | full itinerary |
| `DELETE /user/itineraries/:id` | – | 200 |
| `POST /user/itineraries/:id/items` | `{ place_id, visit_date? }` | 201, full itinerary (place appended at the end) |

Full itinerary shape:
```json
{
  "id": 12, "user_id": 3, "name": "Cayman trip",
  "start_date": "2026-12-01", "end_date": "2026-12-05",
  "created_at": "…", "updated_at": "…", "item_count": 2,
  "items": [
    { "id": 40, "place_id": 7, "position": 0, "visit_date": "2026-12-02",
      "place": { "id": 7, "type": "place", "name": "Seven Mile Beach", "slug": "seven-mile-beach",
                 "short_description": "…", "featured_image": "/images/….jpg", "address": "…",
                 "latitude": "19.33450000", "longitude": "-81.38170000" } }
  ]
}
```
- Dates are `YYYY-MM-DD` strings. Send `null` or `""` to clear one in PUT.
- `name` defaults to "My itinerary" if omitted on create.
- **`items` in PUT replaces the whole list in the order given.** That's how the
  edit screen saves reordering, removals and visit-date changes: keep the
  list in local state and send all of it on Save.
- Every place has an `address` (admins must enter one); the map uses it
  (§4). `latitude`/`longitude` are optional extras: strings (DECIMAL) or `null`.
- Validation errors are 400 with a readable `message`; a missing or someone
  else's itinerary is 404.

### 3.2 Screens

- **My Passport (logged in):** list of itineraries (name, dates, place count,
  thumbnails from `items[].place.featured_image`) + "New itinerary".
- **Itinerary page:** two columns on desktop (stacked on mobile): left, the
  ordered places (drag to reorder, remove, date picker per place, rename,
  trip dates, Save / Delete itinerary); right, the map (§4).
- **Add to itinerary** button on place/listing pages:
  - logged in: pick an existing itinerary (`GET /user/itineraries`) → `POST /:id/items`,
    or "New itinerary" → `POST /user/itineraries` with that one item.
    Use `is_in_itinerary` from list/detail responses to show an "Added" state.
  - guest: add to the local draft (§3.3).

### 3.3 Guest flow: build first, log in to save

Guests can open My Passport and add places without an account:

1. Keep a **draft** in `localStorage` (e.g. key `mp_itinerary_draft`):
   `{ name, start_date, end_date, items: [{ place_id, visit_date, place: {…snapshot for display…} }] }`.
   Enforce the 20-place limit and no-duplicates on the client too. The draft
   page works exactly like the itinerary page (list + map) from the snapshot.
2. **Save** (or any action that needs an account) → if not logged in, open the
   **login popup** (with "Create account" and "Forgot password" links) and keep
   the draft.
3. After a successful login (login popup or verify dialog): if a draft exists,
   `POST /user/itineraries` with it (only `name`, dates and
   `items[{ place_id, visit_date }]`), clear the draft on 201, and navigate to
   the new itinerary. If the POST fails with 400 (e.g. a place was
   unlisted meanwhile), keep the draft and show the message.
4. If they choose "Create account" in the popup: after register they must
   verify by email first. The verify link opens in the same browser, so the
   verify dialog will find the draft in `localStorage` and save it (step 3).
5. On a 401 while editing a saved itinerary (session expired), keep unsaved
   edits in memory, show the login popup, then retry the PUT.

## 4. Map: keep Google cost at (effectively) zero

Cost is the top priority here, so stick to these rules.

**Use only:**
1. **Maps Embed API** (an `<iframe>`) for the map with pins and the route.
   Google doesn't charge for it (it still needs an API key).
2. **Maps URLs** (plain `https://www.google.com/maps/...` links, no key)
   for "Get directions" buttons. They open Google Maps, also free.

**Do not use** the Maps JavaScript API, Directions/Routes API, Places API,
Geocoding API or Distance Matrix. These are billed per call or per map load.
We never need them: every place is an admin listing with an address, and the
free Embed map and Maps URLs locate an address themselves. Nothing has to
be searched or geocoded by us.

### 4.1 Map panel (iframe)

Each stop is identified by a **location string** built from the place:

```js
const stop = (p) => encodeURIComponent(`${p.name}, ${p.address}`);
```

Name + address gives Google the best match (e.g. "Rum Point, Rum Point Dr,
North Side"). Google's docs accept a place name/address for **every** stop
(origin, destination and waypoints), so this is the documented, safe format.
The Embed map resolves the address itself, still free.

- 0 places: show a placeholder, no iframe.
- 1 place: `https://www.google.com/maps/embed/v1/place?key=KEY&q=STOP`
- 2+ places, route through all stops in order:
  `https://www.google.com/maps/embed/v1/directions?key=KEY&origin=STOP_1&destination=STOP_N&waypoints=STOP_2|STOP_3&mode=driving`
  (first stop = `origin`, last = `destination`, the rest are `waypoints` in
  order, `|`-separated, each one URL-encoded). The map shows lettered pins
  A, B, C… and the route.

Notes:
- If a pin lands in the wrong spot for some listing, the fix is on the admin
  side (a more complete address), not on the frontend.
- `loading="lazy"` on the iframe, and render it only when the panel is
  visible (e.g. behind a "Show map" toggle on mobile). Only rebuild `src`
  after the user **saves** (or on a short debounce), not on every drag.
- Google's docs (checked 2026-10-12): the Embed API is "free to use with
  unlimited requests", and directions mode takes "up to 20 waypoints". The
  backend caps itineraries at 20 places (origin + destination + ≤18
  waypoints), so the whole route always fits one embed.
- API key: a **separate browser key** restricted to **Maps Embed API only**
  and to the site's HTTP referrers. Put it in the frontend env (e.g.
  `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`); the backend doesn't need it.
- Let the user pick the travel mode (`driving` default, `walking`) if useful.
  It's just a URL parameter.

### 4.2 Directions A → B (links, no API)

Between consecutive places in the list, show a small "Directions" link,
using the same `STOP` strings:
`https://www.google.com/maps/dir/?api=1&origin=STOP_A&destination=STOP_B&travelmode=driving`
(open in a new tab). Optionally add "Open whole route in Google Maps" with
`&waypoints=STOP_2|STOP_3`. Google Maps limits waypoints in these links
(fewer on mobile), so the per-leg links are the reliable option.

## 5. Admin panel

The admin panel has its own note: [admin-handoff.md](admin-handoff.md).
