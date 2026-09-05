# SmartServe AI — Complete Project Architecture & Documentation

> **Version:** 1.0.0
> **Stack:** Next.js 15 · React 19 · TypeScript · Prisma · PostgreSQL · Socket.IO · Zustand · TailwindCSS
> **Last Updated:** August 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Database Schema (Prisma)](#5-database-schema-prisma)
6. [User Roles & Access Control](#6-user-roles--access-control)
7. [Frontend Portals & Pages](#7-frontend-portals--pages)
8. [Backend API Routes](#8-backend-api-routes)
9. [Real-Time Communication (Socket.IO)](#9-real-time-communication-socketio)
10. [State Management (Zustand)](#10-state-management-zustand)
11. [Authentication Flow (NextAuth.js)](#11-authentication-flow-nextauthjs)
12. [Full Order Lifecycle Workflow](#12-full-order-lifecycle-workflow)
13. [Key Components Reference](#13-key-components-reference)
14. [Validation Schemas (Zod)](#14-validation-schemas-zod)
15. [Environment Variables](#15-environment-variables)
16. [Docker & Deployment](#16-docker--deployment)
17. [NPM Scripts Reference](#17-npm-scripts-reference)

---

## 1. Project Overview

**SmartServe AI** is an AI-powered, full-stack restaurant and cafe management system. It connects every stakeholder — customers at the table, kitchen staff, counter/cashier, and restaurant management — into a single unified platform.

### What It Does

| Feature | Description |
|---|---|
| **QR Menu Ordering** | Customers scan a QR code at their table, browse the menu, and place orders directly from their phone — no app download required |
| **Kitchen Display System (KDS)** | Real-time kanban board for kitchen staff showing orders as tickets (New → Preparing → Ready → Served) |
| **Smart Billing** | Auto-calculates GST (CGST + SGST), supports bill splitting, multiple payment methods, generates PDF invoices |
| **Analytics & Reports** | Revenue trends, peak hours, top-selling items, customer insights; exportable as PDF or Excel |
| **Multi-Branch Management** | One restaurant can have multiple branches; each branch has its own tables, menu, staff, and orders |
| **Real-Time Sync** | All events (new orders, status changes, waiter calls) are broadcast instantly via WebSockets |
| **Loyalty & Coupons** | Points-based loyalty tier system (Bronze → Silver → Gold → Platinum) and coupon/discount management |
| **Inventory Management** | Track stock levels, set minimum thresholds, manage costs per branch |

---

## 2. Technology Stack

### Core Framework & Language

| Layer | Technology | Version |
|---|---|---|
| Framework | **Next.js** (App Router) | ^15.3.1 |
| Language | **TypeScript** | ^5.8.3 |
| UI Library | **React** | ^19.1.0 |
| Styling | **TailwindCSS** | ^4.1.4 |

### Backend & Database

| Layer | Technology | Version |
|---|---|---|
| ORM | **Prisma** | ^6.6.0 |
| Database | **PostgreSQL** | 16 (via Docker) |
| Cache / Queue | **Redis** | 7 (via Docker) |
| Auth | **NextAuth.js v5** | ^5.0.0-beta.25 |
| Password Hashing | **bcryptjs** | ^2.4.3 |
| Real-Time | **Socket.IO** | ^4.8.1 |

### Frontend Libraries

| Purpose | Library | Version |
|---|---|---|
| Data Fetching | **TanStack Query (React Query)** | ^5.75.0 |
| Global State | **Zustand** | ^5.0.5 |
| Form Handling | **React Hook Form** | ^7.55.0 |
| Validation | **Zod** | ^3.24.4 |
| Animations | **Framer Motion** | ^12.9.2 |
| Icons | **Lucide React** | ^0.511.0 |
| UI Components | **Radix UI** (primitives) | various |
| Charts | **Recharts** | ^2.15.3 |
| Toasts | **React Hot Toast** | ^2.5.2 |
| QR Code | **qrcode**, **qrcode.react** | ^1.5.4 / ^4.2.0 |
| PDF Generation | **jsPDF** | ^2.5.2 |
| Excel Export | **xlsx** | ^0.18.5 |
| Date Utilities | **date-fns** | ^4.1.0 |
| Fonts | **Google Fonts** (Inter, Poppins) | via Next.js |

### Dev Tools

| Tool | Purpose |
|---|---|
| **ESLint** | Code linting |
| **Prettier** | Code formatting (with Tailwind plugin) |
| **Husky** | Git pre-commit hooks |
| **tsx** | TypeScript runner (for seed scripts) |
| **Docker + docker-compose** | Local dev infrastructure |

---

## 3. High-Level Architecture

```
+---------------------------------------------------------------------+
|                        SmartServe AI Platform                       |
|                                                                     |
|  +-------------+  +--------------+  +----------+  +------------+   |
|  |  Customer   |  |   Kitchen    |  | Counter  |  |   Admin    |   |
|  |  (No login) |  |   Display   |  | /Cashier |  | Dashboard  |   |
|  |  /menu/:id  |  |  /kitchen   |  | /counter |  |  /admin/*  |   |
|  +------+------+  +------+-------+  +----+-----+  +-----+------+   |
|         |                |               |               |         |
|         +----------------+---------------+---------------+         |
|                                    |                               |
|                          +---------v------------------+            |
|                          |   Next.js App Layer        |            |
|                          |   (API Routes + SSR)       |            |
|                          +---------+------------------+            |
|                                    |                               |
|              +---------------------+-----------------------+       |
|              |                     |                       |       |
|    +---------v------+  +-----------v-------+  +-----------v----+   |
|    |   PostgreSQL   |  |    Socket.IO      |  |     Redis      |   |
|    |   (via Prisma) |  |  (Real-time sync) |  |   (optional)   |   |
|    +----------------+  +-------------------+  +----------------+   |
+---------------------------------------------------------------------+
```

### Data Flow Summary

```
Customer scans QR --> Sees menu --> Adds to cart --> Places order
       |
       v
POST /api/orders  --> Prisma --> PostgreSQL
       |
       v
Socket.IO emits: order:new
       |
       +--> Kitchen Display (sees new ticket)
       +--> Counter/Cashier (sees new order)
                         |
                         v
              Kitchen updates status
                         |
                         v
Socket.IO emits: order:status
       |
       +--> Customer sees "Preparing" / "Ready"
                         |
                         v
              Cashier generates bill --> POST /api/billing/generate
                         |
                         v
              Payment recorded --> Order marked SERVED
```

---

## 4. Directory Structure

```
SmartServe AI/
|
+-- app/                          # Next.js App Router (pages + API)
|   +-- layout.tsx                # Root HTML layout (fonts, providers, metadata)
|   +-- page.tsx                  # Public landing page (marketing)
|   +-- globals.css               # Global CSS styles
|   |
|   +-- (auth)/                   # Route group: authentication pages
|   |   +-- login/                # Login page
|   |   +-- register/             # Registration page (creates restaurant + admin)
|   |
|   +-- (admin)/                  # Route group: admin portal (protected)
|   |   +-- layout.tsx            # Admin layout with sidebar
|   |   +-- admin/
|   |       +-- dashboard/        # KPI cards + analytics charts + recent orders
|   |       +-- menu/             # Menu item and category management
|   |       +-- orders/           # Order management and history
|   |       +-- tables/           # Table setup and QR code generation
|   |       +-- staff/            # Staff management (add/edit/deactivate)
|   |       +-- inventory/        # Stock tracking per branch
|   |       +-- analytics/        # Detailed analytics and reports
|   |       +-- branches/         # Multi-branch management
|   |       +-- customers/        # Customer CRM and loyalty
|   |       +-- loyalty/          # Loyalty tier configuration
|   |       +-- reports/          # PDF/Excel report export
|   |       +-- settings/         # Restaurant settings
|   |
|   +-- (customer)/               # Route group: customer-facing (no login needed)
|   |   +-- menu/
|   |       +-- [tableId]/        # Dynamic QR menu by table ID
|   |
|   +-- (kitchen)/                # Route group: kitchen display (KITCHEN role)
|   |   +-- kitchen/              # Kanban board: New --> Preparing --> Ready --> Served
|   |
|   +-- (counter)/                # Route group: cashier/counter (CASHIER/MANAGER)
|   |   +-- counter/              # Floor plan + billing panel
|   |
|   +-- api/                      # Backend API routes (REST)
|       +-- auth/
|       |   +-- [...nextauth]/    # NextAuth.js handlers (signIn, signOut, session)
|       |   +-- register/         # POST: register new restaurant + admin user
|       +-- menu/                 # GET: fetch categories+items, POST: create item
|       |   +-- [branchId]/       # GET: menu by branch
|       |   +-- items/            # Item-specific operations
|       +-- orders/               # GET/POST: list and create orders
|       |   +-- [id]/             # GET/PATCH/DELETE: single order operations
|       +-- tables/               # GET/POST: list and create tables
|       +-- staff/                # GET/POST: list and create staff
|       +-- billing/
|       |   +-- generate/         # POST: generate bill from order
|       |   +-- payment/          # POST: record payment for a bill
|       +-- analytics/
|       |   +-- summary/          # GET: KPI summary
|       |   +-- revenue/          # GET: revenue trend data
|       |   +-- top-items/        # GET: top selling items
|       +-- branches/             # GET/POST: manage branches
|       +-- customers/            # GET/POST: customer CRM
|       +-- coupons/              # GET/POST: coupon management
|       +-- inventory/            # GET/POST/PATCH: inventory tracking
|       +-- notifications/        # GET: fetch notifications, POST: mark read
|       +-- socket/               # Socket.IO server initialization endpoint
|
+-- components/                   # All React components
|   +-- admin/
|   |   +-- AnalyticsChart.tsx    # Recharts wrapper (area, bar, pie charts)
|   |   +-- QRGenerator.tsx       # QR code generator using qrcode.react
|   |   +-- Sidebar.tsx           # Admin navigation sidebar
|   |   +-- StaffTable.tsx        # Staff listing table with actions
|   |
|   +-- customer/
|   |   +-- MenuCard.tsx          # Food item card with add/remove buttons
|   |   +-- CartDrawer.tsx        # Slide-in cart panel with order placement
|   |   +-- CategoryFilter.tsx    # Horizontal scrollable category tabs
|   |   +-- OrderTracker.tsx      # Real-time order status tracker
|   |   +-- WaiterRequest.tsx     # FAB: Call Waiter, Request Water, Get Bill
|   |
|   +-- kitchen/
|   |   +-- OrderTicket.tsx       # Order card in KDS with timer and status button
|   |   +-- KitchenStats.tsx      # Stats bar: active orders, avg time, completed
|   |
|   +-- counter/
|   |   +-- TableGrid.tsx         # Color-coded table floor plan grid
|   |   +-- BillGenerator.tsx     # Full billing UI: discounts, split, payment, PDF
|   |
|   +-- shared/
|   |   +-- Providers.tsx         # SessionProvider + QueryClientProvider + ThemeProvider
|   |   +-- Navbar.tsx            # Public marketing navbar
|   |   +-- NotificationBell.tsx  # Bell icon with unread count
|   |   +-- LoadingSpinner.tsx    # Full-page loading spinner
|   |   +-- ThemeToggle.tsx       # Light/dark mode toggle
|   |
|   +-- ui/                       # Radix UI-based reusable primitives
|       (button, card, dialog, input, badge, skeleton, toast, tabs,
|        select, switch, progress, popover, scroll-area, separator,
|        avatar, label)
|
+-- lib/                          # Server-side / shared utilities
|   +-- auth.ts                   # NextAuth configuration
|   +-- prisma.ts                 # Prisma client singleton
|   +-- socket.ts                 # Socket.IO server singleton + event handlers
|   +-- validations.ts            # All Zod schemas
|   +-- constants.ts              # App-wide constants (roles, order flow, tax rates)
|   +-- utils.ts                  # Utility functions (formatCurrency, formatTime, cn)
|
+-- store/                        # Zustand global state stores
|   +-- cartStore.ts              # Customer cart state (persisted to localStorage)
|   +-- orderStore.ts             # Kitchen/counter active orders + stats
|   +-- notificationStore.ts      # Notification list and unread count
|
+-- hooks/                        # Custom React hooks
|   +-- useSocket.ts              # Socket.IO client connection + event listeners
|   +-- useCart.ts                # Cart helper hook
|   +-- useOrders.ts              # Orders data hook
|   +-- useNotifications.ts       # Notification polling/socket hook
|
+-- types/
|   +-- index.ts                  # All TypeScript interfaces
|   +-- next-auth.d.ts            # NextAuth session type augmentation
|
+-- prisma/
|   +-- schema.prisma             # Full database schema (all models + enums)
|   +-- seed.ts                   # DB seeder: restaurant, branch, tables, menu, staff
|
+-- public/
|   +-- manifest.json             # PWA manifest
|   +-- icons/                    # App icons
|
+-- middleware.ts                 # Auth guards + role-based routing
+-- next.config.ts                # Next.js configuration
+-- tailwind.config.ts            # Tailwind theme customization
+-- tsconfig.json                 # TypeScript compiler options
+-- docker-compose.yml            # Docker: PostgreSQL + Redis + App
+-- Dockerfile                    # Production Docker image
+-- .env.example                  # Environment variable template
+-- package.json                  # Dependencies and scripts
```

---

## 5. Database Schema (Prisma)

**Database:** PostgreSQL via Prisma ORM

### Enums

| Enum | Values |
|---|---|
| `UserRole` | SUPERADMIN, ADMIN, MANAGER, KITCHEN, CASHIER, WAITER |
| `OrderStatus` | RECEIVED, PREPARING, READY, SERVED, CANCELLED |
| `TableStatus` | AVAILABLE, OCCUPIED, RESERVED, CLEANING |
| `PaymentMethod` | CASH, UPI, CREDIT_CARD, DEBIT_CARD |
| `PaymentStatus` | PENDING, PAID, FAILED, REFUNDED |

### Entity Relationship Overview

```
Restaurant --< Branch --< Table --< Order --< OrderItem
     |              |         |
     |              |         +-- (status, qrCode)
     |              +--< Category --< MenuItem
     |              +--< Inventory
     |              +--< Notification
     |
     +--< User (staff)
     +--< Customer --< Order
     +--< LoyaltyTier
     +--< Coupon
     +--< Settings
```

### Model Details

#### `User` (staff table)

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | Display name |
| email | String | Unique login email |
| passwordHash | String | bcrypt hashed password |
| role | UserRole | Defines portal access |
| restaurantId | String? | Linked to a Restaurant |
| branchId | String? | Linked to a specific Branch |
| isActive | Boolean | Can disable without deleting |

#### `Restaurant`

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | Restaurant display name |
| slug | String | Unique URL identifier |
| gstNumber | String? | For GST billing |
| currency | String | Default: "INR" |
| timezone | String | Default: "Asia/Kolkata" |

#### `Branch`

| Field | Type | Notes |
|---|---|---|
| id | String | Primary key |
| restaurantId | String | Parent restaurant |
| managerId | String? | Assigned manager (unique per branch) |
| name, address, phone | Strings | Branch contact info |

#### `Table`

| Field | Type | Notes |
|---|---|---|
| id | String | Primary key |
| tableNumber | Int | Unique per branch |
| capacity | Int | Default: 4 seats |
| status | TableStatus | AVAILABLE / OCCUPIED / RESERVED / CLEANING |
| qrCode | String? | QR code data URL |
| qrImage | String? | QR image path |
| currentOrderId | String? | Active order ID |

#### `MenuItem`

| Field | Type | Notes |
|---|---|---|
| id | String | Primary key |
| categoryId | String | Parent category |
| price | Float | Base price |
| isVeg | Boolean | Veg/non-veg indicator |
| isAvailable | Boolean | Toggle visibility on customer menu |
| isFeatured | Boolean | Shows in Featured section |
| isTrending | Boolean | Shows in Trending section |
| isRecommended | Boolean | Shows in Recommended section |
| variants | Json? | e.g. [{ name: "Large", price: 120 }] |
| addons | Json? | e.g. [{ name: "Extra Cheese", price: 30 }] |
| preparationTime | Int? | Minutes to prepare |

#### `Order`

| Field | Type | Notes |
|---|---|---|
| id | String | Primary key |
| tableId | String? | Linked table (null for takeaway) |
| branchId | String | Must be linked to a branch |
| customerId | String? | Optional: linked customer CRM record |
| status | OrderStatus | RECEIVED → PREPARING → READY → SERVED |
| items | Json | Snapshot of ordered items with prices |
| subtotal | Float | Before tax and charges |
| tax | Float | CGST + SGST (5% combined) |
| serviceCharge | Float | Default: 10% |
| discount | Float | Coupon or manual discount |
| total | Float | Final payable amount |
| priority | Boolean | Flag for urgent orders |
| couponCode | String? | Applied coupon |

#### `Bill`

| Field | Type | Notes |
|---|---|---|
| billNumber | String | Unique bill number |
| paymentMethod | PaymentMethod | CASH / UPI / CREDIT_CARD / DEBIT_CARD |
| paymentStatus | PaymentStatus | PENDING → PAID |
| splitCount | Int | Number of ways bill is split |
| paidAt | DateTime? | Timestamp when paid |

#### `Customer` (CRM)

| Field | Type | Notes |
|---|---|---|
| phone | String | Unique per restaurant |
| totalVisits | Int | Incremented on each visit |
| totalSpend | Float | Cumulative spend |
| loyaltyPoints | Int | Earned on purchases |
| tier | String | BRONZE / SILVER / GOLD / PLATINUM |

#### Loyalty Tiers

| Tier | Min Points | Discount | Perks |
|---|---|---|---|
| BRONZE | 0 | 0% | — |
| SILVER | 100 | 5% | Free drink |
| GOLD | 500 | 10% | Free drink + Priority seating |
| PLATINUM | 1000 | 15% | All perks + 15% off |

#### `Coupon`

| Field | Notes |
|---|---|
| code | Unique per restaurant |
| discountType | PERCENTAGE or FLAT |
| discountValue | Amount or percentage |
| minOrder | Minimum cart value to apply |
| maxUses | Total usage cap |
| usedCount | Current usage count |
| expiresAt | Optional expiry date |

---

## 6. User Roles & Access Control

### Role Hierarchy

| Role | Score | Portal | Capabilities |
|---|---|---|---|
| **SUPERADMIN** | 100 | `/admin/*` | Full access across all restaurants |
| **ADMIN** | 80 | `/admin/*` | Full access for their restaurant |
| **MANAGER** | 60 | `/admin/*` + `/counter` | Manage branch, access counter |
| **CASHIER** | 40 | `/counter` | Table management, billing, payments |
| **KITCHEN** | 30 | `/kitchen` | View and update order status |
| **WAITER** | 20 | — | No web portal (assists with orders) |

### Middleware Routing Rules (`middleware.ts`)

| Condition | Behavior |
|---|---|
| `/menu/*` paths | Always public — no auth required |
| `/api/auth` paths | Always public |
| Authenticated `/api/*` | Allowed through |
| Unauthenticated on protected path | Redirected to `/login?callbackUrl=...` |
| KITCHEN on `/admin` | Redirected to `/kitchen` |
| CASHIER on `/admin` | Redirected to `/counter` |
| Non-KITCHEN on `/kitchen` | Redirected to `/admin/dashboard` |
| Non-CASHIER/MANAGER on `/counter` | Redirected to `/admin/dashboard` |

---

## 7. Frontend Portals & Pages

### A. Landing Page (`/`)

Public marketing page:
- Hero section with animated headline and CTA
- Feature cards (6 key features)
- Pricing tiers: Starter (Free), Pro (INR 2,999/mo), Enterprise (custom)
- Testimonials
- CTA: "Get Started Free" → `/register`

### B. Authentication

**`/login`** — Email + password form. Redirects by role after successful login.

**`/register`** — Creates restaurant + first ADMIN user in one step. Fields: name, email, password, restaurantName, phone.

### C. Admin Portal (`/admin/*`)

Protected: ADMIN, MANAGER, SUPERADMIN only. All pages use the sidebar layout.

| Page | Path | Description |
|---|---|---|
| **Dashboard** | `/admin/dashboard` | KPI cards + revenue trend + top items + recent orders. Auto-refreshes every 30s |
| **Menu** | `/admin/menu` | Full CRUD for categories and menu items with variants, addons, and flags |
| **Orders** | `/admin/orders` | Full order history with status filter and search |
| **Tables** | `/admin/tables` | Create tables, view QR codes, manage statuses |
| **Staff** | `/admin/staff` | Invite staff, assign roles and branches, activate/deactivate |
| **Inventory** | `/admin/inventory` | Track stock items, set minimum stock alerts |
| **Analytics** | `/admin/analytics` | Revenue charts, peak hour heatmap, category performance |
| **Branches** | `/admin/branches` | Create branches, assign managers |
| **Customers** | `/admin/customers` | Customer CRM: visits, spend, loyalty points, tier |
| **Loyalty** | `/admin/loyalty` | Configure loyalty tier thresholds and perks |
| **Reports** | `/admin/reports` | Export Sales/Tax/Inventory/Customer reports as PDF or Excel |
| **Settings** | `/admin/settings` | Restaurant profile, GST, currency, theme |

### D. Kitchen Display System (`/kitchen`)

**Role:** KITCHEN only

Full-screen kanban board with 4 columns:

```
+------------------+------------------+------------------+------------------+
|   NEW ORDERS     |    PREPARING     |  READY TO SERVE  |    COMPLETED     |
|  (Blue border)   | (Yellow border)  |  (Green border)  |  (Grey border)   |
+------------------+------------------+------------------+------------------+
|  OrderTicket     |  OrderTicket     |  OrderTicket     |  OrderTicket     |
|  - Table #       |  - Table #       |  - Table #       |  - Table #       |
|  - Items list    |  - Items list    |  - Items list    |  - Items list    |
|  - Time elapsed  |  - Time elapsed  |  - Time elapsed  |  - Time elapsed  |
|  [-> PREPARING]  |  [-> READY]      |  [-> SERVED]     |                  |
+------------------+------------------+------------------+------------------+
```

- **Header:** Branch name + KitchenStats + live clock (updates every second)
- **Real-time:** Socket.IO receives `order:new` and `order:status`
- **Status update:** PATCH `/api/orders/:id` then socket emits `order-updated`

### E. Counter / Cashier (`/counter`)

**Role:** CASHIER, MANAGER

Split layout:
- **Left panel (400px):** Stats bar (revenue, orders, avg order, tables turned) + color-coded table floor plan
- **Right panel:** BillGenerator for the selected occupied table

**Table color coding:**

```
Green = AVAILABLE | Red = OCCUPIED | Blue = RESERVED | Yellow = CLEANING
```

**Billing workflow:**
1. Click an occupied table → loads active order in right panel
2. Apply optional discount (flat or %) or coupon
3. Set split count (1-10 splits), payment method
4. POST `/api/billing/generate` → order marked SERVED
5. PDF invoice generated via jsPDF

### F. Customer Menu (`/menu/[tableId]`)

**No login required.** Accessed by scanning table QR code.

- **Header:** Logo + table badge + cart icon with item count
- **Search bar:** Live filter across item names and descriptions
- **Category filter:** Horizontal scrollable category pills
- **Content sections:**
  - Featured (horizontal carousel)
  - Trending (2-column grid)
  - Recommended (2-column grid)
  - Full menu by category (2-column grid)
- **CartDrawer:** Slide-in cart with qty controls, coupon, special instructions, "Place Order" button
- **OrderTracker:** Modal with real-time animated status progress
- **WaiterRequest FAB:** Floating buttons — Call Waiter / Request Water / Request Bill

---

## 8. Backend API Routes

All API routes live under `app/api/`. Standard response shape:

```typescript
{ success: boolean, data?: T, error?: string, message?: string, meta?: { total, page, limit } }
```

### Auth Routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create new restaurant + admin user |
| GET/POST | `/api/auth/[...nextauth]` | — | NextAuth sign-in/out/session handlers |

### Menu Routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/menu?tableId=&branchId=` | No | Fetch categories + items by table or branch |
| POST | `/api/menu` | Yes | Create a new menu item |
| GET | `/api/menu/[branchId]` | Yes | Get full menu for a specific branch |
| PATCH | `/api/menu/items/[id]` | Yes | Update a menu item |
| DELETE | `/api/menu/items/[id]` | Yes | Delete a menu item |

### Order Routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/orders?branchId=&status=&limit=` | Yes | List orders with optional filters |
| POST | `/api/orders` | No* | Place a new order (from customer QR page) |
| GET | `/api/orders/[id]` | Yes | Fetch a single order with items |
| PATCH | `/api/orders/[id]` | Yes | Update order status (kitchen workflow) |
| DELETE | `/api/orders/[id]` | Yes | Cancel an order |

> *Customer ordering passes `branchId` + `tableId` without requiring login

### Table Routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tables?branchId=` | Yes | List all tables for a branch |
| POST | `/api/tables` | Yes | Create a new table |
| PATCH | `/api/tables/[id]` | Yes | Update table status or details |

### Staff Routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/staff?branchId=` | Yes | List staff members |
| POST | `/api/staff` | Yes | Create a new staff account |
| PATCH | `/api/staff/[id]` | Yes | Update staff details or role |
| DELETE | `/api/staff/[id]` | Yes | Deactivate a staff account |

### Billing Routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/billing/generate` | Yes | Generate a bill from an order (applies discounts, splits) |
| POST | `/api/billing/payment` | Yes | Record a payment for a bill |

### Analytics Routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics/summary?branchId=` | Yes | KPIs: revenueToday, ordersToday, activeTables, newCustomers, revenueTrend, topItems, peakHours |
| GET | `/api/analytics/revenue?period=` | Yes | Revenue breakdown (daily/weekly/monthly) |
| GET | `/api/analytics/top-items` | Yes | Top selling items by count and revenue |

### Other Routes

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/branches` | List or create branches |
| GET/POST | `/api/customers` | List or create customer CRM records |
| GET/POST | `/api/coupons` | Manage discount coupons |
| GET/POST/PATCH | `/api/inventory` | Manage inventory stock levels |
| GET/POST | `/api/notifications` | Fetch notifications / mark as read |
| GET | `/api/socket` | Socket.IO server initialization |

---

## 9. Real-Time Communication (Socket.IO)

### Server Configuration (`lib/socket.ts`)

- Runs as a **singleton** on the same HTTP server as Next.js
- Mounted at path `/api/socket`
- CORS origin: `NEXT_PUBLIC_APP_URL`

### Socket Rooms (auto-joined on connect)

| Query Parameter | Room | Who Connects |
|---|---|---|
| `branchId` | `branch-{branchId}` | All staff at that branch |
| `role=KITCHEN` | `kitchen-{branchId}` | Kitchen display screens |
| `role=CASHIER` or `MANAGER` | `counter-{branchId}` | Counter/cashier screens |
| `tableId` | `table-{tableId}` | Customer on that table |

### Socket Events

#### Client emits → Server handles → Broadcasts to rooms

| Client Event | Payload | Broadcast To | Receiver Event |
|---|---|---|---|
| `order:new` | `{ order, tableId, branchId }` | kitchen + counter + table | `order:new` |
| `order:status` | `{ orderId, status, tableId, branchId }` | kitchen + counter + table | `order:status` |
| `waiter:called` | `{ tableId, branchId }` | counter | `waiter:called` |
| `bill:requested` | `{ tableId, branchId }` | counter | `bill:requested` |
| `water:requested` | `{ tableId, branchId }` | counter | `water:requested` |
| `table:updated` | `{ tableId, status, branchId }` | counter | `table:updated` |
| `kitchen:stats` | `{ stats }` | kitchen | `kitchen:stats` |
| `notification:new` | `{ notification }` | all branch staff | `notification:new` |

### Client Hook (`hooks/useSocket.ts`)

```typescript
// Usage:
const { socket, emit } = useSocket({ branchId, tableId, role, enabled });

// What it does:
// - Connects to Socket.IO server using NEXT_PUBLIC_SOCKET_URL
// - Subscribes to order:new, order:status, notification:new
// - Updates Zustand stores (orderStore, notificationStore) on events
// - Auto-disconnects on component unmount (cleanup in useEffect return)
```

---

## 10. State Management (Zustand)

### `store/cartStore.ts` — Customer Cart

**Persisted** to `localStorage` with key `smartserve-cart`.

| State Field | Type | Description |
|---|---|---|
| `items` | CartItem[] | Items with quantity, notes, variants, addons |
| `tableId` | string | null | Current table ID |
| `branchId` | string | null | Current branch ID |
| `restaurantId` | string | null | Current restaurant ID |
| `specialInstructions` | string | Special order notes |
| `couponCode` | string | Applied coupon code |

**Actions:** addItem, removeItem, updateQuantity, updateNotes, clearCart, setTableId, setBranchId, setRestaurantId, setSpecialInstructions, setCouponCode

**Computed getters:** `getTotal()` (subtotal + 5% tax), `getSubtotal()`, `getCount()`, `getItemQuantity(id)`

---

### `store/orderStore.ts` — Kitchen/Counter Orders

| State Field | Type | Description |
|---|---|---|
| `activeOrders` | Order[] | Current active orders for the branch |
| `stats` | KitchenStats | Active count, avg prep time, completed count |

**Actions:** setOrders, addOrder, updateOrderStatus, removeOrder

---

### `store/notificationStore.ts` — Notifications

| State Field | Type | Description |
|---|---|---|
| `notifications` | NotificationPayload[] | All notifications for current session |
| `unreadCount` | number | Number of unread notifications |

**Actions:** addNotification, markRead, markAllRead, clearAll

---

## 11. Authentication Flow (NextAuth.js)

**Provider:** Credentials (email + password)
**Session strategy:** JWT (stateless — no server-side session DB needed)

### Login Flow

```
1. User submits email + password on /login
2. NextAuth credentials.authorize() called
3. Validates with Zod loginSchema
4. Prisma: user.findUnique({ where: { email } })
5. Checks user.isActive === true
6. bcryptjs.compare(password, user.passwordHash)
7. Returns: { id, name, email, role, image, restaurantId, branchId, restaurantName, branchName }
8. jwt() callback stores all fields in the JWT token
9. session() callback exposes them on session.user
10. Middleware reads session.user.role and routes to correct portal
```

### JWT Token Contents

```
{
  id, role, restaurantId, branchId, restaurantName, branchName,
  name, email, picture, sub, iat, exp  (standard NextAuth fields)
}
```

### Session Augmentation

`types/next-auth.d.ts` extends the default NextAuth `Session` type to add:
`role`, `restaurantId`, `branchId`, `restaurantName`, `branchName`

---

## 12. Full Order Lifecycle Workflow

```
STEP 1  Customer arrives and scans QR code on table
        --> Browser opens: /menu/{tableId}

STEP 2  Menu page loads
        --> GET /api/menu?tableId={tableId}
        --> Prisma: table.findUnique --> get branchId
        --> Prisma: parallel fetch categories + menuItems (isAvailable=true)
        --> cartStore.setTableId() + setBranchId() called

STEP 3  Customer browses, adds items to cart
        --> cartStore.addItem() called on each addition
        --> Cart persisted in localStorage automatically

STEP 4  Customer opens CartDrawer, reviews order, taps "Place Order"
        --> POST /api/orders {
              tableId, branchId, items[], subtotal, tax, serviceCharge, total,
              notes, couponCode
            }
        --> Prisma: order.create() + orderItems.create() (batch insert)
        --> Prisma: table.update({ status: OCCUPIED, currentOrderId: order.id })
        --> Response: { success: true, data: order }
        --> Socket.IO emits "order:new" to kitchen + counter rooms

STEP 5  Kitchen Display receives new ticket
        --> socket "order:new" event --> orderStore.addOrder()
        --> Ticket appears in "New Orders" column
        --> Kitchen staff taps [-> PREPARING]
        --> PATCH /api/orders/{id} { status: "PREPARING" }
        --> Prisma: order.update(status: PREPARING)
        --> Socket.IO emits "order:status" to counter + table

STEP 6  Customer's OrderTracker updates to "Preparing..."
        --> socket "order:status" received on table room
        --> Progress bar animates to step 2

        Kitchen finishes cooking:
        --> Staff taps [-> READY]
        --> PATCH /api/orders/{id} { status: "READY" }
        --> Socket "order:status" emits READY
        --> Customer sees "Ready! Enjoy your meal"
        --> Counter alerted to serve

STEP 7  Food served:
        --> PATCH /api/orders/{id} { status: "SERVED" }

STEP 8  Billing
        --> Counter selects table in floor plan (shows red/occupied)
        --> BillGenerator loads the active order
        --> Cashier optionally applies discount or coupon code
        --> Sets split count (e.g. split 2 ways = per-person amount shown)
        --> Selects payment method (Cash / UPI / Card)
        --> POST /api/billing/generate {
              orderId, discount, discountType, paymentMethod, splitCount
            }
        --> Prisma: bill.create() + payment.create()
        --> Prisma: table.update({ status: AVAILABLE, currentOrderId: null })
        --> PDF invoice generated client-side via jsPDF

STEP 9  Order complete
        --> cartStore.clearCart()
        --> Table becomes green (Available) in real-time via socket
        --> Analytics data updated for next dashboard refresh
```

---

## 13. Key Components Reference

### `CartDrawer.tsx`

- Slide-in drawer from right side of screen
- Shows cart items with quantity increment/decrement controls
- Coupon code input with validation
- Special instructions textarea
- Bill summary: subtotal + GST (5%) + service charge + discount = total
- "Place Order" button → POST `/api/orders` → `onOrderPlaced(order)` callback
- On success: clears cart, opens OrderTracker

### `BillGenerator.tsx`

- Full billing UI for counter/cashier staff
- Read-only order item list with prices
- Discount section: choose Flat or Percentage, enter value
- Bill split: dropdown 1-10, shows per-person amount dynamically
- Payment method: Cash / UPI / Credit Card / Debit Card
- Final bill summary with all calculations
- "Generate Bill" → POST `/api/billing/generate`
- "Download Invoice" → jsPDF generates a formatted receipt
- UPI QR code auto-shown when UPI is selected

### `OrderTicket.tsx`

- Kitchen order card/ticket
- Shows: Table #, Order ID (last 6 chars), time elapsed since received
- Timer color: green (<10 min), yellow (10-20 min), red (>20 min)
- Item list with quantities and any special notes
- One action button: next status in flow (RECEIVED→PREPARING→READY→SERVED)

### `AnalyticsChart.tsx`

- Recharts wrapper supporting `area`, `bar`, and `pie` chart types
- Props: `data`, `type`, `height`, `dataKey`, `xKey`
- Used in admin dashboard (revenue trend + top items) and analytics page

### `QRGenerator.tsx`

- Uses `qrcode.react` to render QR code as SVG or PNG
- QR value: `{NEXT_PUBLIC_APP_URL}/menu/{tableId}`
- Supports download as PNG
- Used in admin Tables management page

### `WaiterRequest.tsx`

- Floating action button panel at bottom of customer menu page
- Three socket-powered buttons:
  - **Call Waiter** → emits `waiter:called`
  - **Request Water** → emits `water:requested`
  - **Request Bill** → emits `bill:requested`
- Counter staff see these as real-time alert notifications

### `Providers.tsx`

- Root provider wrapper applied in `app/layout.tsx`
- Wraps: `SessionProvider` (NextAuth) + `QueryClientProvider` (React Query) + `ThemeProvider` (next-themes)

### `Sidebar.tsx`

- Admin portal navigation sidebar
- Shows logged-in user info (name, role, branch)
- Navigation links: Dashboard, Menu, Orders, Tables, Staff, Inventory, Analytics, Branches, Customers, Loyalty, Reports, Settings
- Highlight active route
- Logout button at bottom

---

## 14. Validation Schemas (Zod)

All schemas are in `lib/validations.ts`:

| Schema | Purpose & Key Rules |
|---|---|
| `loginSchema` | email (valid email) + password (non-empty) |
| `registerSchema` | name (2+ chars), email, password (8+ chars, 1 uppercase, 1 number), restaurantName, phone (10+ chars) |
| `menuItemSchema` | name, categoryId, price (positive), isVeg, isAvailable, variants/addons arrays, feature flags |
| `orderSchema` | tableId, branchId, items array (min 1), subtotal/tax/total (positive), optional notes/couponCode |
| `orderStatusSchema` | status must be one of: RECEIVED, PREPARING, READY, SERVED, CANCELLED |
| `billSchema` | orderId, discount (min 0), discountType (PERCENTAGE/FLAT), paymentMethod enum, splitCount (int, min 1) |
| `categorySchema` | name (required), optional image, sortOrder (int) |
| `tableSchema` | tableNumber (positive int), capacity (positive int, default 4) |
| `inventorySchema` | name, unit, currentStock/minStock/costPrice (all min 0), optional category |
| `staffSchema` | name (2+ chars), email, role (MANAGER/KITCHEN/CASHIER/WAITER only), optional phone, branchId |
| `couponSchema` | code, discountType, discountValue (positive), minOrder, maxUses (positive int), optional expiresAt |
| `analyticsFilterSchema` | optional startDate/endDate/branchId, period (daily/weekly/monthly, default: daily) |

---

## 15. Environment Variables

Copy `.env.example` to `.env.local`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smartserve?schema=public"

# Authentication
NEXTAUTH_SECRET="your-super-secret-key"     # Strong random string for production
NEXTAUTH_URL="http://localhost:3000"         # Full base URL

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"   # Same as app URL if Socket.IO is on same server

# Optional: Supabase (alternative to direct PostgreSQL)
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_KEY=""

# Optional: SMTP Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Optional: Razorpay Payment Gateway
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
NEXT_PUBLIC_RAZORPAY_KEY=""
```

---

## 16. Docker & Deployment

### Docker Compose Services

| Service | Image | Port | Description |
|---|---|---|---|
| **postgres** | postgres:16-alpine | 5432 | PostgreSQL with health check (pg_isready) |
| **redis** | redis:7-alpine | 6379 | Redis cache with health check (redis-cli ping) |
| **app** | Local Dockerfile | 3000 | Next.js app (depends on postgres + redis being healthy) |

### Common Docker Commands

```bash
# Start all services
docker-compose up -d

# Watch app logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v
```

### Production Deployment

1. Provision a PostgreSQL database (Supabase, Neon, Railway, AWS RDS)
2. Set all environment variables on your host
3. Run `npm run db:migrate` to apply schema
4. Run `npm run db:seed` to populate initial data
5. Run `npm run build`
6. Run `npm run start`

> **IMPORTANT:** Socket.IO requires a persistent server (long-lived HTTP connection).
> It does NOT work on serverless platforms like Vercel.
> Use Railway, Render, Fly.io, or a VPS/EC2 instance.

---

## 17. NPM Scripts Reference

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start dev server with HMR on port 3000 |
| `build` | `next build` | Build optimized production bundle |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint checks |
| `format` | `prettier --write .` | Auto-format all files |
| `db:generate` | `prisma generate` | Regenerate Prisma client after schema changes |
| `db:push` | `prisma db push` | Push schema to DB without creating migration file |
| `db:migrate` | `prisma migrate dev` | Create and apply a new named migration |
| `db:seed` | `tsx prisma/seed.ts` | Seed DB with sample data (restaurant, staff, tables, menu) |
| `db:studio` | `prisma studio` | Open Prisma Studio browser GUI for DB inspection |

---

## Quick Reference: Pricing & Tax Calculation

```
Subtotal         = Sum of (item.price x quantity) for all cart items
Tax              = Subtotal x 5%   (CGST 2.5% + SGST 2.5%)
Service Charge   = Subtotal x 10%
Discount         = Flat amount OR percentage of subtotal (applied via coupon or manual)
Total            = Subtotal + Tax + Service Charge - Discount
Per-Split Amount = Total / splitCount
```

---

## Quick Reference: Order Status Flow

```
Customer places order:
   RECEIVED
      |
      +--> [Kitchen accepts] --> PREPARING
      |         |
      |         +--> [Kitchen finishes] --> READY
      |                   |
      |                   +--> [Served to table] --> SERVED (terminal)
      |
      +--> [Cancelled anytime before READY] --> CANCELLED (terminal)
```

---

*This document was auto-generated by analyzing the complete SmartServe AI codebase including all frontend pages, API routes, database schema, components, hooks, stores, middleware, and deployment configuration.*
