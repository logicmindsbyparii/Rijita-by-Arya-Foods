# Issues Log (append-only)

Format per issue:
### [group#] short title
- **Where:** file:line
- **What:** concrete failure — what breaks, for whom, under what input
- **Fix needed:** one line
- **Status:** fixed/open + what was actually done

### [14/auth — CRITICAL] Role changes (promote/demote) had no effect on a user's existing access token until it expired
- **Where:** server/src/middleware/auth.ts `protect` — fetched the user fresh from the DB (`User.findById(decoded.id)`, specifically to check `isActive`), but then set `req.user = { id: decoded.id, role: decoded.role, email: decoded.email }` using the JWT's own stale claims instead of the just-fetched `user.role`/`user.email`.
- **What:** Every `authorize('admin','superadmin')` check across the entire API trusts `req.user.role`, which came straight from the token payload as it existed at login time — not the current database state. If a superadmin demoted an admin (e.g. offboarding an employee, or responding to a compromised account) via the Users panel, that admin's already-issued access token kept working with full admin privileges for up to `JWT_EXPIRES_IN` (default 7 days), because `protect` never re-checked their role against the database on subsequent requests. The same applied in reverse for promotions (a freshly-promoted admin wouldn't gain access until re-login) — a functional annoyance, but the demotion direction is a real security hole: role revocation silently didn't work.
- **Fix needed:** use the freshly-fetched user document's `role`/`email` instead of the JWT payload's.
- **Status:** FIXED — `req.user` now built from `user.role`/`user.email`. Verified live: seeded admin "Priya Sharma" logged in and confirmed her token could access an admin-only route (200 OK); a superadmin then demoted her to `customer` while her original token stayed unchanged; reusing that exact same old token on the next request was immediately rejected with 403 "Not authorized for this action" — no re-login, no new token needed for the fix to take effect. Restored her role to `admin` afterward to leave seed data clean.

### [11/analytics] "Top Products" revenue always showed ₹0 — the API never computed a revenue field
- **Where:** server/src/controllers/analyticsController.ts `getTopProducts` — `.select('name slug images totalSold averageRating variants.sellingPrice variants.mrp')`, no revenue field. admin/src/app/admin/analytics/page.tsx reads `formatPrice(product.revenue || product.totalRevenue || 0)`.
- **What:** The admin Analytics page's Top Products panel is built to show each product's revenue next to its name, but the API backing it never calculated or returned any such field — `product.revenue` and `product.totalRevenue` were always `undefined`, so `formatPrice(...)` always rendered ₹0 for every product regardless of how much it had actually sold. With only cancelled seed orders in the dev database this was invisible just by looking at the page (₹0 looked plausible for everything), so it took reading the controller to see no revenue aggregation existed anywhere in it.
- **Fix needed:** compute real per-product revenue from delivered orders and include it in the response.
- **Status:** FIXED — added an `Order.aggregate` (match `status: 'delivered'`, unwind `items`, match against the top products' IDs, group-sum `items.total`) and merged the result into each product as `revenue`. Verified live: placed a real order (2× a ₹549 item = ₹1098), marked it delivered via the admin API, confirmed `getTopProducts` returned `revenue: 1098` for that exact product, then deleted the test order to restore clean state.

### [8/coupons] Cancelling an order never restored the coupon's usage count — cancellations could permanently exhaust a coupon's usage limit
- **Where:** server/src/controllers/orderController.ts — `cancelOrder`, `updateOrderStatus`, and `bulkUpdateOrderStatus` all correctly restore product stock on cancel/return (and re-deduct on reactivation), but none of them touched `Coupon.usedCount`. Only `deleteOrder` (hard-delete, hitting `DELETE /admin/orders/:id`) had the restore logic — a destructive, rarely-used admin action, not the normal cancellation flow.
- **What:** `placeOrder` atomically increments the applied coupon's `usedCount` (verified race-safe in group 3). But when that order was later cancelled — by the customer via "Cancel Order", or by admin via single/bulk status update to `cancelled`/`returned` — the coupon's `usedCount` stayed incremented forever, even though the customer's discount was never actually redeemed (order never fulfilled). At scale, a coupon with e.g. `usageLimit: 200` could hit that limit purely from cancelled/abandoned orders, incorrectly blocking real customers from a coupon that should still have plenty of room.
- **Fix needed:** decrement `Coupon.usedCount` when an order transitions to cancelled/returned in all three status-change paths, and symmetrically re-increment it if an order is reactivated out of cancelled/returned (mirroring the existing stock restore/re-deduct logic already in place).
- **Status:** FIXED — added the same `$inc: {usedCount: -1}` (on cancel) / `$inc: {usedCount: 1}` (on reactivation) alongside each function's existing stock adjustment. Verified live via direct authenticated API calls: placed a real order with `WELCOME10` (44→45), cancelled it via the customer endpoint (45→44 confirmed), reactivated it via admin status update (44→45 confirmed), then cleaned up via the pre-existing delete-path restore (back to 44, the original value) — no test data left behind.

### [7/reviews] Every product review was stored and displayed as "Anonymous" regardless of who wrote it
- **Where:** server/src/controllers/contentController.ts `createReview` — `userName: req.body.userName || 'Anonymous'`; client/src/lib/api.ts `createReview` never sends a `userName` field; the JWT payload set in server/src/middleware/auth.ts only carries `{id, role, email}`, never `name`.
- **What:** Since the client never sent `userName` and the server had no other source for it, `req.body.userName` was always `undefined`, so every review — from every logged-in customer, regardless of their real account name — was saved with `userName: 'Anonymous'`. This showed up both on the public product page's review list and the admin Reviews moderation page (which displays `review.userName` and even derives the avatar initial from it), making it impossible to tell which customer wrote which review.
- **Fix needed:** look up the authenticated user's real `name` server-side (the User model already has it) instead of trusting a client-supplied field that was never being sent.
- **Status:** FIXED — `createReview` now does `const reviewer = await User.findById(req.user?.id)` and uses `reviewer?.name || 'Anonymous'`. Verified live: logged in as seeded customer "Neha Gupta", submitted a review via a direct authenticated API call (used the browser's real stored JWT), confirmed the response's `userName` was `"Neha Gupta"` — then deleted the test review via the admin API to keep seed data clean.

### [7/reviews] Review submission toast didn't mention that reviews need approval before appearing
- **Where:** client/src/app/products/[slug]/page.tsx — `reviewMutation`'s `onSuccess` toast.
- **What:** The server's own response message already says "Review submitted. Awaiting approval." (reviews default to `isApproved: false`), but the client ignored it and showed a generic "Review submitted successfully!" — a customer who just submitted a review would see it vanish from the list (since the client only fetches approved reviews) with no explanation why.
- **Fix needed:** update the toast copy to mention the review needs approval.
- **Status:** FIXED — toast now reads "Review submitted! It will appear once approved by our team."

### [6/blog] Admin Blogs "Published/Drafts" filter tabs had no effect — server ignored the `status` param
- **Where:** server/src/controllers/contentController.ts `adminGetBlogs` (didn't read `req.query.status`); admin/src/app/admin/blogs/page.tsx already sent `params.status = statusFilter`.
- **What:** Clicking "Published" or "Drafts" in the admin Blogs page updated the UI tab state and sent `?status=published`/`?status=draft` to the API, but the server's query only ever filtered on `search` — every tab returned the identical unfiltered list. Confirmed live: with 4 published + 1 draft seeded, clicking "Drafts" still showed all 5 before the fix.
- **Fix needed:** read `status` in `adminGetBlogs` and map `published`/`draft` to `isPublished: true/false` in the Mongo query.
- **Status:** FIXED — added the mapping. Reverified live: Drafts tab now correctly shows only the 1 draft post.

### [6/recipes] Admin Recipes difficulty filter tabs (Easy/Medium/Hard) had no effect — server ignored the `difficulty` param
- **Where:** server/src/controllers/contentController.ts `adminGetRecipes` (didn't read `req.query.difficulty`); admin/src/app/admin/recipes/page.tsx already sent `params.difficulty = difficultyFilter`.
- **What:** Same class of bug as the blogs status filter — the admin Recipes page's difficulty tabs sent the param but the server never applied it, so all recipes showed regardless of selected tab. Confirmed live: clicking "Medium" with 5 seeded Easy recipes still returned all 5 before the fix.
- **Fix needed:** read `difficulty` in `adminGetRecipes` and add it to the query when present.
- **Status:** FIXED — reverified live: Medium tab now correctly shows 0 recipes (all 5 seeded recipes are Easy).

### [6/recipes] Recipe detail page's difficulty badge never got its color styling
- **Where:** client/src/app/recipes/[slug]/page.tsx:186 — `<Badge className={cn("mb-3", diffStyle.label)}>`.
- **What:** Passed `diffStyle.label` (the display text "Easy"/"Medium"/"Hard") into `className` instead of `diffStyle.class` (the actual `bg-green-100 text-green-700` etc. Tailwind classes) — a copy-paste typo. The badge rendered with default/no color styling on every recipe detail page.
- **Fix needed:** use `diffStyle.class` for the className.
- **Status:** FIXED — reverified visually: "Easy" badge on the recipe detail page now renders with the correct green background.

### [13/about] Remainder of the About page was fully hardcoded — hero, mission/vision, founder, values, quality badges, and every image
- **Where:** client/src/app/about/page.tsx — hero tagline/headline/subtitle, "Our Mission"/"Our Vision" paragraphs, founder name/title/bio, the 4 core-value cards, and the 4 quality-promise badges were all static JSX text with no settings lookup. Hero background, story photo, and founder photo were decorative gradients/icons/monogram only — no real image was ever configurable.
- **What:** Follow-up to the stats/story fix — user confirmed they wanted the rest of the page (data, copy, and images) admin-manageable too, not just the stats strip. Also caught a real inconsistency introduced by the earlier partial fix: a "25+ Years of Tradition" floating badge next to the story photo still hardcoded 25, contradicting the now-dynamic "Years of Excellence" stat (set to 7 in admin) sitting a few sections below it on the same page.
- **Fix needed:** extend `SiteSettings.about` with hero/mission/vision/founder/values/qualityBadges text fields, add `heroImage`/`founderImage` upload fields (reusing the existing but previously homepage-only `storyImage` for the About page's story photo too), build the corresponding admin UI, and wire the About page to consume all of it with the original copy as fallback.
- **Status:** FIXED —
  1. Fixed the "25+ Years" inconsistency immediately: badge now reads `stats[0]` (the same admin-managed "Years of Excellence" value) instead of a separate hardcoded "25+".
  2. `server/src/models/SiteSettings.ts`: added `about {heroTagline, heroHeadline, heroSubtitle, mission, vision, founderName, founderTitle, founderBio, values[], qualityBadges[]}` plus top-level `heroImage`/`founderImage` fields.
  3. `server/src/controllers/contentController.ts` + `routes/index.ts`: added `'about'` to the JSON-parse allowlist and registered `heroImage`/`founderImage` as multer upload fields (mirroring the existing `storyImage` pattern) with `removeHeroImage`/`removeFounderImage` flags.
  4. `admin/src/app/admin/settings/page.tsx`: added a full new "About Page" tab — hero (image + 3 text fields), mission/vision (2 textareas), founder (image + name/title/bio), 4 editable value cards, 4 editable quality badges. Pre-filled with the original copy as sensible defaults rather than starting blank.
  5. `client/src/app/about/page.tsx`: every section above now reads from settings with the original hardcoded content kept only as a fallback; hero/story/founder images render real uploaded photos when present, falling back to the existing decorative gradient/icon/monogram treatment when not.
  - Verified live end-to-end: confirmed the new admin tab renders all 5 sections correctly (no repeat of the earlier stuck-tab bug), confirmed fields load pre-populated with the real copy, changed the founder name to "Rajesh Patel" and saved (`200 OK`), and confirmed the About page immediately reflected it — including the initials-monogram fallback logic correctly computing "RP" instead of the old hardcoded "AF".

### [13/about] About page stats strip and "Our Story" text were hardcoded — including a dev-marked placeholder
- **Where:** client/src/app/about/page.tsx — `const stats = [...]` array had every entry flagged `placeholder: true` (rendering a literal "—" with "metric to confirm" label when true), and the "Our Story" heading + 3 paragraphs were hardcoded JSX text. `SiteSettings` already had an unused `storyImage` field (uploadable in admin, never consumed by the About page) suggesting a "story" section was intended but never finished.
- **What:** The 4 headline stats (years in business, product count, customer count, family count) and the entire brand story text could only ever be changed by editing source code and redeploying — not something store staff could do.
- **Fix needed:** add `story {heading, text}` and `stats [{label, value, suffix}]` to `SiteSettings`, expose them in the admin settings UI, and consume them on the About page with the old hardcoded content kept only as a fallback.
- **Status:** FIXED —
  1. `server/src/models/SiteSettings.ts`: added `story` and `stats` fields; `server/src/controllers/contentController.ts`: added both to the `jsonFields` parse allowlist.
  2. `admin/src/app/admin/settings/page.tsx`: added a new "About Page Content" section (Branding tab) — story heading/text plus 4 label/value/suffix rows for stats.
  3. `client/src/app/about/page.tsx`: now fetches settings; stats and story render from settings when present, falling back to the original hardcoded content (now named `fallbackStats`/`fallbackStory`) when settings are empty.
  - Verified live end-to-end: set real story text and stat values (7 / 60 / 12,000 / 6,500) in admin → saved (`200 OK`) → confirmed persisted via direct API call → confirmed the About page's "Our Story" section shows the new text, and (via direct React fiber inspection, since the counters only animate once scrolled into view) confirmed the exact saved numbers are what's passed to the display component.
  - Scope note: mission/vision copy, founder bio, and core-values descriptions were left as static editorial copy (not data/stats) — only intentionally in scope per the user's specific complaint about "data, stats, and about page content" that were placeholder/fake.

### [12/settings] Admin settings page had NO tab-switching at all — an AnimatePresence bug pinned every tab to whatever loaded first
- **Where:** admin/src/app/admin/settings/page.tsx — `<AnimatePresence mode="wait"><motion.div key={activeTab} ... exit={...}>` wrapping `{renderTab()}`.
- **What:** Clicking any settings tab (Branding, Shipping & GST, Social, SEO, Notifications, Banners) correctly updated `activeTab` state and the button's active styling, but the actual tab content never changed — confirmed by inspecting React's fiber tree directly: the mounted `PresenceChild` still carried `key="general"` even after clicking to `"branding"`. This is a stuck `AnimatePresence mode="wait"` exit-transition bug. Practical impact: admins could never reach any settings section except "General" through the UI — GST, shipping, social links, SEO, WhatsApp, banners, and the new Payment/UPI fields (see next entry) were all unreachable regardless of what the schema/API supported.
- **Fix needed:** remove the exit-animation wrapper; a simple keyed `motion.div` without `AnimatePresence` is sufficient for an enter-only transition and can't get stuck.
- **Status:** FIXED — removed `<AnimatePresence mode="wait">`, kept the `motion.div key={activeTab}` for entrance animation only. Reverified live: clicking "Shipping & GST" now correctly shows "Shipping Settings" / "GST Information" / "Payment Details" headings.

### [12/settings] Merchant UPI ID/name — and several other business details — were only reachable in the database, not through the admin panel
- **Where:** server/src/models/SiteSettings.ts already defined `payment.upiId`/`upiName` with schema defaults, and client/admin already read `settings?.payment?.upiId` with a fallback — but admin/src/app/admin/settings/page.tsx (1160+ lines covering every other settings field) had zero UI to edit `payment.*`, and server/src/controllers/contentController.ts `updateSiteSettings`'s `jsonFields` allowlist didn't even include `'payment'`, so a submitted value would've been stored as a raw string, not parsed. Separately, client/src/app/contact/page.tsx, wholesale/page.tsx, faq/page.tsx, and track-order/page.tsx had phone/WhatsApp/email/social links hardcoded directly in JSX with no settings lookup at all (unlike Header.tsx/CartDrawer.tsx/orders page, which already correctly read from settings with a hardcoded fallback only).
- **What:** The "merchant@upi" a user would see at checkout was, in effect, permanent — there was no way to change it without editing the database directly. Same for the phone number/WhatsApp link shown on the Contact, Wholesale, FAQ, and Track Order pages: changing the WhatsApp number in Settings → Notifications had no effect on those four pages.
- **Fix needed:** add Payment/UPI fields to the admin settings UI, add `'payment'` to the server's JSON-parsed fields list, and wire the four static pages' contact links to the same settings-driven pattern already used elsewhere.
- **Status:** FIXED —
  1. `server/src/controllers/contentController.ts`: added `'payment'` to `jsonFields`.
  2. `admin/src/app/admin/settings/page.tsx`: added `payment: {upiId, upiName}` to the form interface/default/load/save logic and a new "Payment Details" section under the Shipping & GST tab.
  3. `client/src/app/contact/page.tsx`: now fetches settings and uses them for address, phone, email, WhatsApp link, and social media links (previously all hardcoded, including one page showing a *different* hardcoded email than another).
  4. `client/src/app/wholesale/page.tsx`, `faq/page.tsx`, `track-order/page.tsx`: WhatsApp links now read from settings with the same fallback pattern used elsewhere.
  - Verified live end-to-end: set UPI ID to `rijita@okhdfcbank` / "RIJITA by Arya Foods" in admin settings → saved (`200 OK`) → confirmed persisted via direct API call → confirmed the client's own `/api/settings` proxy returns the new value. Confirmed Contact page now shows the real configured phone number instead of the old hardcoded one.
  - Not fixed (lower priority, SEO-only, not customer-facing): `client/src/components/seo/StructuredData.tsx` still hardcodes a phone number in its JSON-LD schema.

### [3/checkout — CRITICAL, found via live testing not static reading] No order could ever be placed — orderNumber generated too late for Mongoose validation
- **Where:** server/src/models/Order.ts — `orderSchema.pre('save', ...)` auto-generating `orderNumber` (a `required: true` field).
- **What:** Mongoose runs schema validation (which enforces `required`) as part of the `validate` phase, which always completes *before* `save` middleware runs. A `pre('save')` hook can never satisfy a `required` field it's responsible for setting — every single `Order.create()` / `.save()` call failed with `"Order validation failed: orderNumber: Path 'orderNumber' is required."` before the hook ever ran. Confirmed live: placed a real order through the actual checkout UI and got exactly this 400 error from `POST /api/orders`. This is not a static-analysis-visible bug — reading the code, the hook logic looks correct in isolation; only running it surfaces the Mongoose middleware-ordering fault. This means the storefront's core purchase flow was completely non-functional.
- **Fix needed:** change the hook to `orderSchema.pre('validate', ...)` so `orderNumber` is set before validators run.
- **Status:** FIXED — changed to `pre('validate')`. Reverified live: placed a second real order through the UI, got `201 Created` with a valid generated `orderNumber` (`RIJ-MRUN6XLI-240C2A`), and the order rendered correctly on both the client confirmation page and the admin orders list.

### [3/checkout] Cart silently wiped on load — save-effect raced the load-effect and wrote an empty array over real data
- **Where:** client/src/lib/cart-context.tsx — the localStorage-persist `useEffect` guarded on a ref (`initialized.current`) that was flipped to `true` synchronously inside the *same* mount effect that dispatches `LOAD_CART`, before that dispatch's state update had actually landed.
- **What:** On mount, the persist-effect ran with the guard already `true` but `state.items` still the pre-load empty array, immediately overwriting real cart data in localStorage with `[]`. Confirmed by direct reproduction: seeded a valid cart via localStorage, reloaded the cart page, and the cart displayed empty with localStorage showing `[]` — repeatable, not a one-off. Real customers with items in their cart from a previous visit could have it silently emptied.
- **Fix needed:** gate the persist-effect on `cartReady` state (which updates in the same render as the loaded items, since both are set together) instead of a ref flipped before the load lands.
- **Status:** FIXED — reverified: seeded a valid cart, reloaded, cart displayed "2 items in your cart" correctly and localStorage held the correct data afterward (previously ended up `[]`).

### [3/checkout] Checkout payment-method copy still described the removed "Online Payment / Card / NetBanking" flow
- **Where:** client/src/app/checkout/page.tsx — "Payment Method" card.
- **What:** Leftover copy from before the payment-gateway fix (this session, earlier) still said "Online Payment — Pay securely using UPI, Card, or NetBanking" and "Clicking Place Order will... initiate the payment process", which no longer matches what actually happens (UPI QR + WhatsApp manual confirmation).
- **Fix needed:** update copy to describe the real flow.
- **Status:** FIXED — copy now reads "UPI Payment — Scan a QR code or pay via any UPI app after placing your order" with an accurate description of manual WhatsApp confirmation. Verified visually on the live checkout page.

### [13/cross-cutting] admin app ships a storefront sitemap.ts (copy-paste leftover)
- **Where:** admin/src/app/sitemap.ts:1-93
- **What:** Next.js auto-serves this at `admin.<domain>/sitemap.xml`. It lists client-only routes (`/products`, `/cart`, `/checkout`, `/blog/[slug]`, etc.) resolved against `NEXT_PUBLIC_SITE_URL` (falls back to `localhost:3000`, the client's port, not admin's). Every crawl of the admin sitemap fires 4 unauthenticated fetches to the products/categories/blogs/recipes API for URLs that don't exist under the admin domain at all. Client already has its own correct copy at client/src/app/sitemap.ts.
- **Fix needed:** delete admin/src/app/sitemap.ts (or replace with an admin-appropriate one, likely empty/noindex since it's an internal tool).
- **Status:** FIXED — file was already deleted before this recheck (confirmed gone).

### [1/auth] admin API base URL fallback silently diverges from server's actual port
- **Where:** admin/src/app/sitemap.ts:29 (`http://localhost:5000/api`) vs admin/src/lib/api.ts:1 and admin/src/lib/utils.ts:75 (`http://localhost:5001/api`) vs server/.env `PORT=5001`
- **What:** admin/ has no .env file at all, so every one of these fallbacks is live in local dev. Two different hardcoded ports (5000 vs 5001) exist for the same fallback purpose in the same app — sitemap.ts's fetches will 404/ECONNREFUSED against a real dev server on 5001 while api.ts and utils.ts correctly hit 5001.
- **Fix needed:** add admin/.env(.local) with NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SITE_URL set explicitly (matching client's pattern), and fix the stray 5000 fallback in sitemap.ts.
- **Status:** FIXED — admin/.env.local already existed with NEXT_PUBLIC_API_URL=5001 (correct), but NEXT_PUBLIC_SITE_URL was set to :3001 while admin's actual dev port (admin/package.json) is :3002 — corrected to :3002 this pass. sitemap.ts itself no longer exists (see above).

### [1/auth] admin route "protection" is a client-writable cookie with no signature — spoofable
- **Where:** admin/src/middleware.ts:9-14 checks `request.cookies.get('auth_role')`; the cookie is set entirely client-side and unsigned at admin/src/lib/auth-context.tsx:37,76 via `document.cookie = auth_role=${role}; path=/; max-age=604800`.
- **What:** Anyone can open devtools on the admin login page (before ever logging in) and run `document.cookie="auth_role=admin;path=/"`, then navigate directly to any `/admin/*` URL — the Next.js middleware will let them through since it only checks for the string value, never verifies the JWT. The real data underneath is still safe (server routes are gated by `authorize('admin','superadmin')` against the actual JWT), but the admin UI shell/layout/forms render for anyone who fakes the cookie.
- **Fix needed:** drop the spoofable middleware gate; rely on client-side `isAuthenticated` check + server-side `authorize` (the real security boundary).
- **Status:** FIXED — admin/src/middleware.ts already deleted before this recheck. Confirmed the real gate is now admin/src/app/admin/layout.tsx:91 (`router.push("/403")` for wrong-role users), backed by server-side `authorize` middleware — matches the recommended fix.

### [3/checkout] Payment flow is a hardcoded demo simulator wired to the real order-completion endpoint — anyone can mark any order "paid" for free
- **Where:** client/src/components/checkout/PaymentModal.tsx (deleted), client/src/app/orders/[orderNumber]/page.tsx (`handlePaymentSuccess`), server/src/controllers/orderController.ts `verifyPayment`, server/src/routes/index.ts `/orders/:orderNumber/pay`.
- **What:** `verifyPayment` unconditionally set `paymentStatus = 'completed'` the moment it was called, with zero gateway verification. The checkout page hardcoded every order to `paymentMethod: "online"`, which routed to a fake `setTimeout` "Pay Now" simulator that called this endpoint directly — meaning literally every order placed went through the unprotected self-verify path, and guest orders needed no auth at all.
- **Fix needed:** lock `verifyPayment` to admin-only server-side (real gateway integration would need credentials this codebase doesn't have); route all orders through the existing (already-safe) manual UPI/WhatsApp confirmation flow instead.
- **Status:** FIXED this pass —
  1. `server/src/routes/index.ts`: `/orders/:orderNumber/pay` now requires `protect, authorize('admin','superadmin')` (was `optionalAuth`).
  2. `server/src/controllers/orderController.ts` `verifyPayment`: removed the now-redundant guest/owner check (only admins can reach it).
  3. `client/src/app/checkout/page.tsx`: `paymentMethod` changed from hardcoded `"online"` to `"upi"`, routing every order through the pre-existing safe QR-code + "I have Paid — Send Screenshot" (WhatsApp) flow instead of self-verify.
  4. `client/src/app/orders/[orderNumber]/page.tsx`: removed the `online`/`demo-online` fake-modal branch, `handlePaymentSuccess`, `isModalOpen` state, and the dead `?pay=true` auto-open param; now always shows the manual UPI/WhatsApp confirmation UI.
  5. Deleted `client/src/components/checkout/PaymentModal.tsx` (fake simulator, no longer referenced) and its unused duplicate at `admin/src/components/checkout/PaymentModal.tsx`.
  6. Added a "Mark Payment as Received" action in `admin/src/app/admin/orders/page.tsx` (calls the now admin-only `verifyPayment`), so staff have a real way to confirm payment after checking the WhatsApp screenshot.
  - Verified: server and client both typecheck clean (`tsc --noEmit`) after the change.

### [4/orders] Phone-based order lookup does substring match with no auth, no rate limit, no minimum length — leaks other customers' orders
- **Where:** server/src/controllers/orderController.ts `getOrderByPhone`, routed at server/src/routes/index.ts `GET /orders/track/:phone`.
- **What:** No minimum-length check, then a **substring** regex match — querying a single digit returned multiple real customers' full orders (name, address, items, total) to an unauthenticated caller.
- **Fix needed:** require exact/full phone match, enforce minimum digit length, add rate limiting.
- **Status:** FIXED — added `orderLookupLimiter` (10 req/15min in production) applied to the route; controller now rejects any input where the stripped digit count isn't exactly 10 (matches the format the client enforces at checkout), closing the "1 digit matches everything" leak. Verified via `tsc --noEmit`.

### [5/categories] (minor) category create/update takes req.body with no field allowlist, unlike products
- **Where:** server/src/controllers/categoryController.ts `createCategory`/`updateCategory`.
- **What:** Took `req.body` directly with no allowlist, unlike `productController.parseProductBody`. Not currently exploitable (Mongoose strict mode), but an inconsistent defensive pattern.
- **Fix needed:** add the same explicit allowlist pattern used in `parseProductBody`.
- **Status:** FIXED — added `parseCategoryBody`/`allowedCategoryFields` mirroring the product controller's pattern. Verified via `tsc --noEmit`.

### [14/cross-cutting] client/src/middleware.ts is dead code copy-pasted from admin — client has zero route-level auth guard
- **Where:** client/src/middleware.ts (matcher `/admin/:path*`, a path that doesn't exist in the client app).
- **What:** Unreachable dead code copy-pasted from admin; client's real account pages (orders, wishlist) rely only on component-level `useAuth()` checks.
- **Fix needed:** delete client/src/middleware.ts.
- **Status:** FIXED — file was already deleted before this recheck (confirmed gone). No middleware-level guard was re-added for /orders, /wishlist since data access itself is still bearer-token gated server-side; flagging as accepted risk, not a regression.

### [NEW — found on recheck] admin app inherited a large slice of the storefront's UI wholesale, live and reachable
- **Where:** admin/src/app/layout.tsx, admin/src/components/layout/Header.tsx, admin/src/app/robots.ts, admin/src/components/seo/StructuredData.tsx, admin/src/lib/cart-context.tsx + admin/src/components/cart/CartDrawer.tsx, admin/src/components/home/* (5 files), admin/src/components/products/ProductCard.tsx, admin/src/components/checkout/PaymentModal.tsx (dup), admin/src/__tests__/cart-context.test.tsx.
- **What:** Root layout injected consumer marketing metadata AND `robots: {index: true, follow: true}` — explicitly telling Google to index the internal staff panel — plus `<StructuredData/>` emitting fake public Organization/WebSite JSON-LD with storefront branding on every admin page. `Header.tsx` (rendered on the non-`/admin` `/403` page per `providers.tsx`'s `!isAdmin` check) rendered a live shopping-cart icon + drawer and a "Wishlist" button linking to `/wishlist`/`/auth/login`/`/orders` — routes that don't exist anywhere in the admin app, so staff bounced to `/403` would see a broken storefront nav bar. `robots.ts` pointed at the now-deleted sitemap.xml. Several files (home/* section components, ProductCard, a duplicate PaymentModal) were fully dead — only referenced by each other, never rendered.
- **Fix needed:** remove SEO/indexing leakage, remove customer-facing UI dead ends, delete dead files.
- **Status:** FIXED —
  - `admin/src/app/layout.tsx`: removed `CartProvider` wrap, removed `<StructuredData/>`, replaced metadata with admin-appropriate content (`robots: {index:false, follow:false}`, "RIJITA Admin" title, no consumer keywords/OG).
  - `admin/src/components/layout/Header.tsx`: removed the Wishlist button, Cart button + `CartDrawer` render, the dropdown/mobile-menu links to `/orders` and `/wishlist` (nonexistent in admin), and `/auth/login`+`/auth/register` links (replaced the sign-in link with `/admin/login`). Removed now-unused `useCart`/`CartDrawer`/`ShoppingBag`/`Heart` imports and state.
  - Deleted: `admin/src/app/robots.ts`, `admin/src/components/seo/StructuredData.tsx`, `admin/src/lib/cart-context.tsx`, `admin/src/components/cart/CartDrawer.tsx`, `admin/src/components/products/ProductCard.tsx`, `admin/src/components/home/` (entire dir), `admin/src/components/checkout/PaymentModal.tsx` (dup), `admin/src/__tests__/cart-context.test.tsx`.
  - Verified: `tsc --noEmit` clean for admin after all removals (no dangling imports).

---

## SESSION: FastAPI-backend audit (the previously-audited `server/src/**` is not the running API)

> **Read this before trusting anything above.** Every issue logged above this line was found and
> fixed in `server/src/**` — TypeScript/Express/Mongoose. That is **not the API this project runs.**
> `server/package.json`'s `dev` and `start` scripts both execute `venv/bin/python main.py`, which
> boots **FastAPI from `server/app/**`**. The TS tree is reachable from exactly one live entry point:
> `npm run seed` (`tsx src/seeds/seed.ts`), so it is dead for serving traffic but still owns the
> shape of all seeded data. The critical fixes above were since re-implemented in Python, but the
> Python code carried its own separate defects — listed below, all found by reading `server/app/**`
> directly and verified against the running server and the real MongoDB.

### [py/orders — money] Coupon usage limit could be exceeded by concurrent checkouts
- **Where:** server/app/routers/orders.py `place_order`.
- **What:** The `usageLimit` check was a plain read (`usedCount >= usageLimit`), and the increment happened separately after the order insert. Two checkouts arriving together both read `usedCount == limit-1`, both passed, and both redeemed — taking the coupon past its cap. A "first 100 customers" promotion could be honoured well past 100.
- **Fix needed:** reserve the redemption with a single atomic conditional update, and release it on every failure path.
- **Status:** FIXED — the increment now runs *before* the insert as `update_one({code, usedCount: {$lt: limit}}, {$inc: {usedCount: 1}})` and is treated as failed if `modified_count == 0`. Released again if the insert throws or if the stock-deduction rollback unwinds the order, so a failed order still never burns a use (the property the old ordering was protecting).

### [py/orders — money] An item with no variant id and no SKU silently billed the wrong variant
- **Where:** server/app/routers/orders.py `place_order`, variant-matching loop.
- **What:** Match condition was `str(v.get("_id")) == v_id or v.get("sku") == item.sku`. Variants in this catalogue carry **no `_id`** (confirmed in the live DB: variant keys are weight/weightValue/weightUnit/mrp/sellingPrice/stock/discount/sku), so sku is the only real identity. When an item arrived with neither field, `v.get("sku") == item.sku` reduced to `None == None` and matched the first variant that also lacked a sku — charging that variant's price for a weight the customer never chose.
- **Fix needed:** reject an item that carries neither a variant id nor a sku.
- **Status:** FIXED — explicit 400 "Missing variant selection" before the loop.

### [py/orders — privacy] Phone order-lookup used an unanchored regex
- **Where:** server/app/routers/orders.py `get_order_by_phone`.
- **What:** Input is correctly forced to exactly 10 digits, but the query was `{"$regex": digits}` — a substring match. Any stored number longer than 10 digits (a legacy row with a country prefix, or a typo'd 11th digit) was returned in full — name, address, line items, total — to anyone who guessed a 10-digit fragment of it.
- **Status:** FIXED — anchored to `^...$`. Verified live: a real 10-digit lookup still returns its order; a 1-digit probe is still rejected 400.

### [py/orders] Rate-limiter dict grew without bound
- **Where:** server/app/routers/orders.py `_phone_lookup_allowed`.
- **What:** Expired entries were trimmed *within* a key but keys themselves were never removed, so every distinct IP+phone pair ever attempted stayed resident forever. Scanning phone numbers doubled as a memory leak against a long-lived server process.
- **Status:** FIXED — fully-expired keys are now evicted on each call.

### [py/auth] `except Exception` swallowed the HTTPExceptions raised beside it
- **Where:** server/app/utils/auth.py `get_current_user`.
- **What:** `HTTPException` is an `Exception`, so the specific reasons raised inside the `try` ("User not found", "Account deactivated") were caught by the generic handler and rewritten as "Not authorized, token invalid". A deactivated user was told their token was bad — implying re-login would help, when only an admin can restore the account.
- **Status:** FIXED — `except HTTPException: raise` added before the generic clause. Verified live: a token for a nonexistent user now returns "User not found"; a malformed token still returns "Not authorized, token invalid".

### [py/auth] change-password was the one path with no minimum-length rule
- **Where:** server/app/routers/auth.py `change_password`.
- **What:** `register` and `reset_password` both enforce ≥6 characters; change-password enforced nothing, so any logged-in user could set a 1-character password and quietly defeat the rule everywhere else.
- **Status:** FIXED — same ≥6 check, plus a new "must differ from current password" check. Both verified live (400 with the right message; no mutation occurred).

### [py/auth — security] Refresh-token cookie was never marked `secure`
- **Where:** server/app/routers/auth.py — three separate `set_cookie` calls (register, login, refresh-token).
- **What:** All three set `httponly`/`samesite` but omitted `secure`, so this 30-day credential was allowed to travel over plain HTTP in production.
- **Status:** FIXED — consolidated into one `set_refresh_cookie()` helper with `secure=(NODE_ENV == "production")`, so the flags cannot drift apart across the three call sites again.

### [py/auth] Wishlist accepted any string as a product id
- **Where:** server/app/routers/auth.py `toggle_wishlist`.
- **What:** No validation at all — `POST /auth/wishlist/anything` stored `"anything"` and answered "Added to wishlist". `GET /auth/wishlist` silently drops entries that aren't valid ids, so the junk accumulated invisibly and the "added" item never appeared.
- **Status:** FIXED — validates ObjectId form and product existence on the *add* path only (so a since-deleted product can still be removed). Verified live: 400 for a malformed id, 404 for a well-formed but nonexistent one.

### [py/auth — UX] Deleting your default address left the account with no default
- **Where:** server/app/routers/auth.py `delete_address`.
- **What:** The delete simply filtered the list, so removing the default left every remaining address non-default and checkout had nothing to preselect.
- **Status:** FIXED — promotes the next address when the deleted one was the default.

### [py/auth] Registration race returned a raw 500
- **Where:** server/app/routers/auth.py `register`.
- **What:** The `find_one` duplicate check isn't atomic; a double-submit had both requests pass it, and the unique index on `users.email` then raised an unhandled `DuplicateKeyError` → 500 "Internal server error".
- **Status:** FIXED — `DuplicateKeyError` caught and returned as the same 400 "Email already registered" the non-racing path gives.

### [py/products — catalogue] Price and stock filters matched across *different* variants
- **Where:** server/app/routers/products.py `get_products` (minPrice/maxPrice) and `admin_get_products` (low-stock).
- **What:** Both used a dotted array path — `{"variants.sellingPrice": {"$gte": 100, "$lte": 200}}`. On an array field MongoDB satisfies each operator independently, so a product with a 50g pack at ₹50 and a 5kg pack at ₹5000 matched a ₹100–₹200 filter: one variant cleared `$lte`, a *different* one cleared `$gte`. Identical flaw in the low-stock filter (`{"$gt": 0, "$lte": 10}`), which flagged products with one sold-out variant and one fully-stocked variant as needing restock.
- **Status:** FIXED — both rewritten as `$elemMatch` so a single variant must satisfy the whole range. Verified empirically against the real MongoDB with a two-variant fixture: the old query matched it (1), the new one does not (0), for both filters. Confirmed the live storefront price filter still returns correct results with no out-of-range leaks.

### [py/all — admin-facing] Duplicate slugs returned a raw 500 and lost the form
- **Where:** 11 call sites: products.py (create/update), categories.py (create/update), content.py (blogs, recipes, collections — create and update each).
- **What:** `slug` carries a unique index on products/categories/blogs/recipes, but every path fed `generate_slug(name)` straight in with no collision handling. A second product named "Organic Turmeric" — or *any* name made only of punctuation, which slugifies to the empty string — hit the index and surfaced to the admin as "Internal server error" with the whole filled-in form lost.
- **Status:** FIXED — added `ensure_unique_slug()` in helpers.py (suffixes `-2`, `-3`, …; falls back to a usable slug when the name slugifies to empty; takes `exclude_id` so an update doesn't collide with itself) and wired it into all 11 sites. Verified against the real DB: collision → `organic-turmeric-3`, empty → `item`, self-update → keeps its own slug.

### [py/products — data integrity] `variants.sku` is UNIQUE in the live DB but the app neither declared nor enforced it
- **Where:** server/app/db.py `ensure_indexes`, server/app/routers/products.py create/update.
- **What:** The live database carries a **unique** index on `variants.sku` — created by the Mongoose seed schema (`sku: {type: String, required: true, unique: true}`), *not* by anything in the Python app. Two failures follow. (1) `ensure_indexes()` never declares it, so a deployment against a fresh database would silently come up **without** that constraint — and since variants have no `_id`, duplicate SKUs make order placement resolve a cart line to the wrong product's variant. (2) Neither create nor update validated SKUs, so on the existing database a duplicate produced an unhandled `DuplicateKeyError` → 500, and a blank SKU produced a saved-but-permanently-unorderable variant.
- **Status:** FIXED — index declared in `ensure_indexes`; new `validate_variants()` enforces at-least-one-variant, non-empty SKU, positive selling price, no duplicate SKU within the product, and no SKU already owned by another product. Runs *before* image uploads are written, so a rejected product no longer orphans files in uploads/. Verified live via the admin API — all four rejection cases return actionable 400s ("SKU RIJ-500-MLC is already used by 'Mahalaxmi Chevdo'") and no test product was created.

### [py/db — reliability] One failing index silently skipped every index declared after it
- **Where:** server/app/db.py `ensure_indexes`.
- **What:** ~20 `create_index` awaits sat inside a single `try/except` that only logged a warning. The first failure — most plausibly a `unique` index rejected by pre-existing duplicate data — aborted the whole function, so every index below it was never created. A single duplicate email could leave orders without their unique `orderNumber` index and coupons without their unique `code` index, with nothing but one warning line to show for it.
- **Status:** FIXED — restructured into a spec list with per-index error isolation; logs a created/failed count and names each failure instead of dying at the first one.

### [py→client/checkout — money] Applied coupon was never re-checked when the cart changed
- **Where:** client/src/app/checkout/page.tsx — `applyCoupon` / the coupon summary block.
- **What:** The discount is computed once, against the subtotal as it stood when the code was applied — but the cart stays editable while the checkout page is open, because the header (rendered on every storefront page, checkout included) opens a cart drawer with quantity +/- and remove controls. Removing items left the *old* discount on screen: a 10% coupon applied at ₹270 kept showing −₹27 after the cart dropped to ₹180. Worse, WELCOME10 has a ₹199 minimum, so at ₹180 the server rejects it — and since the coupon code is sent with the order, `POST /orders` failed the **entire order** with "Minimum order: ₹199", with nothing on the page pointing at the coupon as the cause. The customer sees a generic failure on a filled-in checkout form.
- **Fix needed:** re-validate the applied coupon whenever the subtotal moves; drop it and say so if it no longer qualifies.
- **Status:** FIXED — added a debounced effect keyed on `subtotal` that re-runs `applyCoupon` for the currently-applied code, plus a `silentSuccess` option so a still-valid coupon doesn't re-toast on every quantity tap while a *failure* still surfaces its reason. Verified live in the browser end to end: applied WELCOME10 at ₹270 (showed −₹27, total ₹304 = 243 + 49 delivery + 12 GST), then clicked the drawer's decrease-quantity control to drop to ₹180 — the discount line disappeared and the total corrected to ₹238 (180 + 49 + 9 GST). Confirmed the dead-end was real by calling the API directly: `POST /coupons/validate {WELCOME10, 180}` → 400 "Minimum order: ₹199", vs 200 with `discount: 27` at 270.

### [py→client/cart — money] The cart trusted a localStorage snapshot forever; price and stock were never refreshed
- **Where:** client/src/lib/cart-context.tsx.
- **What:** Each cart line stores a full *copy* of the product and variant taken at "Add to Cart", persisted in localStorage indefinitely (carts survive for weeks). Nothing ever re-read the catalogue — the cart page and drawer fetch only settings and coupons. Three consequences, all silent: (1) **a price change was invisible** — the customer saw the old `sellingPrice` in the cart, the drawer, and all the way through the checkout summary, while the server computes the charge from the database at order time and billed the new one; (2) the "can't add more" guards (`disabled={item.quantity >= variant.stock}`) compare against the *snapshotted* stock, so they enforce a number that may no longer be true; (3) a product since sold out, deactivated or deleted stayed in the cart looking orderable and only failed at Place Order, after the address form was filled in.
- **Fix needed:** re-check the saved cart against the live catalogue once after it loads.
- **Status:** FIXED — added a one-shot revalidation effect in `CartProvider`: fetches each distinct product in the cart, drops lines whose product or variant is gone/inactive/out of stock, clamps quantities to real stock, refreshes price and product data, and reports what changed via toasts. Deliberately fail-safe — a product that simply couldn't be fetched (offline, 500) is left untouched rather than dropped, and if *every* fetch fails the cart is not modified at all, so a flaky network can never empty someone's cart. Verified live: seeded a cart with a deliberately stale price (₹1 vs the real ₹90), stale stock (999 vs the real 10) and an impossible quantity (99), loaded /cart, and the line self-corrected to ₹90 / stock 10 / qty 10 with subtotal ₹900 and both "Price updated" and "Quantity reduced to available stock" toasts.

### [py→client/cart] ADD_ITEM merged quantities past available stock
- **Where:** client/src/lib/cart-context.tsx `cartReducer`, `ADD_ITEM`.
- **What:** `items[i].quantity + quantity` with no ceiling. The product detail page caps each individual add at the variant's stock, but nothing capped the running total — adding a full-stock quantity twice put more in the cart than exists. The overage only surfaced as a 409 "Insufficient stock" at Place Order.
- **Status:** FIXED — merged (and initial) quantity is now clamped to the variant's stock.

### [tooling] `client/.next` build cache corrupted by out-of-band file churn — every storefront route 500'd
- **What:** Not a code defect, recorded because it looks exactly like one. A `git stash`/`pop` cycle rewrote 69 client files underneath the running dev server; Next.js's incremental cache went stale and *every* route (`/`, `/products`, `/cart`, `/checkout`, `/about`, `/orders`) began returning HTTP 500 with `Error: Cannot find module './682.js'` from `.next/server/webpack-runtime`. No console errors in the browser — only the SSR response revealed it.
- **Fix:** `rm -rf client/.next` and let the dev server rebuild (it is gitignored, regenerable build output). All routes returned 200 afterward. Worth remembering: a sudden all-routes 500 after a branch switch or stash is almost always this, not the application code.

### [py→admin — data loss] Blogs, Recipes and Reviews deleted permanently on a single unguarded click
- **Where:** admin/src/app/admin/blogs/page.tsx:107, recipes/page.tsx:120, reviews/page.tsx:82 — `handleDelete` called straight from the row's `onClick`.
- **What:** Seven of the ten admin list pages confirm before deleting (products/users use a modal or an inline two-step, categories/coupons/collections/contacts/orders use `window.confirm`). These three did not: one click on the trash icon issued the DELETE immediately. The server hard-deletes — there is no soft-delete flag and no undo anywhere in the codebase — so a misclick permanently destroyed an authored blog post or a recipe's full ingredient list and instructions. The reviews case is the easiest to hit, because Delete sits directly beside Approve in the moderation row, and deleting a review also recomputes the product's rating, silently moving the star average on the storefront.
- **Fix needed:** guard all three with the confirmation pattern already used by the rest of the panel.
- **Status:** FIXED — added `window.confirm` guards matching the existing contacts/collections pattern, with copy that states the action is permanent. Admin `tsc --noEmit` clean. Verified by consistency check: all 10 admin list pages now guard destructive deletes (products/users via their existing modal/inline patterns, the other 8 via `window.confirm`). Not browser-verified — `window.confirm` blocks automated drivers — but the change is a one-line early return in an established pattern.
- **Note on method:** the first grep for this (`confirm(|Are you sure`) produced false positives on products and false negatives on users, both of which use state-driven modals (`deleteConfirm` / `confirmDelete`) rather than the native dialog. Each page was opened and read before being called a bug.

### [contract] Every admin and client API call resolves to a real FastAPI route
- **What:** Because the storefront and admin panel were originally written against the Express API in `server/src`, endpoint drift was the most likely class of breakage after the FastAPI migration. Checked systematically rather than by sampling: parsed all `fetchApi(...)` call sites out of `admin/src/lib/api.ts` (65) and `client/src/lib/api.ts` (44), normalised path params, and matched each method+path against the 118 endpoints in the running server's own `/openapi.json`.
- **Result:** clean — all 109 call sites resolve to a registered route. No dead or renamed endpoints survive from the Express era. `admin/analytics/top-products` was spot-checked further and does return the `revenue` field the analytics page reads, so the ₹0-revenue bug logged earlier against the TS controller does not exist in the Python one.

## Efficiency & remaining-coverage pass

### [py/perf] N+1 query patterns on the hottest list endpoints
- **Where:** content.py `get_latest_reviews` and `admin_get_reviews`, orders.py `admin_get_orders`, analytics.py `get_order_status_analytics`.
- **What:** Each resolved its related documents one row at a time inside the response loop. `admin_get_orders` paginates 20 orders and issued a `users.find_one` per order — 20 extra round trips to Atlas on every load and every filter change of the admin's busiest screen. `admin_get_reviews` was worse at two per row (product *and* user) — 40 per page. `get_order_status_analytics` ran eight sequential `count_documents`, one per status.
- **Status:** FIXED — all four now batch: a single `$in` query per related collection (projected to just the fields used), then an in-memory join; the status breakdown became one `$group` aggregation with the counts merged back onto the full status list so statuses with zero orders still render. Verified live that each endpoint returns the identical shape it did before (`/admin/orders` still nests the full `{_id,name,email,phone}` user object, `/admin/reviews` still nests product and user).

### [py/perf — public DoS surface] `/reviews/latest` took an unbounded `limit`
- **Where:** content.py `get_latest_reviews`.
- **What:** Public, unauthenticated, and feeds the homepage testimonial strip. `limit` went straight to Mongo with no ceiling (unlike every paginated endpoint, which routes through `paginate_query`'s cap of 100). Combined with the N+1 above, a single request for `?limit=100000` meant loading 100k documents *and* firing 100k product queries.
- **Status:** FIXED — clamped to 1–50 and batched. Verified live: `?limit=99999` now returns 8 (all that exist) instead of attempting the full scan.

### [py/data-integrity] Deleting a product orphaned its reviews and wishlist entries forever
- **Where:** products.py `delete_product`.
- **What:** It deleted only the product document. Reviews kept pointing at the dead id while still flagged `isApproved`, and `/reviews/latest` selects purely on `isApproved` — so those reviews carried on being served to the homepage with a null `productName`, detached from any product a visitor could click. Wishlist entries lingered the same way, invisibly: `GET /auth/wishlist` silently drops ids that no longer resolve, so the row stayed in the user document forever.
- **Status:** FIXED — deletion now cascades: `reviews.delete_many({product})` plus a `$pull` of the id from every user's wishlist (matching both the string and ObjectId forms the two write paths produce), and reports the counts it cleaned. Verified live end to end: created a throwaway product, attached a real review and wishlist entry, deleted it → `{"reviewsDeleted":1,"wishlistsUpdated":1}` and zero leftovers in all three collections.
- **Pre-existing data, NOT fixed — needs a human decision:** the current database already holds 8 approved reviews whose product references resolve to nothing (0 of 7 distinct product ids still exist), left over from before this cascade. They are what makes the homepage testimonial strip render entries with no product name. Deleting real customer-written reviews is a content decision, not a code fix, so they were left in place — clearing them is a one-line `db.reviews.delete_many` once someone confirms that is wanted.

### [a11y] Newsletter subscribe button had no accessible name on mobile
- **Where:** client/src/components/layout/Footer.tsx:239.
- **What:** The button's only text label is `<span className="hidden sm:inline">Join</span>`, so below the `sm` breakpoint it collapses to a bare `<Send/>` icon with no name at all — a screen reader on a phone announced only "button" on the newsletter form. Invisible at desktop width, which is why it survived earlier passes.
- **Status:** FIXED — added `aria-label="Subscribe to newsletter"`. Verified in the browser at 375×812: the button reports `text: ""` (confirming the label really is hidden there) with `aria-label: "Subscribe to newsletter"`, and the homepage now has **0 unnamed controls out of 132**.

### [a11y] Four admin icon-only buttons had no accessible name
- **Where:** admin blogs/recipes/collections modal close buttons and the orders "select all" toggle.
- **Status:** FIXED — `aria-label` added to each ("Close blog form", "Close recipe form", "Close collection form", "Toggle select all orders"). Admin `tsc` clean. Not browser-verified (all four sit behind admin auth inside modals); the change is a single static attribute.

### Method note — three heuristics that lied, and how they were caught
Grep/regex scans produced false positives on every a11y sweep, and each was checked by opening the file before any claim was made:
1. "Pages with delete but no confirm" flagged products (uses a `deleteConfirm` modal) and missed users (uses `confirmDelete`). Only blogs/recipes/reviews were genuinely unguarded.
2. "Icon-only buttons" flagged 12; 8 were false — the regex stripped `{...}` expressions that *contained* the visible label ("Sign in", "Add to Cart", "Apply").
3. "Form controls with no label" flagged 205; all sampled were false — `[^>]*` cannot span an arrow function, so `onChange={(e) => ...}` truncated the attribute capture before `placeholder`/`aria-label`.
The reliable check turned out to be the browser: enumerating every control on a rendered page and computing its accessible name. That found 0 unnamed on /products (113 controls) and pinpointed the single real footer defect at mobile width.
