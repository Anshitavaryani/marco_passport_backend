# Admin panel handoff

Backend branch: `cleanup/remove-dead-code` (marco_passport_backend). This note
lists what the **admin panel** must change, plus a reference of the admin
API as it stands now. The public site has its own note:
[frontend-handoff.md](frontend-handoff.md).

Base URL: `<API>/api/v1`. Every response is `{ success, status, message, data }`;
show `message` on errors.

## 1. What changed (do these first)

| Area | Change | What to do |
|---|---|---|
| Payments | All `/payment/*` endpoints removed (incl. dashboard `/payment/count`, `/payment/sum`). The app has no payments. | Remove payment widgets, screens and Stripe code. |
| Passport | One flat list per user became **many passports** per user (named trip plans with ordered places). The users endpoints return them under the keys `itineraries_count` / `itineraries`, which keep those names. | Users screens: see §4 "Users". |
| Auth | `GET /admin/user`, `GET /admin/user/:id`, `POST /admin/user`, `GET /explore/admin`, `GET /explore/admin/:id` and `GET /business-submission` **now require the admin token** (they were public). | Make sure these calls send `x-access-token`. |
| Places | **`address` is required** on create (400 without it) and can't be blanked on update. | Mark Address required in the place form. |
| Uploads | Only the **`images`** form field is accepted (≤10 files, ≤25 MB each, jpeg/jpg/png/gif/webp). Other fields (`videos`, `docs`, `gifs`, `songs`) are rejected. Bad uploads are now **400 with a message** (they were 500). `/videos`, `/gifs`, `/docs`, `/songs` URLs no longer exist. | Use `images` everywhere; show `message` on upload errors. |
| Uploads | Login is checked **before** a file is accepted. | Nothing; just send the token as usual. |
| Roles | Permissions are matched on the role's **`abbreviation`**, not its display name (this fixed Sub Admins being refused everywhere). | Treat `abbreviation` as a fixed code in the roles screen (§4). |
| Admins | Creating an admin with the Super Admin role is refused whether `role_id` is sent as a number or a string. | Hide Super Admin from the role picker on "Create admin". |

## 2. Auth

- Header `x-access-token: <token>`. Admin tokens last **5 days**.
- No token → **400** "Access denied: No token provided". Invalid/expired token,
  deactivated admin, or a role that's not allowed → **401**. On any 401,
  send the admin back to the login screen.

| Endpoint | Body | Notes |
|---|---|---|
| `POST /admin/auth/login` | `{ email, password }` | → `{ name, email, token }` |
| `GET /admin/auth/profile` | – | → `{ id, name, email, role_id, department_id, admin_role: { id, name, abbreviation } }`. Use `admin_role.abbreviation` to decide which menu items to show (§3). |
| `POST /admin/auth/change-password` | `{ old_password, new_password, confirm_password }` | logged in |
| `POST /admin/auth/otp` | `{ email }` | forgot password, step 1: emails a 6-digit code (valid 5 min) |
| `POST /admin/auth/verify-otp` | `{ email, otp, otp_type: "forgot_password" }` | step 2 → `{ token }` |
| `POST /admin/auth/forgot-password` | `{ email, password, confirm_password, token }` | step 3 |

Admin forgot-password still uses this **OTP** flow (users moved to email
links). It may switch to a link flow later; keep it as is for now.

## 3. Role tiers

Roles are seeded with these abbreviations: `SUP_ADM` (Super Admin), `ADM`
(Admin), `SUB_ADM` (Sub Admin), `ENG` (Engineer), `EDTR` (Editor).

| Tier | Roles | Can use |
|---|---|---|
| Super admin | `SUP_ADM` | everything below + admin accounts (`/admin/auth/register`, `/all`, `/:id`) + roles (`/role`) |
| Admin | `SUP_ADM`, `ADM`, `SUB_ADM` | users, places, place & blog categories, blogs, departments, contact messages, business submissions |
| Editor | the above + `ENG`, `EDTR` | FAQs |
| Any logged-in admin | all | profile, change password, `POST /blog/upload-image` |

Hide menu items the logged-in admin's tier can't use. The API refuses them
with 401 anyway.

## 4. API reference by screen

### Admin accounts (super admin)
- `POST /admin/auth/register` `{ name, email, role_id, department_id }`: the
  backend generates a temporary password and **emails** it to the new admin.
  There's no password field.
- `GET /admin/auth/all`, `GET /admin/auth/:id`, `PUT /admin/auth/:id` `{ name?, email?, role_id? }`, `DELETE /admin/auth/:id`.

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
- `GET /admin/user?page=1&limit=15&sortBy=ASC|DESC&search=<email or name>` →
  `{ count, rows: [{ id, email, role_id, status, created_at, reviews_count, itineraries_count, user_profile: { id, name, mobile, is_active, created_at } }] }`.
  `itineraries_count` is the number of passports the member has.
  **Note:** the list only includes members with at least one review or
  passport (existing backend behaviour).
- `GET /admin/user/:id` → the user plus `user_profile`,
  `user_reviews[{ id, place_id, rating, comment, created_at, review_place{ id, name, type } }]` and
  `itineraries[{ id, name, start_date, end_date, created_at, items[{ id, place_id, position, visit_date, place{ id, name, type } }] }]`
  (the member's passports; items in visiting order by `position`).
- Delete (soft): `POST /admin/user` `{ user_id: [1, 2, 3] }`.
- `status`: `PENDING` = signed up but hasn't verified their email (deleted
  automatically after 24h); `ACCEPTED` = active.

### Places / listings (admin)
`type` is `business` (shown on /explore) or `place` (shown on /places).

- `GET /explore/admin?type=business|place&search=&category_id=&page=&limit=` →
  `{ total, page, limit, total_pages, places[] }` (defaults to `type=business`).
- `GET /explore/admin/:id`, `DELETE /explore/admin/:id`.
- `POST /explore/admin`, `PUT /explore/admin/:id` (multipart if uploading images):
  - required on create: `name`, `short_description`, **`address`**; `type` defaults to `business`
  - optional: `slug` (auto from name), `about`, `highlights` (array of strings),
    `what_to_expect` (array of `{ title, description }`), `insider_tips`
    (array of strings), `phone`, `email`, `hours`, `fees`, `parking`,
    `best_time_to_visit`, `website_url`, `latitude`, `longitude`,
    `price_level` (`$`…`$$$$`), `neighborhood`, `is_featured`, `is_top_pick`,
    `top_pick_rank`, `category_ids` (array or comma-separated; categories must have the same `type`)
  - images: upload in `images`. The first file becomes `featured_image` and all
    of them become `gallery_images`. Without an upload you can send
    `featured_image` / `gallery_images` (paths) instead.
  - on update, `category_ids` replaces the place's categories.
- **Address matters:** members' passport maps pin each place using
  "name, address". Ask for a complete address (street, area, island). If a
  pin shows up in the wrong spot, a fuller address fixes it.
  Latitude/longitude are optional.
- Members can only add these admin-created places to their passports.

### Place categories (admin; GET is public)
- `GET /place-category?type=business|place`, `GET /place-category/:id`
- `POST` / `PUT /place-category[/:id]` `{ name, type, slug?, is_active? }` + optional `images` upload (card image) or `image` path
- `DELETE /place-category/:id`

### Blogs (admin; GETs are public)
- `GET /blog?category_id=&featured=true|false`, `GET /blog/:id`, `GET /blog/category/:slug`
- `POST /blog` (required `title`, `description`, `content`; optional `category_id`, `slug`, `is_featured`, `published_at`; cover via `images` upload or `featured_image` path), `PUT /blog/:id`, `DELETE /blog/:id`
- Images inside the rich-text editor: `POST /blog/upload-image` with one file in `images` → `{ url }`.

### Blog categories (admin; GETs are public)
`GET /blog-category`, `GET /blog-category/:id`, `POST /blog-category` `{ name, slug? }`, `PUT /blog-category/:id`, `DELETE /blog-category/:id`.

### FAQs (editor; GET is public)
`GET /faq`, `POST /faq` `{ question, answer }`, `PUT /faq/:id`, `DELETE /faq/:id`.

### Contact messages (admin)
`GET /contactUs`, `PUT /contactUs/:id` `{ email?, mobile?, address? }`, `DELETE /contactUs/:id`.

### Business submissions (admin)
`GET /business-submission` → newest first:
`[{ id, business_name, contact_name, email, phone, website, plan: full_page|half_page|business_card, amount, additional_details, status: pending|approved|rejected, created_at }]`.
There's no endpoint to change `status` yet, so show the list read-only.

### Reference data (public)
`GET /country`, `/state`, `/city` (`?page=&limit=&sortBy=`) and `/:id` variants.

## 5. Images

Uploaded files are served from the API host at `/images/<filename>`.
API responses hold that path (e.g. `/images/images-1791…png`), so prefix it
with the API origin when displaying.
