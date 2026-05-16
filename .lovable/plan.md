# ORBIS — Build Plan

This is a large, multi-screen system (10 screens, 12+ tables, RLS, real-time, offline). Building it well in one shot would be sloppy. I'll ship it in **4 phases**, each independently usable, so you can review and steer between phases.

Before I start I need to enable **Lovable Cloud** (backend: auth, Postgres, real-time, storage). All schema, RLS, seed data, and the manager account (`manager@restaurant.com` / `manager1234`) will be provisioned automatically.

---

## Phase 1 — Foundation (ship first)
- Design system: Inter font, full token palette in `src/styles.css`, Indian number formatter, toast styles.
- App shell: fixed 64px icon sidebar with tooltips, dividers, language toggle / avatar / logout at bottom. Mobile: bottom tab bar.
- Lovable Cloud enabled + full schema (users, restaurants, tables, dishes, orders, notifications, announcements, void_log, bookings, attendance, shifts, shift_log) + RLS per role + `restaurant_status` public view + seeded Kerala menu + seeded manager.
- Auth: login screen, role-based redirect, route guards (`_authenticated` + role layouts).
- Offline-detect banner + localStorage order queue + auto-sync.

## Phase 2 — Core operations (the daily-use loop)
- **Tables** (Screen 2): floor tabs, status grid, live totals, real-time sync.
- **Order Taking** (Screen 3): 3-column layout, category nav, dish grid, cart, send-to-kitchen, rounds, voice button stub.
- **Kitchen Display** (Screen 4): dark theme, status tabs, real-time new-order flash + beep, wake lock, status flow.
- **Order History & Billing** (Screen 5): filters, expandable orders, accountant pending bills, split bill, void with reason.

## Phase 3 — Management
- **Dashboard** (Screen 1): stat cards, Chart.js revenue/orders charts, top dishes, live customer-app feed panel.
- **Menu Management** (Screen 6): grid, photo upload (Cloud storage), availability toggle, add/edit/duplicate/delete.
- **Staff** (Screen 8): accounts (create Supabase Auth users), attendance, shifts, open/close shift control.
- **Announcement broadcast**: bell icon, manager send, waiter banner with 15s poll.

## Phase 4 — Supporting screens
- **Bookings** (Screen 7), **Reports** (Screen 9, all 9 report types), **Settings** (Screen 10, all 6 tabs incl. EN/ML i18n via localStorage + dictionary).

---

## Technical notes
- TanStack Start file routes under `src/routes/` with `_authenticated` layout per role.
- Server functions (`createServerFn` + `requireSupabaseAuth`) for all mutations; browser client for realtime subscriptions.
- Real-time: Supabase channels on `tables`, `orders`, `notifications`, `announcements`.
- Charts: `chart.js` + `react-chartjs-2`.
- i18n: lightweight dictionary in `src/lib/i18n.ts` driven by user `language_preference`.
- Photo upload: Cloud Storage bucket `dish-photos` (public read).
- `restaurant_status` view exposed via `/api/public/restaurant-status` for the customer app.

---

## What I need from you
1. **Confirm I should enable Lovable Cloud** (required — no backend means no auth, orders, real-time).
2. **Confirm phased delivery** — I ship Phase 1, you test, then I continue. (If you want it all in one go anyway, say so; it'll be a much longer single response and harder to course-correct.)
3. Anything to cut or defer? (e.g. Reports and Bookings are large; could be Phase 4-only or stubbed.)

Reply "go" to start Phase 1 with defaults above.