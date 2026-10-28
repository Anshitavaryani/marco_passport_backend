# Admin panel handoff

This note lists what the **admin panel** must change, plus a reference of the
admin API as it stands now. The public site has its own note:
[frontend-handoff.md](frontend-handoff.md).

Base URL: `<API>/api/v1`. Every response is `{ success, status, message, data }`;
show `message` on errors. A request body that isn't valid JSON is a 400; one
over the size limit (100 KB, or 2 MB for magazine saves) is a 413.

## 1. What changed (do these first)

### 2026-10-28: magazines, and Editors on the blog

| Area | Change | What to do |
|---|---|---|
| Roles | Editors (`EDTR`) can now create, edit and delete **blog posts and blog categories** (they used to get 401) and magazines. Every other admin endpoint still refuses them with 401. | Nothing: the admin already shows Editors only Dashboard, Magazines, Blog and Blog Categories. |
| Magazines | New `/magazine/admin` endpoints: list, get, create, update, delete (§4 "Magazines"). Saves send the `version` they loaded; **409** when someone else saved the issue first. | The Magazines screen works once this is deployed. |
| Magazines | New public `GET /magazine` and `GET /magazine/:slug` for the site ([frontend-handoff.md](frontend-handoff.md) §5). | |
| Errors | A body over the size limit is now **413** "The request is too large." (it was a 500). | Show `message`. |

### 2026-10-24: explore items, coordinates, newsletter, users, passports, admins

| Area | Change | What to do |
|---|---|---|
| Explore | Places to visit and businesses are one list: `GET /explore/admin` returns **both types** unless you pass `type` (it used to default to `business`), plus `counts` per type, `passport_count` per row, and filters for category, missing coordinates and featured. | One "Explore items" screen with type tabs (§4). |
| Explore | **`latitude` and `longitude` are required** on create (400 "Set the location on the map: latitude and longitude are required."). On update they can be moved but not cleared. | Make the admin set a map pin; send both. Existing rows without coordinates show up under `coordinates=missing`. |
| Explore | Create/update accept a **JSON body**. Photos: upload each one with `POST /blog/upload-image`, then send `featured_image` and `gallery_images` (array of paths). Multipart still works. | Prefer JSON: lists stay real arrays and fields can be cleared. |
| Explore | `highlights`, `insider_tips` (string arrays) and `what_to_expect` (`[{title, description}]`) are cleaned and stored as real JSON arrays, whether sent as arrays or JSON strings. Empty lists become `null`. | Older rows may still hold a JSON-encoded string; parse it when reading. |
| Explore | On update, `""` clears optional fields (`about, phone, email, hours, fees, parking, best_time_to_visit, website_url, neighborhood, price_level, top_pick_rank`). Changing `type` without `category_ids` drops the categories of the old type. | |
| Newsletter | New admin endpoints: list, CSV export, delete (§4). | New "Newsletter" screen. |
| Users | `GET /admin/user` lists **every** member (it used to skip members without a review or passport), with `status` filter, `sort` and `status_counts`. New `PUT /admin/user/:id` edits name, email, mobile and status (verify or block). | Users screen: filters, edit, block (§4). |
| Passports | New `GET /admin/passports` and `/admin/passports/:id`: every member's passports with their owner. | New "Passports" screen. |
| Dashboard | New `GET /admin/stats`. | Replace the dashboard placeholder. |
| Admins | Super admins **can now create and promote other super admins**. Guards: nobody can change their own role or delete themselves, and the last super admin can't be demoted or deleted. Email and department can be edited. | Show Super Admin in the role picker; handle the 400 messages. |
| Admins | Admin responses no longer include the password hash, OTP or reset token, and now include `admin_department`. | |
| Admins | If the invitation email can't be sent, the admin isn't created: **503** with a message (it used to leave an account nobody could log in to). | Show `message`; the super admin can retry. |
| Roles | Permission checks use the admin's **current** role, so a role change applies to their next request (it used to wait until their 5-day token expired). | |
| Business requests | New `PUT /business-submission/:id` `{ status }`. | Approve / reject buttons. |

### Earlier

| Area | Change | What to do |
|---|---|---|
| Payments | All `/payment/*` endpoints removed (incl. dashboard `/payment/count`, `/payment/sum`). The app has no payments. | Remove payment widgets, screens and Stripe code. |
| Passport | One flat list per user became **many passports** per user (named trip plans with ordered places). The users endpoints return them under the keys `itineraries_count` / `itineraries`, which keep those names. | Users screens: see §4 "Users". |
| Auth | `GET /admin/user`, `GET /admin/user/:id`, `POST /admin/user`, `GET /explore/admin`, `GET /explore/admin/:id` and `GET /business-submission` **require the admin token**. | Make sure these calls send `x-access-token`. |
| Places | **`address` is required** on create (400 without it) and can't be blanked on update. | Mark Address required in the form. |
| Uploads | Only the **`images`** form field is accepted (≤10 files, ≤25 MB each, jpeg/jpg/png/gif/webp). Bad uploads are **400 with a message**. | Use `images` everywhere; show `message` on upload errors. |
| Uploads | Login is checked **before** a file is accepted. | Nothing; just send the token as usual. |
| Roles | Permissions are matched on the role's **`abbreviation`**, not its display name. | Treat `abbreviation` as a fixed code in the roles screen (§4). |

## 2. Auth

- Header `x-access-token: <token>`. Admin tokens last **5 days**.
- No token → **400** "Access denied: No token provided". Invalid/expired token,
  deactivated admin, or a role that's not allowed → **401**. On any 401,
  send the admin back to the login screen.

| Endpoint | Body | Notes |
|---|---|---|
| `POST /admin/auth/login` | `{ email, password }` | → `{ name, email, token }` |
| `GET /admin/auth/profile` | – | → `{ id, name, email, role_id, department_id, admin_role: { id, name, abbreviation }, admin_department: { id, name } }`. Use `admin_role.abbreviation` to decide which menu items to show (§3). |
| `POST /admin/auth/change-password` | `{ old_password, new_password, confirm_password }` | logged in |
| `POST /admin/auth/otp` | `{ email }` | forgot password, step 1: emails a 6-digit code (valid 5 min) |
| `POST /admin/auth/verify-otp` | `{ email, otp, otp_type: "forgot_password" }` | step 2 → `{ token }` |
| `POST /admin/auth/forgot-password` | `{ email, password, confirm_password, token }` | step 3 |

Admin forgot-password still uses this **OTP** flow (users moved to email
links). It may switch to a link flow later; keep it as is for now.

## 3. Role tiers

Roles are seeded with these abbreviations: `SUP_ADM` (Super Admin), `ADM`
(Admin), `SUB_ADM` (Sub Admin), `ENG` (Engineer), `EDTR` (Editor). Only these
five can be given to an admin account.

| Tier | Roles | Can use |
|---|---|---|
| Super admin | `SUP_ADM` | everything below + admin accounts (`/admin/auth/register`, `/all`, `/:id`) + roles (`/role`) |
| Admin | `SUP_ADM`, `ADM`, `SUB_ADM` | dashboard stats, members, passports, explore items, place categories, departments, contact messages, newsletter, business requests |
| Content | the above + `EDTR` | blog posts, blog categories, magazines |
| FAQ | the above + `ENG`, `EDTR` | FAQs |
| Any logged-in admin | all | profile, change password, `POST /blog/upload-image` |

So an Editor (`EDTR`) works on the blog, magazines and FAQs only, and an
Engineer (`ENG`) on FAQs only.

Hide menu items the logged-in admin's tier can't use. The API refuses them
with 401 anyway.

## 4. API reference by screen

### Dashboard (admin)
`GET /admin/stats` →
```
{ users: { total, verified, pending, blocked, new_30d },
  passports: { total, new_30d, owners, places_saved },
  explore: { total, place, business, featured, missing_coordinates },
  reviews: { total, average_rating },            // 1 decimal, null with no reviews
  newsletter: { total, new_30d },
  contact_messages: { total, new_30d },
  business_requests: { total, pending },
  blogs: { total },
  top_passport_creators: [{ id, email, name, passports_count, places_count, last_passport_at }],  // top 5
  most_saved_places: [{ id, name, type, slug, saves }],                                          // top 5
  recent_passports: [{ id, name, created_at, item_count, owner: { id, email, name } }] }         // latest 5
```
Counts are of live rows (deleted members, listings, reviews and messages
aren't counted); `new_30d` is the last 30 days. `places_saved` counts
passport stops.

### Admin accounts (super admin)
- `POST /admin/auth/register` `{ name, email, role_id, department_id }`: any of
  the five admin roles, **including Super Admin**. The backend generates a
  temporary password and **emails** it; there's no password field. If the
  email can't be sent → **503** and nothing is saved. `role_id` of a non-admin
  role (e.g. `USR`) → 400 "This role can't be given to an admin.".
- `GET /admin/auth/all` (oldest first), `GET /admin/auth/:id` →
  `{ id, name, email, role_id, department_id, is_active, created_at, updated_at, admin_role: { id, name, abbreviation }, admin_department: { id, name } }`.
- `PUT /admin/auth/:id` `{ name?, email?, role_id?, department_id? }` → the
  same shape. 400s: "You can't change your own role. Ask another Super
  Admin.", "There must be at least one Super Admin.", "Email already taken",
  "Invalid Email", "Invalid Department Id", "This role can't be given to an
  admin.". Sending your own current `role_id` is fine.
- `DELETE /admin/auth/:id`. 400s: "You can't delete your own account.", "There
  must be at least one Super Admin.".

### Roles (super admin)
- `GET /role`, `GET /role/:id`, `POST /role` `{ name, abbreviation }`,
  `PUT /role/:id` `{ name, abbreviation }` (**both** are required together), `DELETE /role/:id`.
- Permissions follow `abbreviation`. Only `SUP_ADM`, `ADM`, `SUB_ADM`, `ENG`,
  `EDTR` grant admin-panel access. Show the abbreviation as read-only for
  existing roles, and warn before changing it. Never edit or delete the
  `USR` role: public sign-up depends on it.

### Departments (admin)
`GET /department`, `GET /department/:id`, `POST /department` `{ name }`, `PUT /department/:id` `{ name }`, `DELETE /department/:id`.

### Users (admin): site members
- `GET /admin/user?page=1&limit=15&search=<email or name>&status=ACCEPTED|PENDING|REJECTED&sort=newest|oldest|name|passports|reviews`
  (`limit` ≤ 100; the old `sortBy=ASC|DESC` still works) →
  `{ count, rows: [{ id, email, role_id, status, created_at, reviews_count, itineraries_count, user_profile: { id, name, mobile, is_active, created_at } }], status_counts: { all, ACCEPTED, PENDING, REJECTED } }`.
  Every live member is listed. `itineraries_count` is the number of passports.
  `status_counts` follow the search but not the status filter (for tabs).
- `GET /admin/user/:id` → the user (`id, email, role_id, status, created_at, updated_at, last_login_at`) plus `user_profile`,
  `user_reviews[{ id, place_id, rating, comment, created_at, review_place{ id, name, type } }]` (newest first) and
  `itineraries[{ id, name, start_date, end_date, created_at, items[{ id, place_id, position, visit_date, place{ id, name, type } }] }]`
  (the member's passports, newest first; items in visiting order).
  `last_login_at` is `null` when no login has been recorded.
- `PUT /admin/user/:id` `{ name?, email?, mobile?, status? }` → the same shape
  as `GET /admin/user/:id`. `status` can only be `ACCEPTED` (active; also
  verifies a `PENDING` member by hand) or `REJECTED` (blocked: logged out at
  once and can't log in). `""` clears `mobile`. 400s: "Email already taken",
  "Please enter a valid email address.", "Name can't be empty.".
- Delete (soft): `POST /admin/user` `{ user_id: [1, 2, 3] }`.
- `status`: `PENDING` = signed up but hasn't verified their email (deleted
  automatically 24h after sign-up, so it can't be set by an admin);
  `ACCEPTED` = active; `REJECTED` = blocked.

### Passports (admin)
- `GET /admin/passports?search=&user_id=&sort=newest|updated|places&page=&limit=` →
  `{ total, page, limit, total_pages, passports: [{ id, name, start_date, end_date, created_at, updated_at, item_count, owner: { id, email, deleted, user_profile: { name } } }] }`.
  `search` matches the passport name and the owner's email or name. Passports
  of deleted members are included with `owner.deleted: true`.
- `GET /admin/passports/:id` → the same fields plus
  `items: [{ id, position, visit_date, place: { id, name, type, slug, address, featured_image, deleted } }]`
  in visiting order (`place.deleted`: unlisted since it was added).
- Read-only: members edit their own passports on the site.

### Explore items (admin): places to visit and businesses
`type` is `place` (beaches, parks, sights) or `business`. The site shows both
together on /explore.

- `GET /explore/admin?type=all|place|business&search=&category_id=&coordinates=missing&featured=true|false&sort=updated|newest|name|rating|saves&page=&limit=` →
  `{ total, page, limit, total_pages, places[], counts: { all, place, business } }`.
  Defaults: every type, sorted by last update, 15 per page (`limit` ≤ 100).
  `search` matches the name, address and neighborhood. Each row is the full
  listing plus `categories[{ id, name, slug, type }]` (all of them, even when
  filtering by category) and `passport_count` (how many passports it's in).
  `counts` follow every filter except `type` (for the type tabs).
- `GET /explore/admin/:id` (same row shape), `DELETE /explore/admin/:id`.
- `POST /explore/admin`, `PUT /explore/admin/:id` (JSON, or multipart if uploading images in the same request):
  - required on create: `name`, `short_description`, **`address`**, **`latitude`**, **`longitude`**; `type` defaults to `business`
  - coordinates: numbers or numeric strings, latitude −90…90, longitude −180…180, not 0,0; stored with 8 decimals.
  - optional: `slug` (auto from name; on update, send the current slug to keep the URL when renaming), `about`,
    `highlights` (array of strings), `what_to_expect` (array of `{ title, description }`), `insider_tips`
    (array of strings), `phone`, `email`, `hours`, `fees`, `parking`,
    `best_time_to_visit`, `website_url`,
    `price_level` (`$`…`$$$$`), `neighborhood`, `is_featured`, `is_top_pick`,
    `top_pick_rank`, `category_ids` (array, or comma-separated; categories must have the same `type`)
  - images: either upload in `images` (multipart: the first file becomes `featured_image`, all of them
    `gallery_images`, replacing the old ones), or send `featured_image` / `gallery_images` (paths, e.g. from
    `POST /blog/upload-image`). The second way keeps existing photos without re-uploading them.
  - on update, `category_ids` replaces the listing's categories; `[]` removes them all.
- **Location matters:** the site's maps and passports pin each listing at its
  coordinates. Let the admin check the pin on a map and move it when the
  address search lands in the wrong spot. Google (in the admin only) may be
  used to find coordinates and prefill details; nothing about a listing's
  Google Maps profile is stored or shown on the site.
- Members can only add these admin-created listings to their passports.

### Place categories (admin; GET is public)
- `GET /place-category?type=business|place`, `GET /place-category/:id`
- `POST` / `PUT /place-category[/:id]` `{ name, type, slug?, is_active? }` + optional `images` upload (card image) or `image` path
- `DELETE /place-category/:id`

### Blogs (admin and Editors; GETs are public)
- `GET /blog?category_id=&featured=true|false`, `GET /blog/:id`, `GET /blog/category/:slug`
- `POST /blog` (required `title`, `description`, `content`; optional `category_id`, `slug`, `is_featured`, `published_at`; cover via `images` upload or `featured_image` path), `PUT /blog/:id`, `DELETE /blog/:id`
- Images inside the rich-text editor (and explore and magazine photos): `POST /blog/upload-image` with one file in `images` → `{ url }`.

### Blog categories (admin and Editors; GETs are public)
`GET /blog-category`, `GET /blog-category/:id`, `POST /blog-category` `{ name, slug? }`, `PUT /blog-category/:id`, `DELETE /blog-category/:id`.

### Magazines (admin and Editors)
An issue is an ordered list of pages, each `{ id, layout, content }`, as the
magazine builder makes them. The server stores `pages` as sent and always
returns it as a JSON array.

- `GET /magazine/admin?status=draft|published&search=&page=1&limit=12` (`limit` ≤ 100) →
  `{ total, page, limit, total_pages, magazines: [summary], counts: { all, draft, published } }`,
  most recently edited first. `search` matches the title, issue label and
  season; `counts` follow the search but not `status` (for the tabs).
  A summary is `{ id, title, slug, issue_label, season, publish_date, status, is_featured, cover_image, page_count, created_at, updated_at, updated_by_name }`;
  `updated_by_name` is null once that admin is deleted.
- `GET /magazine/admin/:id` → the full issue: the summary plus
  `masthead, tagline, description, pages, version, updated_by`. 404 "Issue
  not found." if it doesn't exist or was deleted.
- `POST /magazine/admin` → 201, the full issue (`version: 1`). Body, every field always sent:
  `{ title, slug, issue_label, season, publish_date, masthead, tagline, description, status, is_featured, cover_image, pages }`.
- `PUT /magazine/admin/:id` with the same body plus the `version` you loaded →
  the full issue with its new `version`. If someone saved it since: **409**
  "This issue was saved by someone else since you opened it."; if it was
  deleted meanwhile: 404. Those two come before any 400 about the address.
- `DELETE /magazine/admin/:id`: soft delete. Its address becomes free for
  another issue, and it stops being featured. Uploaded photos stay.

Validation (400, with a message to show as is):
- `title` required, ≤ 150 characters; `issue_label` and `season` ≤ 60,
  `masthead` ≤ 40, `tagline` ≤ 200, `description` ≤ 500. Text is trimmed and
  stored as typed, not HTML-escaped; `""` is stored as `null`.
- `slug`: lowercase letters, numbers and single hyphens, ≤ 160, not `admin`,
  and not used by another issue that isn't deleted ("Another issue already
  uses the address <slug>.").
- `status`: `draft` or `published`. Publishing needs a `publish_date`
  (`YYYY-MM-DD`) and at least 2 pages.
- `is_featured`: only on a published issue. Saving one as featured
  un-features the others.
- `pages`: 1 to 200 pages, at most 1 MB in all. Each has a unique string `id`
  (≤ 40), a `layout` (`cover`, `contents`, `letter`, `feature`, `article`,
  `text`, `quote`, `photo`, `gallery`, `guide`, `ad_half`, `ad_cards`,
  `image_page`, `back`) and an object `content`. Content keys the server
  doesn't know are kept.
- Images (any object in `pages` with a `src`): `src` starts with `/images/`
  or `http(s)://`, `focusX`/`focusY` are 0 to 100, `alt` ≤ 200. `cover_image`
  follows the same `src` rule, ≤ 255.
- Every `link` and `website`: empty, `http(s)://…`, a site path (`/…`),
  `mailto:`, `tel:`, or a bare domain like `www.example.com`.

### FAQs (editor; GET is public)
`GET /faq`, `POST /faq` `{ question, answer }`, `PUT /faq/:id`, `DELETE /faq/:id`.

### Contact messages (admin)
`GET /contactUs` → newest first: `[{ id, name, email, subject, message, address, mobile, created_at }]`
(`name`, `subject` and `message` are null on rows saved before the form sent them).
`PUT /contactUs/:id` `{ email?, mobile?, address? }`, `DELETE /contactUs/:id`.

### Newsletter (admin; sign-up is public)
- `GET /newsletter?search=&source=footer|blog|none&page=&limit=` (25 per page, ≤ 100) →
  `{ total, page, limit, total_pages, subscribers: [{ id, email, source, created_at }], sources: [{ source, count }] }`,
  newest first. `source=none` matches sign-ups with no source (`source: null`).
  `sources` counts every subscriber, whatever the filters.
- `GET /newsletter/export` (same `search` / `source` filters) → a CSV download
  (`email,source,subscribed_at`), not JSON. Fetch it with the token as a blob;
  the file name is in `Content-Disposition`.
- `DELETE /newsletter/:id` (e.g. for an unsubscribe request).
- Public: `POST /newsletter` `{ email, source? }`.

### Business requests (admin)
`GET /business-submission` → newest first:
`[{ id, business_name, contact_name, email, phone, website, plan: full_page|half_page|business_card, amount, additional_details, status: pending|approved|rejected, created_at }]`.
`PUT /business-submission/:id` `{ status: "pending" | "approved" | "rejected" }` → the updated request.

### Reference data (public)
`GET /country`, `/state`, `/city` (`?page=&limit=&sortBy=`) and `/:id` variants.

## 5. Images

Uploaded files are served from the API host at `/images/<filename>`.
API responses hold that path (e.g. `/images/images-1791…png`), so prefix it
with the API origin when displaying.
