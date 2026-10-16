# Backend requests from the frontend (2026-10-12)

Written for: whoever works on marco_passport_backend next. The public site
changed in ways that work today but lean on the backend in a few places.
Ordered by importance. Nothing here blocks the current release.

## 1. One combined, server-filtered Explore endpoint (recommended)

**What changed on the site:** `/places` and `/explore` were merged into one
`/explore` page showing places to visit and businesses together, with a type
switch (All / Places to visit / Businesses), grouped category filters,
price, minimum rating, featured-only, search, sort and pagination.

**How it works now:** the frontend calls both list endpoints with
`limit=500` and filters, sorts and paginates on the client:

```
GET /explore?limit=500          (type=business)
GET /explore/places?limit=500   (type=place)
```

This works while the catalog is small, but every visit downloads every
listing, and it silently stops at 500 per type.

**Request:** one endpoint that does it on the server, for example

```
GET /explore/all?type=all|place|business
                &category_id=1,4      (any of)
                &price_level=$,$$     (any of)
                &min_rating=4
                &featured=true
                &search=beach
                &sort=featured|rating|name
                &page=1&limit=12
```

Response: the usual `{ total, page, limit, total_pages, places }`, plus
`counts: { place, business }` (for the type switch) and the categories
present in the result with counts:
`categories: [{ id, name, slug, type, count }]`. Keep `is_in_itinerary`
when a user token is sent. Once it exists the frontend swaps
`fetchExploreItems` (src/api/users/explore.api.ts) for it.

Also: please cap `limit` on the existing list endpoints (e.g. 100) once the
combined endpoint exists, so a single request can't ask for the whole table.

## 2. `explore?category=<slug>` is ignored

`buildListFilters` only reads `category_id`. The old business directory sent
`?category=<slug>`, which was silently ignored (so "similar businesses"
showed unrelated ones). The frontend now sends `category_id`. Either support
`category` (slug) as well, or return 400 for unknown query params, so this
can't happen silently again.

## 3. Reviews: tell the user about their own review

Ratings work end to end (create/update/delete recalculate `rating` and
`review_count`). Two gaps:

- A user who already reviewed a listing only finds out after submitting
  (400 "You've already reviewed this listing…"). Please add the current
  user's review to `GET /explore/listing/:id/reviews` when a token is sent,
  e.g. `{ reviews: [...], my_review: {...} | null }` (or a `is_mine` flag on
  each review). The site will then show "Edit your review" instead of the
  form. PUT/DELETE already exist.
- The reviewer's name comes back as `reviewer.user_profile.name`. That's
  fine; just keep it stable (the site reads exactly that path now).

`rating` is `null` (or `0`) until the first review; the site hides ratings in
that case. Please keep returning `null`, not a default like `5.0`.

## 4. Featured magazine is hard-coded on the frontend

The home page now shows a single featured magazine issue. Issues live in the
frontend repo (`src/data/magazines.ts`, `featured: true` on one entry). If
admins should pick the featured issue, we need a magazine model and
endpoints (`GET /magazine`, `GET /magazine/:slug`, one `is_featured`), plus
admin CRUD. Until then, changing the featured issue is a frontend code
change.

## 5. Uploaded images are served at their original size

The site shows API images with plain `<img>` (they're on another host, so
Next's image optimizer isn't used, and nothing gets re-compressed). Image
quality is therefore whatever is uploaded. If admins upload very large photos,
pages get slow; if they upload small ones, heroes look soft. Suggestion:
on upload, keep the original and also store a web size (e.g. 2000 px wide,
JPEG quality ~85), and return its path as `featured_image`. Not urgent.

## Not needed from the backend

- Merging places and businesses needs no schema change: they're already one
  `places` table with `type`.
- "Add to itinerary with a date" from the Explore list uses the existing
  `POST /user/itineraries/:id/items { place_id, visit_date }` and
  `POST /user/itineraries { items: [{ place_id, visit_date }] }`.
- The location map on place and listing pages uses the free Maps Embed API
  with `name, address`, same as the itinerary map. No backend change.
