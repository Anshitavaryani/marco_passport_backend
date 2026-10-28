# Magazines and the Editor role: what the backend needs (2026-10-28)

The admin panel now has a magazine builder (sidebar: Content → Magazines)
and an Editor role that can work on magazines and the blog and nothing else.
The admin is built against the endpoints below, which don't exist yet. Until
they do, the Magazines screen says "Magazines aren't on the server yet".

The admin side lives in Marco_passport_admin:

- `src/services/Api/MagazineApi.ts`: the request and response types used below
- `src/components/magazine-editor/layouts.ts`: the page layouts and their fields
- `src/magazine/`: the page renderer and flipbook (no admin imports; the site
  can copy it as is, see section 6)

Work in this order:

1. Content-editor guard on blog, blog categories and magazines (small; do it
   before anyone creates an Editor account)
2. `magazines` table, model and migration
3. Admin endpoints, plus a bigger JSON body limit for them
4. Public endpoints for the site
5. Later: analytics, unused image cleanup

## 1. Editor role (EDTR): blog and magazines only

The role already exists (`roles.sql`, id 5, `EDTR`). Super Admins assign it
in the admin under Admins → Add admin (or Edit) → Role: Editor. No backend
change is needed for that.

**The problem:** blog and blog-category writes use `isAdmin`
(SUP_ADM, ADM, SUB_ADM). The admin now shows Editors the Blog, Blog
Categories and Magazines screens, so an Editor saving a blog post gets 401.
The admin treats every 401 as an expired session and signs the person out.

**Request:** a new guard in `src/middlewares/role.middleware.js`:

```js
// Blog and magazines: every admin role plus Editors, who can do only this.
const isContentEditor = allowRoles([
  rolesTypes.SUP_ADM,
  rolesTypes.ADM,
  rolesTypes.SUB_ADM,
  rolesTypes.EDTR,
]);
```

Use it for:

- `blog.route.js`: `POST /`, `PUT /:id`, `DELETE /:id`
- `blogCategory.route.js`: `POST /`, `PUT /:id`, `DELETE /:id`
- every `/magazine/admin` route (section 3)

Don't reuse `isEditor`: it includes ENG, and Engineers only manage FAQs.
Leave every other route as it is. Editors should keep getting 401 from
explore, users, passports, newsletter, contact messages, business
submissions, stats and admins. The admin never calls those for an Editor
(the dashboard only fetches stats for admin roles), so the 401s only matter
if someone calls the API directly.

`POST /blog/upload-image` already accepts any logged-in admin. The magazine
editor uses it for photos and for PDF pages, so keep that as it is.

## 2. The `magazines` table

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED, PK, auto increment | |
| `title` | VARCHAR(150) NOT NULL | admin caps it at 120 |
| `slug` | VARCHAR(160) NOT NULL | not unique on its own |
| `slug_active` | VARCHAR(160) NULL, UNIQUE | same pattern as `blogs`: mirrors `slug`, NULL once deleted |
| `issue_label` | VARCHAR(60) NULL | "Issue 07"; admin caps at 40 |
| `season` | VARCHAR(60) NULL | "Fall 2026"; admin caps at 40 |
| `publish_date` | DATE NULL | the date printed on the issue |
| `masthead` | VARCHAR(40) NULL | name on the cover, default "MARCO"; admin caps at 14 |
| `tagline` | VARCHAR(200) NULL | admin caps at 120 |
| `description` | VARCHAR(500) NULL | for lists and SEO; admin caps at 400 |
| `status` | ENUM('draft','published') NOT NULL DEFAULT 'draft' | |
| `is_featured` | BOOLEAN NOT NULL DEFAULT false | at most one, and only a published issue |
| `cover_image` | VARCHAR(255) NULL | path of page 1's photo, for lists |
| `pages` | JSON NOT NULL | the issue itself (section 4) |
| `page_count` | SMALLINT UNSIGNED NOT NULL DEFAULT 0 | set by the server from `pages.length` |
| `version` | INT UNSIGNED NOT NULL DEFAULT 1 | +1 on every save (section 3, PUT) |
| `created_by`, `updated_by`, `deleted_by` | INT NULL | admin ids |
| `created_at`, `updated_at`, `deleted_at` | DATETIME | soft delete, like `blogs` |

Index `(status, publish_date)` for the public list.

Always return `pages` as a JSON array, never as a string. mysql2 parses JSON
columns already; just don't `JSON.stringify` it on the way out.

## 3. Admin endpoints

All under `/api/v1/magazine/admin`, behind
`[adminAuthMiddleware.validateJWTtoken, roleMiddleware.isContentEditor]`,
with the usual `{ success, status, message, data }` envelope. Register the
admin routes **before** the public `/:slug` route, and refuse the slug
`admin` so it can never collide.

A **summary** is a row without `pages`, `masthead`, `tagline`,
`description` and `version`, plus `updated_by_name` (the `admins.name` of
`updated_by`, LEFT JOIN, null if that admin is gone):

```
{ id, title, slug, issue_label, season, publish_date, status, is_featured,
  cover_image, page_count, created_at, updated_at, updated_by_name }
```

A **full issue** is every column except `slug_active`, `created_by`,
`deleted_by` and `deleted_at`, plus `updated_by_name`.

### `GET /magazine/admin?status=&search=&page=1&limit=12`

- `status`: `draft` or `published`; omitted means both
- `search`: matches `title`, `issue_label` and `season` (LIKE)
- order: `updated_at DESC` (most recently edited first)
- `counts` respect `search` but not `status`, so each tab shows what it
  would contain

```
data: { total, page, limit, total_pages, magazines: [summary], counts: { all, draft, published } }
```

### `GET /magazine/admin/:id`

The full issue. 404 if it doesn't exist or was deleted.

### `POST /magazine/admin`

Body (every field is always sent; empty strings arrive as `null`):

```
{ title, slug, issue_label, season, publish_date, masthead, tagline,
  description, status, is_featured, cover_image, pages }
```

Creates the issue with `version = 1`, `page_count = pages.length` and
`created_by`/`updated_by` from the token. Returns the full issue (201).

### `PUT /magazine/admin/:id`

Same body plus the `version` the admin loaded. If it doesn't match the row,
refuse the save with **409** (message: "This issue was saved by someone
else since you opened it."). That stops two people editing the same issue
from overwriting each other: on a 409 the admin tells the person to reload
and keeps their edits in the browser so they can restore them.

Check and update in one statement so two saves can't both pass:

```sql
UPDATE magazines SET ..., version = version + 1, updated_by = ?
WHERE id = ? AND version = ? AND deleted_at IS NULL
```

If no row changed, answer 404 when the issue is gone, otherwise 409.
On success return the full issue with its new `version` (200).

### `DELETE /magazine/admin/:id`

Soft delete: set `deleted_at` and `deleted_by`, set `slug_active` and
`is_featured` back to NULL/false. Returns 200.

### Validation (400, with a message the admin can show as is)

- `title`: required after trimming, at most 150 characters
- `slug`: required, `^[a-z0-9]+(-[a-z0-9]+)*$`, at most 160, not `admin`.
  Unique among issues that aren't deleted: answer **400** "Another issue
  already uses the address <slug>." Don't use 409 here; the admin reserves
  409 for the version check.
- `status`: `draft` or `published`
- `publish_date`: `YYYY-MM-DD` or null; required when publishing (the admin
  fills in today's date if it's empty)
- `is_featured`: only allowed when published. When an issue is saved as
  featured, clear `is_featured` on every other issue in the same
  transaction. Unpublishing sends `is_featured: false`.
- `pages`: an array of 1 to 200 pages; at least 2 to publish. Each page is
  `{ id, layout, content }`:
  - `id`: string, 1 to 40 characters, unique within the issue (the admin
    uses UUIDs)
  - `layout`: one of the 14 ids in section 4
  - `content`: a plain object. Keep keys you don't recognise; the admin adds
    fields over time.
- every object in `pages` with a `src` key is an image: `src` must start
  with `/images/` (from the upload endpoint) or `http(s)://` (a listing
  picked from Explore brings its own `featured_image`, which can be
  either); `focusX` and `focusY` are numbers from 0 to 100; `alt` is a
  string of at most 200
- every `link` or `website` value must be empty, an `http(s)://` URL, a site
  path starting with a single `/`, `mailto:`, `tel:`, or a bare domain like
  `www.example.com`. Refuse anything else (`javascript:` and so on).
- the whole `pages` JSON at most 1 MB. A 48-page issue with long stories is
  around 150 KB.

Text is plain text and is stored as sent. Don't HTML-escape it on save (the
admin would then show `&amp;`). The admin and the site render it as text,
never as HTML.

### JSON body limit

`app.js` uses `express.json()` with the default 100 KB limit, and a long
issue is bigger than that (413). Add a larger parser for these routes only,
**before** the global one; body-parser skips a body that's already parsed:

```js
app.use("/api/v1/magazine/admin", express.json({ limit: "2mb" }));
app.use(express.json());
```

## 4. What's inside `pages`

An issue is an ordered list of pages, and each page uses one of 14 fixed
layouts filled with content. The backend stores `pages` as a document and
doesn't need to understand layouts beyond the checks in section 3.

Page 1 is the cover. Readers see it alone, then facing pairs (2–3, 4–5…),
like a printed issue. Pages are US Letter shape (8.5 × 11), the size
standard magazine ad artwork comes in.

| Layout | What it is | Content keys (list items in brackets) |
| --- | --- | --- |
| `cover` | Cover | `image`, `headline`, `dek`, `lines`, `text` |
| `contents` | Contents, built from the issue's pages | `headline`, `intro`, `image` |
| `letter` | Editor's letter | `kicker`, `headline`, `body`, `signature_name`, `signature_role`, `portrait` |
| `feature` | Story opener over a full-page photo | `image`, `kicker`, `headline`, `dek`, `byline`, `position`, `credit` |
| `article` | Story with a photo, one or two columns | `kicker`, `headline`, `dek`, `byline`, `image_position`, `image`, `caption`, `body`, `pull_quote`, `drop_cap` |
| `text` | Text that carries a story on | `kicker`, `body`, `pull_quote`, `image`, `caption`, `drop_cap` |
| `quote` | One large quote | `quote`, `attribution`, `background`, `image` |
| `photo` | Full-page photo | `image`, `headline`, `caption`, `credit` |
| `gallery` | Photo grid | `kicker`, `headline`, `credit`, `photos` [`image`, `caption`] |
| `guide` | Places list | `kicker`, `headline`, `intro`, `items` [`name`, `text`, `details`, `link`, `image`] |
| `ad_half` | Two half-page ads | `ads` [`advertiser`, `image`, `link`] |
| `ad_cards` | Business directory | `kicker`, `headline`, `cards` [`name`, `line`, `phone`, `website`, `logo`, `artwork`] |
| `image_page` | One image as the whole page: a full-page ad, or a page designed elsewhere or imported from a PDF | `image`, `fit`, `background`, `advertiser`, `link`, `is_ad` |
| `back` | Back cover | `image`, `headline`, `text` |

The layouts listed on the contents page (`letter`, `feature`, `article`,
`photo`, `gallery`, `guide`) can also carry `hide_from_contents: true`.

- Images are `{ src, focusX, focusY, alt }`. `focusX`/`focusY` are the point
  that stays in view when the frame crops the photo.
- `body`-style text: a blank line starts a paragraph, `## ` starts a
  subheading, `**bold**` and `*italic*` work inside a paragraph.
- `guide` items picked from Explore get `link: "/explore/<slug>"`, a path on
  the site.
- Empty ad slots show a "Your business here" box that links to
  `/advertise-with-us`, so unsold space still sells.

A short example:

```json
[
  { "id": "0b6f6c1e-3d4a-4f7e-9b1a-2c5d8e9f0a11", "layout": "cover", "content": {
      "image": { "src": "/images/images-1793199727395-4650f3fe9b88.jpg", "focusX": 50, "focusY": 40, "alt": "Marco Island beach at sunset" },
      "headline": "The quiet season", "dek": "When the crowds thin and the island exhales",
      "lines": "Five beaches the locals love\nMangroves at first light", "text": "light" } },
  { "id": "5a2c9d47-8e1b-4c3f-a6d2-7f0e1b2c3d44", "layout": "contents", "content": { "headline": "In this issue" } },
  { "id": "c8e1f2a3-4b5c-4d6e-8f7a-9b0c1d2e3f55", "layout": "article", "content": {
      "kicker": "Field guide", "headline": "Five beaches the locals love",
      "body": "Tigertail is the island's wild side...\n\n## When to go\n\nGo at low tide...",
      "pull_quote": "Go at low tide and wade across.", "image_position": "top", "drop_cap": true } }
]
```

## 5. Public endpoints (for the site)

No auth. Only published issues that aren't deleted.

### `GET /magazine?page=1&limit=12`

Newest `publish_date` first (then `id`).

```
data: { total, page, limit, total_pages,
        magazines: [{ id, title, slug, issue_label, season, publish_date, masthead,
                      tagline, description, cover_image, page_count, is_featured }],
        featured: <same shape> | null }
```

`featured` is the issue with `is_featured`, or the newest one if none is
marked.

### `GET /magazine/:slug`

The full issue for the reader: the list fields above plus `pages`. 404
"Issue not found" for drafts, deleted issues and unknown slugs.

## 6. The site, for whoever wires it up

The site's `/magazine` pages read static data today
(`tmp-frontend/src/data/magazines.ts`). Mapping to the API:

| Site field | From the API |
| --- | --- |
| `issue` | `issue_label` |
| `date` | `publish_date`, formatted |
| `pages` | `page_count` |
| `cover` | `cover_image` with the image host in front |
| `letter` | paragraphs of the first `letter` page's `body` |
| `sections` | the contents entries (`contentsEntries(pages)` in `src/magazine/spreads.ts`) with each page's `image` |
| `featured` | `is_featured`, or `featured` from the list |
| `archived` | no such flag; show older issues as the archive by date |

For the reader, copy `Marco_passport_admin/src/magazine/` into the site and
point its CSS variables (`--color-navy`, `--color-gold` and so on, at the top
of `magazine.css`) at the site's colours. It renders pages exactly as the
admin shows them, flips spreads on wide screens and shows one page at a
time on phones. Contents entries and ads are already clickable.

What readers of digital magazines expect (from FlippingBook, Issuu and
Publuu), still to build on the site: a link to any page
(`/magazine/<slug>?page=5`), page thumbnails, zoom on phones, sharing, and
counts of page views and ad clicks for advertisers.

## 7. Later

- **Analytics:** `POST /magazine/:slug/events` with
  `{ type: "page_view" | "ad_click", page, link }`, rate limited, summed per
  issue, page and day. Advertisers ask for these numbers.
- **Unused images:** photos removed from pages stay in
  `public/uploads/images`. A weekly job could delete files that no magazine,
  blog post or listing references and that are older than 30 days. Don't
  delete files when an issue is deleted; another issue may use them.
- **Selling ad space:** `image_page` and `ad_half` already store an
  `advertiser` name (never shown on the page). Business requests' `plan`
  could later point at these slots.

## Checking it with the admin

1. Magazines → New issue → Save: the address bar changes to
   `/magazines/<id>` (POST).
2. Edit and save again (PUT with `version`).
3. Open the same issue in two tabs and save in both: the second one shows
   "Someone else saved this issue meanwhile".
4. Two issues with the same address: the second save shows your 400 message.
5. Publish, mark as featured, then unpublish; delete one.
6. Import a PDF (strip on the left → Import PDF pages): each page uploads
   through `/blog/upload-image`.
7. Sign in as an Editor: the sidebar has only Dashboard, Magazines, Blog and
   Blog Categories, and saving a blog post or an issue doesn't sign them out.
