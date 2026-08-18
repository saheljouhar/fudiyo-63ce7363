# ORBIS Table Manager

Build a complete restaurant management system called "ORBIS" — 
a professional, modern POS and operations platform for Indian 
restaurants. The design must feel premium and distinctly 
different from basic POS software.

════════════════════════════════════════
DESIGN SYSTEM
════════════════════════════════════════

Color palette:
  Sidebar background:     #111827 (near black)
  Sidebar icons default:  #6B7280 (muted gray)
  Sidebar icons active:   #FFFFFF (white)
  Sidebar active bg:      #1F2937
  Brand primary:          #0D9488 (teal)
  Brand primary hover:    #0F766E
  CTA / action buttons:   #F59E0B (amber)
  CTA hover:              #D97706
  Page background:        #F9FAFB
  Card background:        #FFFFFF
  Card border:            #E5E7EB
  Table available:        #22C55E (green)
  Table occupied:         #EF4444 (red)
  Table bill requested:   #F59E0B (amber)
  Text primary:           #111827
  Text secondary:         #6B7280
  Success:                #16A34A
  Danger:                 #DC2626
  Warning:                #D97706

Typography:
  Font: Inter (import from Google Fonts)
  Base size: 14px
  All inputs, buttons: 14px minimum
  Table numbers: 18px bold
  Stat card numbers: 28px bold
  Section headings: 16px semibold

Border radius: 8px for inputs/buttons, 12px for cards
Box shadows: subtle — 0 1px 3px rgba(0,0,0,0.08)
No gradients. No heavy shadows. Clean flat surfaces.

════════════════════════════════════════
LAYOUT — SHELL
════════════════════════════════════════

The app shell has two parts:
1. A fixed left sidebar (64px wide, icon only)
2. A main content area (fills rest of screen)

The sidebar never collapses. Icons only, no text labels.
Hovering any icon shows a tooltip with the section name.
Active section icon is white. Inactive icons are gray.
Bottom of sidebar: Language toggle (EN / ML for Malayalam),
user avatar, logout icon.

Sidebar icons in order (top to bottom):
  Home (dashboard)
  Tables
  Orders (order taking)
  Kitchen
  Order History
  Menu
  Bookings
  Staff
  Reports
  Settings

Divider line between Orders and Kitchen.
Divider line between Reports and Settings.

════════════════════════════════════════
AUTHENTICATION
════════════════════════════════════════

Login screen: centered card, white, rounded-2xl shadow.
ORBIS logo at top (text logo, teal color).
Email + password fields.
"Sign in" button full width, amber color.
No signup. Accounts created by manager only.

On login detect role from Supabase users table:
  waiter      → goes to Tables screen
  kitchen     → goes to Kitchen screen
  accountant  → goes to Order History / Billing
  manager     → goes to Dashboard

Manager creates all staff from Settings → Staff tab.
Seed one manager: manager@restaurant.com / manager1234

════════════════════════════════════════
SCREEN 1 — DASHBOARD (Home)
════════════════════════════════════════

Header: "Good morning, [name]" + today's date + 
        "Start Taking Orders" amber button top right.

Top row — 4 stat cards (white, shadow, rounded-xl):
  [Tables icon]     Occupied tables    e.g. 8/25
  [₹ icon]         Today's revenue    e.g. ₹18,400
  [Cart icon]       Total orders       e.g. 94
  [Chart icon]      Avg order value    e.g. ₹196

Second row — 2 charts side by side:
  Left:  Revenue Trend — hourly bar chart (teal bars)
  Right: Orders Trend — hourly line chart (amber line)
  Use Chart.js for both charts.

Third row — 2 panels side by side:
  Left:  Top dishes today (list, rank number + name + 
         count sold + revenue)
  Right: Live status panel — 
         "Customer app feed: LIVE" green badge
         Dishes available: X / total
         Current wait estimate: XX mins
         (This is the data feeding our customer app)

Manager sees full dashboard.
Waiter sees simplified version: just their table status.

════════════════════════════════════════
SCREEN 2 — TABLE MANAGEMENT
════════════════════════════════════════

Header: "Table Management" + restaurant name.
Top bar: 
  Left: stat pills — Total: 25 | Available: 19 | 
        Occupied: 5 | Bill Requested: 1
  Right: [Book] [+ Add Table] [Reset All] [QR Codes] buttons

Floor selector tabs below header:
  "All Floors" (default active, teal pill)
  "Ground Floor" with table count
  "+ Add Floor" button

Table grid (responsive, 7 columns on desktop):
Each table card (white, rounded-xl, border, shadow):
  Top left: Table number (bold 18px)
  Top right: Coloured dot (green/red/amber)
  Center: Chair icon (decorative)
  Bottom label: "X Seats" in gray

  If AVAILABLE: green dot, green "Take Order" 
    button (full width, teal)

  If OCCUPIED: red dot, dashed border, shows:
    - "OCCUPIED" badge top right (red pill)
    - Time occupied: "1m", "23m" etc (updates live)
    - "TOTAL ₹XXX" in large amber text (live running 
      total from all orders for that table)
    - Three buttons row: 
        [Print icon] [+ Add] [Bill] (red)

  If BILL REQUESTED: amber dot, amber border

Clicking "Take Order" on available table → 
  marks table occupied, opens Order screen for that table.
Clicking "+ Add" on occupied table → 
  opens Order screen to add more items (new round).
Clicking "Bill" → opens Bill generation screen.

All status changes sync in real time via Supabase.

════════════════════════════════════════
SCREEN 3 — ORDER TAKING
════════════════════════════════════════

This is the most important screen. Three-column layout:

LEFT COLUMN (180px, fixed):
  Scrollable list of categories.
  Each category: text label, item count badge.
  Active category highlighted in teal.
  Categories:
    All Items | Rice Items | Breads | Curries | 
    Beverages | Extras | Specials

CENTRE COLUMN (flexible, main area):
  Header: "Table [X] — Round [N]"
          + Dine In / Takeaway / Delivery toggle pills

  Search bar: "Search dishes, codes..." with keyboard 
  shortcut hint (⌘K)

  Dish grid (4 columns on desktop, 2 on tablet):
    Each dish card (white, rounded-xl, border, 
    subtle shadow):
      - Dish photo (full width, 160px tall, 
        object-cover, rounded-t-xl)
        If no photo: teal placeholder with dish 
        initial letter centered
      - Availability dot (green = available, 
        red = unavailable) overlaid top-left on photo
      - Dish name (14px semibold)
      - Category tag (small pill, gray)
      - Short description (12px gray, 1 line truncate)
      - Price (₹XXX, 14px semibold teal)
      - [+ ADD] button (full width, amber, 36px)
      
    If dish is already in cart: instead of ADD button,
    show: [−] [quantity] [+] row in teal

  Unavailable dishes: grayed out, 50% opacity, 
  ADD button disabled, shows "Unavailable" text.

  Voice Order button: fixed bottom center of 
  this column, teal microphone icon + "Voice Order" 
  text. (UI only for MVP — show "Coming soon" toast)

RIGHT COLUMN (280px, fixed):
  "Order Summary" header
  Table: [T5] pill + Waiter: [name]
  
  Cart items list:
    Each item: name + qty + price
    Tap item to add note (no onion, extra spicy etc)
    Trash icon to remove
  
  Divider + Subtotal row
  GST (5%) row
  TOTAL row (large, bold)
  
  Bottom two buttons:
    [Send to Kitchen] — full width, teal, 48px tall
    [Hold Order] — full width, outlined, gray

  Notes field: "Add order note..." text area (small)

When Send to Kitchen is pressed:
  - Saves to Supabase with waiter_id, table_id, 
    round number, timestamp
  - Shows success toast "Order sent to kitchen 🍳"
  - Right panel clears, stays on same table for 
    adding more items
  - Table status goes to Occupied (red)

════════════════════════════════════════
SCREEN 4 — KITCHEN DISPLAY
════════════════════════════════════════

Full dark background (#111827). White text.
Header: "Kitchen Display" + "[Restaurant] · 
        [X] orders in queue · 🟢 Live"
Right: Date dropdown + Speaker icon + 
       Manual Refresh button

Four status tabs (pill style):
  [New: X] [Cooking: X] [Ready: X] [Done: X]
  Each tab shows live count.

Order cards (dark gray card #1F2937, rounded-xl):
  Top row: 
    "#[order number]" (large bold white)
    "[T3]" table pill (teal)
    "Dine In" badge
    Timer: elapsed time since order placed
    Eye icon (view full order details)
  
  Items list:
    "X ITEM(S)" label
    Each item: "2× Chicken Fried Rice" (white, 16px)
    Item notes in amber: "⚠ No onion"
  
  Bottom: [MARK READY] button (full width, red/teal 
  based on current status)

When new order arrives:
  - Flash entire viewport with amber overlay (200ms)
  - Play beep sound via Web Audio API (440hz, 0.3s)
  - New card slides in at top of New tab with 
    pulsing border for 3 seconds

Card status flow:
  New → press [START COOKING] → moves to Cooking tab 
    (card turns blue tint)
  Cooking → press [MARK READY] → moves to Ready tab 
    (card turns green tint)
  Ready → press [DONE] → moves to Done tab, 
    triggers notification to waiter in Supabase

Kitchen screen requests wake lock on mount 
(screen stays on).

Empty state: "No active orders" in large white text, 
centered, with a subtle chef hat illustration (SVG).

════════════════════════════════════════
SCREEN 5 — ORDER HISTORY & BILLING
════════════════════════════════════════

Header: "Order History"
Top stats row (4 cards):
  Revenue | Orders | Payments breakdown | Completed

Filter bar: 
  [All Status ▼] [All Types ▼] 
  [Today] [Yesterday] [7D] [30D] [Date picker]
  [☐ Mine] checkbox (shows only this waiter's orders)

Order list (one card per order):
  Left: Order number + status badge 
        (Billing Completed — green, 
         In Progress — amber, 
         Voided — red)
        Time placed
  Centre: Table number + Floor + Type (Dine In)
          Item count + item names preview
  Right: Amount + payment method (Cash/UPI)
         [View] [Print] [Edit Order] buttons

Clicking an order expands it to show:
  Full item list with quantities and prices
  GST breakdown
  Discount applied (if any)
  Final total
  Waiter name + table

Accountant billing view:
  Separate tab: [Pending Bills] 
  Shows tables where bill has been requested.
  Each card shows all items across all rounds,
  auto-calculated total, discount field, 
  split bill button (divide by N).
  [PAID — CLEAR TABLE] button (red, full width)
  
  On clear: table goes green, order archived, 
  card removed from pending bills.

Void item: trash icon per item → reason modal 
(Wrong order / Customer changed mind / Other)
Logs to void_log table with waiter name.

════════════════════════════════════════
SCREEN 6 — MENU MANAGEMENT
════════════════════════════════════════

Header: "Menu Management" + dish count + 
        restaurant name
Action row: [Upload] [Photo] [QR Code] 
            [Customize] [Delete All]
            [+ Add New Dish] (amber, right side)

Search bar + [All Types ▼] [All Categories ▼] 
filter dropdowns. Grid/List view toggle.

Dish grid (4 columns):
Each dish card (white, rounded-xl, border):
  - Photo (upload area, 200px tall)
    If no photo: dashed border upload zone with 
    camera icon + "Upload photo" text
  - Top-left on photo: availability dot 
    (green = available, red = unavailable)
  - Dish name (16px semibold)
  - Category tag pill (gray)
  - Description (13px gray, 2 lines)
  - Price (₹XXX, 16px teal semibold)
  - Action icons row (icon buttons, 32px each):
      [Eye] [Star/Featured] [Edit] [Duplicate] 
      [Toggle ON/OFF] [Delete]

Toggle ON/OFF:
  Green = available (shows in order screen and 
          customer app)
  Red = unavailable (hidden from order screen, 
        marked unavailable in customer app feed)
  This is the critical link to customer app.

Add New Dish modal/panel:
  Name, Category (dropdown + add new), 
  Description, Price
  Photo upload (drag & drop or click)
  Available toggle (default ON)
  Save button

Pre-populate with Kerala menu items:
  Rice: Biriyani ₹180, Ghee Rice ₹120, 
        Fried Rice ₹140, Egg Rice ₹100
  Breads: Porotta ₹15, Chapati ₹20, 
          Naan ₹40, Pathiri ₹20
  Curries: Beef Fry ₹160, Chicken Curry ₹140,
           Fish Curry ₹160, Egg Roast ₹80, 
           Mutton Curry ₹200, Dal ₹60
  Beverages: Water ₹20, Tea ₹20, Coffee ₹30, 
             Lime Juice ₹40
  Extras: Pickle ₹10, Papad ₹15, Curd ₹30

════════════════════════════════════════
SCREEN 7 — BOOKINGS (Reservation Bridge)
════════════════════════════════════════

Header: "Bookings" + "All clear today" 
        (if no bookings)
        [+ Add Space] button top right

Two tabs: [Bookings] [Settings]

Date navigation: ← [Today] → [Tomorrow] 
Date picker icon. [All Status ▼] filter.

Booking list (if empty):
  Calendar icon centered
  "Your schedule is clear"
  "Create a space first to start receiving bookings"
  [+ Create Your First Space] teal button

Booking card (when bookings exist):
  Customer name + phone
  Table number + time slot
  Party size
  Status badge (Confirmed/Pending/Arrived/No-show)
  [Seat Now] button → activates table, 
  opens order screen
  [Cancel] [Edit] buttons

Note at top of screen (subtle banner):
  "Bookings from the ORBIS customer app appear 
   here automatically"

This screen is the bridge between our KOT system 
and the customer-facing reservation feature.

════════════════════════════════════════
SCREEN 8 — STAFF
════════════════════════════════════════

Header: "Staff" with tabs:
[Accounts] [Attendance] [Shifts]

ACCOUNTS TAB:
  Staff list (table layout):
    Avatar | Name | Role badge | Email | 
    Status (Active/Inactive) | Actions
  
  Role badges: 
    Waiter (blue) | Kitchen (orange) | 
    Accountant (purple) | Manager (teal)
  
  [+ Add Staff Member] amber button top right:
    Modal: Name, Email, Role dropdown, 
    Temporary password field
    Creates Supabase Auth user + users table row
  
  Per staff row: [Edit] [Deactivate] [Reset Password]

ATTENDANCE TAB:
  Top: date + 4 stat cards:
    Present (green) | Absent (red) | 
    Late (amber) | On Leave (blue)
  
  [+ Add Manual Entry] button
  Staff attendance list for today
  Each row: avatar + name + role + 
  clock-in time + status toggle

SHIFTS TAB:
  Weekly calendar (Mon-Sun)
  Shows current week range
  [+ Add Shift] amber button
  [Copy Week] [Today] navigation
  
  Per staff per day: shift slot (start-end time)
  Color coded by role
  Click slot to edit or delete shift
  
  Shift control:
    [OPEN SHIFT] / [CLOSE SHIFT] large button 
    at top of page. When closed, waiter apps 
    show "Service has ended for today."

════════════════════════════════════════
SCREEN 9 — REPORTS
════════════════════════════════════════

Header: "Reports"
Date range picker: [Start date] to [End date]
"Date range applies to all reports below"

Report grid (3 columns, icon cards):
  Sales Summary | Menu Performance | 
  Staff Performance | Category Sales | 
  Tax Summary | Order Analytics | 
  Payment Analytics | Revenue Trends |
  Dish Availability Log (our unique report — 
  shows which dishes were toggled OFF and when)

Each card: icon + label. Clicking opens that report.

SALES SUMMARY report:
  Top stats: Revenue, Orders, Avg Order Value, 
  Top Table
  Bar chart: revenue by day in date range
  Table: date | orders | revenue | avg

MENU PERFORMANCE report:
  Table: dish name | times ordered | 
  revenue generated | availability % (how often ON)

STAFF PERFORMANCE report:
  Table: waiter name | tables served | 
  orders sent | revenue generated | avg order

TAX SUMMARY report:
  Total revenue excl tax | GST collected | 
  Total incl tax | breakdown by day

════════════════════════════════════════
SCREEN 10 — SETTINGS
════════════════════════════════════════

Header: "Settings"
Tab navigation (horizontal):
  [General] [Tax & Billing] [Print] 
  [Payment] [Customer App] [About]

GENERAL TAB:
  Restaurant name (editable)
  Address
  Phone
  Business type: Restaurant | Cafe | 
  Bar/Pub | Bakery | QSR (pill selector)
  Order types: Dine-in / Takeaway / 
  Delivery (toggles)
  Default order type (pill selector)
  
  Language: 
    [English] [മലയാളം] pill selector
    When Malayalam selected, all UI text switches.
    Store in localStorage and apply globally.

TAX & BILLING TAB:
  GST number field
  Tax rate (default 5%)
  Include tax in price toggle
  Bill header customization (restaurant name 
  on bill, tagline, footer message)

PRINT TAB:
  Paper size: [58mm] [80mm] pill selector
  Printer type: [USB] [Bluetooth] [Network] 
  Test print button
  Auto-print KOT toggle (sends to kitchen 
  printer on order)
  Auto-print bill toggle

PAYMENT TAB:
  Accepted methods: Cash / UPI / Card toggles
  UPI ID field
  Show UPI QR on bill toggle

CUSTOMER APP TAB (unique to us):
  Header: "Live data feed for ORBIS customer app"
  Toggle: "Share live data with customer app" (ON)
  Shows what's being shared:
    ✓ Table occupancy count
    ✓ Estimated wait time
    ✓ Dish availability
  Public API endpoint (read only, shown for devs)
  "This powers the live crowd meter in the 
   ORBIS customer app"

ABOUT TAB:
  App version
  Restaurant ID (for support)
  Contact support button
  Privacy policy link

════════════════════════════════════════
ANNOUNCEMENT BROADCAST
════════════════════════════════════════

Accessible from: top header bar on Manager view.
Bell icon in top right → opens Announcement panel.

Manager types message: "Beef fry finished — 
stop taking orders" → [Send to All Waiters]

On waiter screens: full-width amber banner 
slides down from top with the message.
Waiter can dismiss by tapping X.
Broadcast saves to announcements table in 
Supabase. Waiter app polls every 15 seconds.

════════════════════════════════════════
SUPABASE SCHEMA
════════════════════════════════════════

users: id, email, name, role (enum: waiter/
  kitchen/accountant/manager), is_active, 
  language_preference, created_at

restaurants: id, name, address, phone, 
  business_type, gst_number, tax_rate,
  share_live_data (bool), created_at

tables: id, number, floor, seats, status 
  (enum: available/occupied/bill_requested),
  assigned_waiter_id, occupied_since, 
  updated_at

dishes: id, name, category, description, 
  price, is_available (bool), photo_url, 
  is_featured, is_archived, display_order

orders: id, table_id, waiter_id, waiter_name,
  round, items (json: [{dish_id, dish_name, 
  qty, price, note, is_comp}]), status (enum: 
  pending/cooking/ready/billed/cleared/voided),
  order_type (dine_in/takeaway/delivery),
  subtotal, tax, discount, total, 
  payment_method, created_at, updated_at

notifications: id, target_user_id, message, 
  type (order_ready/bill_request/announcement),
  is_read, created_at

announcements: id, message, sent_by, 
  created_at, expires_at

void_log: id, order_id, dish_name, reason, 
  voided_by, created_at

bookings: id, customer_name, customer_phone, 
  party_size, table_id, booking_time, 
  status (confirmed/arrived/no_show/cancelled),
  source (manual/customer_app), created_at

attendance: id, staff_id, date, status 
  (present/absent/late/on_leave), 
  clock_in, clock_out

shifts: id, staff_id, date, start_time, 
  end_time, created_by

shift_log: id, opened_by, opened_at, 
  closed_by, closed_at

PUBLIC VIEW — restaurant_status (no auth):
  occupied_tables, total_tables, 
  available_tables, estimated_wait_minutes,
  dishes (array of {name, is_available}),
  last_updated

ROW LEVEL SECURITY:
  waiter: read/write own orders, read tables, 
          read dishes, read announcements
  kitchen: read all pending orders, 
           update order status only
  accountant: read all bill_requested orders, 
              update payment/clear table
  manager: full access all tables

════════════════════════════════════════
OFFLINE HANDLING
════════════════════════════════════════

On every screen: detect Supabase connectivity.
If offline: 
  Show fixed red banner at very top: 
  "⚠ No internet connection — working offline. 
   Changes will sync when reconnected."

Waiter can still:
  - View table grid (from cached state)
  - Enter orders (stored locally in 
    localStorage queue)
  - On reconnect: flush queue to Supabase 
    automatically, show success toast 
    "X orders synced successfully"

════════════════════════════════════════
REMAINING DESIGN RULES
════════════════════════════════════════

Mobile / tablet:
  On small screens (<768px): sidebar collapses 
  to bottom tab bar (5 main icons only).
  Order taking screen: single column, 
  category filter at top as horizontal scroll,
  cart shown as floating bottom sheet.

Loading states:
  Skeleton screens (gray animated placeholders) 
  while data loads. Never show empty screens.

Empty states:
  Every list has a helpful empty state with 
  icon + message + action button.

Toasts:
  All actions show toast feedback.
  Success: green left border, bottom right.
  Error: red left border, bottom right.
  Auto dismiss 3 seconds.

Transitions:
  Subtle: 150ms ease for hover states.
  No complex animations that slow interaction.

No splash screen. No onboarding flow.
Login → correct screen immediately.

Inter font must load before rendering 
(use font-display: swap).

All numbers in Indian format: 
₹1,00,000 not ₹100,000.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fudiyo.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0a8fc25e-81c0-491b-8d2c-cad52c7babc4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
