# 🔍 Project Analysis & Restructuring Plan — ai-learn-hub-22

## สรุปภาพรวม

โปรเจกต์นี้เป็น **AI-Powered Online Learning Platform** (คล้าย Udemy) ที่สร้างด้วย **TanStack Start + React + Supabase + Stripe + Gemini AI** มี AI Avatar (WebAvatar) ฝังอยู่ด้วย ปัญหาหลักคือ **ไฟล์ใหญ่เกินไป ไม่มีการแบ่ง folder ตาม feature/domain** ทำให้ maintain ยาก

---

## 🏗️ โครงสร้างปัจจุบัน (Current Structure)

```
src/
├── components/          # 10 files + ui/  ← ปนกัน ไม่มี sub-folder
│   ├── ui/              # 49 shadcn components (OK ✅)
│   ├── certificate-card.tsx
│   ├── dashboard-finance.tsx
│   ├── quiz-editor.tsx (17KB)
│   ├── quiz-player.tsx (15KB)
│   ├── selection-term-explainer.tsx
│   ├── site-footer.tsx (14KB)
│   ├── site-header.tsx (19KB)
│   ├── site-layout.tsx
│   ├── web-avatar.tsx (23KB)      ← AI Avatar
│   └── placeholder.tsx
│
├── hooks/               # 1 file only
│   └── use-mobile.tsx
│
├── lib/                 # 29 files flat ← ทุกอย่างปนกัน ❌
│   ├── ai.ts (34KB)           ← Gemini AI ทุกอย่าง
│   ├── i18n.tsx (40KB)        ← translations ทั้งหมด
│   ├── stripe.ts (12KB)      ← Stripe integration
│   ├── admin.ts (13KB)       ← Admin server fns
│   ├── organizations.ts (13KB) ← B2B org logic
│   ├── courses.ts (14KB)     ← Course CRUD
│   ├── support.ts (8KB)      ← Support/ticket system
│   ├── storage.ts (7KB)      ← File upload/storage
│   ├── auth.tsx (6KB)        ← Auth provider
│   ├── config.ts             ← Hardcoded secrets ⚠️
│   ├── database.types.ts (37KB) ← Supabase generated
│   └── ... 18 more files
│
├── routes/              # 20 files flat ← Monster files ❌❌
│   ├── admin.index.tsx (225KB / 5,042 lines) 🔴🔴🔴
│   ├── courses.$courseId.index.tsx (136KB / 2,895 lines) 🔴🔴
│   ├── dashboard.tsx (132KB / 2,829 lines) 🔴🔴
│   ├── organization.tsx (101KB / 2,224 lines) 🔴🔴
│   ├── pricing.tsx (46KB) 🔴
│   ├── browse.tsx (33KB) 🟡
│   ├── create.tsx (30KB) 🟡
│   ├── about.tsx (27KB) 🟡
│   └── ... 12 more files
│
├── server-runtime/      # 7 files (OK-ish ✅)
│   ├── webhook.ts
│   ├── fulfillment.ts
│   ├── payments.ts
│   ├── stripe.ts
│   ├── env.ts
│   ├── ssr.ts
│   └── webhook-log.ts
│
└── styles.css
```

---

## 🚨 ปัญหาหลักที่พบ

### 1. **Route Files เป็น God Files** 🔴🔴🔴

ไฟล์ route แต่ละไฟล์มี **ทุกอย่าง** — UI components, business logic, hooks, state management, types — รวมกันหมด:

| File | Lines | Size | ปัญหา |
|------|-------|------|-------|
| [admin.index.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/admin.index.tsx) | **5,042** | 225KB | Admin panel ทั้งหมดอยู่ไฟล์เดียว |
| [courses.$courseId.index.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/courses.$courseId.index.tsx) | **2,895** | 136KB | Course detail + editor + settings |
| [dashboard.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/dashboard.tsx) | **2,829** | 132KB | Dashboard ทุก tab อยู่ไฟล์เดียว |
| [organization.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/organization.tsx) | **2,224** | 101KB | B2B org management ทั้งหมด |
| [pricing.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/pricing.tsx) | — | 46KB | Pricing + comparison |

### 2. **`src/lib/` ไม่มีการแบ่ง domain** 🔴

29 ไฟล์ flat ใน folder เดียว ปนกัน:
- **Client-side** (auth, supabase, utils, i18n)
- **Server functions** (ai, admin, stripe, payments)
- **External service integrations** (stripe, storage, ai)
- **Data layer** (courses, lessons, modules, enrollments, quizzes)
- **Generated types** (database.types.ts)

### 3. **`src/components/` ไม่แยกตาม feature** 🟡

Components ที่ควรอยู่ใกล้ feature ของมันกลับอยู่ flat:
- `quiz-editor.tsx` / `quiz-player.tsx` → ควรอยู่กับ quiz feature
- `dashboard-finance.tsx` → ควรอยู่กับ dashboard
- `web-avatar.tsx` → ควรมี folder เฉพาะ
- `certificate-card.tsx` → ควรอยู่กับ certificate feature

### 4. **ไม่มี custom hooks สำหรับ business logic** 🟡

มีแค่ `use-mobile.tsx` ทั้งที่ route files ทุกไฟล์มี business logic (queries, mutations, state) ที่ซ้ำกัน

---

## 📦 สรุปส่วนหลักของโปรเจกต์

### A. Frontend (Client-Side)

| ส่วน | ไฟล์ปัจจุบัน | คำอธิบาย |
|------|-------------|---------|
| **Landing Page** | [index.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/index.tsx) | หน้าแรก hero + features |
| **Browse/Catalog** | [browse.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/browse.tsx) | ค้นหา/กรองคอร์ส |
| **Course Detail** | [courses.$courseId.index.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/courses.$courseId.index.tsx) | รายละเอียดคอร์ส + จัดการ lesson/module |
| **Course Learn** | [courses.$courseId.learn.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/courses.$courseId.learn.tsx) | หน้าเรียน |
| **Lesson Player** | [courses.$courseId.lessons.$lessonId.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/courses.$courseId.lessons.$lessonId.tsx) | เล่น lesson + quiz |
| **Dashboard** | [dashboard.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/dashboard.tsx) | Dashboard ผู้ใช้ (enrolled courses, created courses, support, AI chat, settings) |
| **Create Course** | [create.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/create.tsx) | สร้างคอร์สใหม่ |
| **AI Generate** | [generate.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/generate.tsx) | AI สร้างคอร์สอัตโนมัติ |
| **Admin Panel** | [admin.index.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/admin.index.tsx) | จัดการ users, courses, payments, reports, coupons, settings |
| **Organization B2B** | [organization.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/organization.tsx) | จัดการ organization, members, packages |
| **Pricing** | [pricing.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/pricing.tsx) | Subscription plans |
| **Checkout** | [checkout.$courseId.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/checkout.$courseId.tsx) | ชำระเงิน |
| **Auth** | [login.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/login.tsx) | Login/Register |
| **Certificate** | [verify.$courseId.$fileName.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/verify.$courseId.$fileName.tsx), [verify.$id.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/verify.$id.tsx) | ตรวจสอบใบประกาศ |
| **Static Pages** | [about.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/about.tsx), [privacy.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/privacy.tsx), [terms.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/terms.tsx) | About, Privacy, Terms |
| **Layout** | [__root.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/__root.tsx), [site-header.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/components/site-header.tsx), [site-footer.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/components/site-footer.tsx) | Root layout + header + footer |
| **UI Components** | [src/components/ui/](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/components/ui) (49 files) | Shadcn/UI component library |
| **i18n** | [i18n.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/i18n.tsx) (40KB) | EN/TH translations |

### B. Backend (Server-Side via TanStack Start Server Functions)

| ส่วน | ไฟล์ปัจจุบัน | คำอธิบาย |
|------|-------------|---------|
| **Auth (Server)** | [server-auth.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/server-auth.ts) | Session validation, requireUser/requireAdmin |
| **Courses CRUD** | [courses.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/courses.ts) | Create/read/update/delete courses (server fns) |
| **Lessons CRUD** | [lessons.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/lessons.ts) | Lesson management |
| **Modules CRUD** | [modules.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/modules.ts) | Module management |
| **Enrollments** | [enrollments.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/enrollments.ts) | Enrollment check/create |
| **Quizzes** | [quizzes.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/quizzes.ts) | Quiz CRUD + scoring |
| **Progress** | [progress.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/progress.ts) | Lesson progress tracking |
| **Reviews** | [reviews.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/reviews.ts) | Course reviews |
| **Certificates** | [certificates.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/certificates.ts) | Certificate generation |
| **Admin** | [admin.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/admin.ts) | Platform stats, revenue, user management |
| **Payments** | [payments.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/payments.ts) | Payment records |
| **Support** | [support.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/support.ts) | Support ticket system |
| **Moderation** | [moderation.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/moderation.ts) | Content reports |
| **Coupons** | [coupons.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/coupons.ts) | Coupon management |
| **Organizations** | [organizations.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/organizations.ts) | B2B organization management |
| **Validation** | [validation.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/validation.ts) | Input validation schemas |
| **Plagiarism** | [plagiarism.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/plagiarism.ts) | Content plagiarism check |

### C. External Services Integration

| Service | ไฟล์ปัจจุบัน | คำอธิบาย |
|---------|-------------|---------|
| **Supabase (Database + Auth)** | [supabase.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/supabase.ts), [database.types.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/database.types.ts) | DB client + generated types |
| **Stripe (Payments)** | [stripe.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/stripe.ts) (client-side), [server-runtime/stripe.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/server-runtime/stripe.ts), [server-runtime/webhook.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/server-runtime/webhook.ts) | Checkout, webhooks, refunds |
| **Gemini AI** | [ai.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/ai.ts) (34KB) | Course generation, quiz generation, image gen, metadata gen, learning path |
| **Supabase Storage** | [storage.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/storage.ts) | File upload, signed URLs |

### D. AI Avatar (WebAvatar)

| ส่วน | ไฟล์ | คำอธิบาย |
|------|------|---------|
| **WebAvatar Component** | [web-avatar.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/components/web-avatar.tsx) (23KB) | React wrapper สำหรับ WebAvatar SDK ที่โหลดจาก `webavatar.didthat.cc` — มี avatar selector modal, drag/resize, SPA navigation listener |
| **External SDK** | `chat-widget.js` (773KB ที่ root) | SDK file ที่ built มาแล้ว |
| **Integration Guide** | [INTEGRATION_GUIDE_REALTIME.md](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/INTEGRATION_GUIDE_REALTIME.md) | เอกสาร integration สำหรับ realtime voice modes |

จากการอ่าน Integration Guide → เน้นเรื่อง semantic HTML tags (`aria-label`, `<section>`, `<nav>`, etc.) เพื่อให้ AI scanner อ่าน DOM ได้ ซึ่งคุณบอกว่าแก้ไปแล้วส่วนใหญ่ ไม่ต้องเพิ่ม tag อีก ✅

### E. Server Runtime (Cloudflare Workers)

| ส่วน | ไฟล์ | คำอธิบาย |
|------|------|---------|
| **Stripe Webhook** | [webhook.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/server-runtime/webhook.ts) | รับ Stripe webhook events |
| **Fulfillment** | [fulfillment.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/server-runtime/fulfillment.ts) | Provision enrollments, B2B seats |
| **Payments** | [payments.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/server-runtime/payments.ts) | Record payment to DB |
| **Env** | [env.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/server-runtime/env.ts) | Environment variable resolution |
| **SSR** | [ssr.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/server-runtime/ssr.ts) | Server-side rendering setup |
| **Stripe Client** | [stripe.ts](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/server-runtime/stripe.ts) | Stripe client init for server |

### F. Database (Supabase Migrations)

- **58 migration files** ใน [supabase/migrations/](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/supabase/migrations) — ส่วนนี้ OK ไม่ต้องเปลี่ยนโครงสร้าง

---

## ✅ Proposed New Structure

```
src/
├── components/
│   ├── ui/                          # ✅ Shadcn (keep as-is)
│   ├── layout/                      # 🆕 Layout components
│   │   ├── site-header.tsx
│   │   ├── site-footer.tsx
│   │   └── site-layout.tsx
│   ├── course/                      # 🆕 Course-related components
│   │   ├── course-card.tsx          # (extracted from browse.tsx)
│   │   ├── course-curriculum.tsx    # (extracted from courses.$courseId)
│   │   ├── course-settings.tsx      # (extracted from courses.$courseId)
│   │   ├── lesson-editor.tsx        # (extracted from courses.$courseId)
│   │   └── module-editor.tsx        # (extracted from courses.$courseId)
│   ├── quiz/                        # 🆕 Quiz components
│   │   ├── quiz-editor.tsx
│   │   └── quiz-player.tsx
│   ├── dashboard/                   # 🆕 Dashboard tab components
│   │   ├── dashboard-overview.tsx   # (extracted from dashboard.tsx)
│   │   ├── dashboard-courses.tsx    # (my courses tab)
│   │   ├── dashboard-enrollments.tsx # (enrolled courses tab)
│   │   ├── dashboard-support.tsx    # (support tab)
│   │   ├── dashboard-ai-chat.tsx    # (AI chat tab)
│   │   ├── dashboard-settings.tsx   # (settings tab)
│   │   └── dashboard-finance.tsx    # ← already exists
│   ├── admin/                       # 🆕 Admin panel components
│   │   ├── admin-sidebar.tsx
│   │   ├── admin-dashboard.tsx      # (overview/stats tab)
│   │   ├── admin-users.tsx          # (user management)
│   │   ├── admin-courses.tsx        # (course management)
│   │   ├── admin-payments.tsx       # (payments/revenue)
│   │   ├── admin-coupons.tsx        # (coupon management)
│   │   ├── admin-reports.tsx        # (moderation reports)
│   │   └── admin-settings.tsx       # (platform settings)
│   ├── organization/                # 🆕 B2B organization components
│   │   ├── org-sidebar.tsx
│   │   ├── org-dashboard.tsx
│   │   ├── org-members.tsx
│   │   ├── org-packages.tsx
│   │   └── org-settings.tsx
│   ├── certificate/                 # 🆕 Certificate components
│   │   └── certificate-card.tsx
│   ├── avatar/                      # 🆕 AI Avatar
│   │   └── web-avatar.tsx
│   ├── selection-term-explainer.tsx  # (standalone — keep or move to shared/)
│   └── placeholder.tsx
│
├── hooks/                           # 🆕 Custom hooks (extract from routes)
│   ├── use-mobile.tsx               # ← exists
│   ├── use-courses.ts               # (query hooks for courses)
│   ├── use-enrollments.ts           # (query hooks for enrollments)
│   └── use-auth-redirect.ts         # (auth guard logic)
│
├── lib/
│   ├── config.ts                    # App config + constants
│   ├── utils.ts                     # Generic utilities
│   ├── debug.ts                     # Debug logging
│   ├── error-capture.ts             # Error capture
│   ├── error-page.ts                # Error page util
│   ├── auth.tsx                     # Auth provider + hooks
│   ├── supabase.ts                  # Supabase client
│   ├── database.types.ts            # Generated types
│   ├── validation.ts                # Zod schemas
│   │
│   ├── i18n/                        # 🆕 Split i18n by domain
│   │   ├── index.tsx                # Provider + useI18n hook
│   │   ├── en.ts                    # English translations
│   │   └── th.ts                    # Thai translations
│   │
│   ├── services/                    # 🆕 Data layer (Supabase queries)
│   │   ├── courses.ts
│   │   ├── lessons.ts
│   │   ├── modules.ts
│   │   ├── enrollments.ts
│   │   ├── quizzes.ts
│   │   ├── progress.ts
│   │   ├── reviews.ts
│   │   ├── certificates.ts
│   │   ├── payments.ts
│   │   ├── support.ts
│   │   ├── coupons.ts
│   │   ├── moderation.ts
│   │   └── plagiarism.ts
│   │
│   ├── server/                      # 🆕 Server-only functions
│   │   ├── admin.ts                 # Admin server fns (requires admin)
│   │   ├── organizations.ts         # Org server fns
│   │   └── server-auth.ts           # Server auth helpers
│   │
│   └── external/                    # 🆕 External API integrations
│       ├── stripe.ts                # Stripe checkout sessions
│       ├── gemini.ts                # Gemini AI engine
│       ├── ai-course-gen.ts         # AI course generation logic
│       ├── ai-quiz-gen.ts           # AI quiz generation
│       ├── ai-image-gen.ts          # AI image generation
│       └── storage.ts              # Supabase Storage helpers
│
├── routes/                          # ✅ Route files become thin wrappers
│   ├── __root.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── browse.tsx
│   ├── dashboard.tsx                # → thin: imports from components/dashboard/*
│   ├── admin.index.tsx              # → thin: imports from components/admin/*
│   ├── organization.tsx             # → thin: imports from components/organization/*
│   ├── courses.$courseId.index.tsx   # → thin: imports from components/course/*
│   ├── ... (rest unchanged)
│
├── server-runtime/                  # ✅ Keep as-is (already well-organized)
│
└── styles.css
```

---

## 📋 Proposed Changes — Detailed

### Frontend

---

#### [MODIFY] Route files → Extract components

ทุก route file ที่มี > 500 บรรทัด ควร extract local components ออกมาเป็นไฟล์แยก:

**Priority 1 (มากที่สุด):**
- [admin.index.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/admin.index.tsx) (5,042 lines) → แยก 7-8 tab components ออกเป็น `components/admin/`
- [dashboard.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/dashboard.tsx) (2,829 lines) → แยก 6-7 tab components ออกเป็น `components/dashboard/`
- [courses.$courseId.index.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/courses.$courseId.index.tsx) (2,895 lines) → แยก course detail sections ออกเป็น `components/course/`
- [organization.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/organization.tsx) (2,224 lines) → แยกเป็น `components/organization/`

**Priority 2:**
- [pricing.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/pricing.tsx) (46KB)
- [browse.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/browse.tsx) (33KB)
- [create.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/routes/create.tsx) (30KB)

---

#### [NEW] `src/components/layout/`

ย้ายจาก `src/components/`:
- `site-header.tsx` → `components/layout/site-header.tsx`
- `site-footer.tsx` → `components/layout/site-footer.tsx`
- `site-layout.tsx` → `components/layout/site-layout.tsx`

---

#### [NEW] `src/components/quiz/`

ย้ายจาก `src/components/`:
- `quiz-editor.tsx` → `components/quiz/quiz-editor.tsx`
- `quiz-player.tsx` → `components/quiz/quiz-player.tsx`

---

#### [NEW] `src/components/certificate/`

ย้ายจาก `src/components/`:
- `certificate-card.tsx` → `components/certificate/certificate-card.tsx`

---

#### [NEW] `src/components/avatar/`

ย้ายจาก `src/components/`:
- `web-avatar.tsx` → `components/avatar/web-avatar.tsx`

---

### Backend (lib/)

---

#### [NEW] `src/lib/services/`

ย้ายจาก `src/lib/` — ไฟล์ที่เป็น data access layer (Supabase queries + server functions):
- `courses.ts`, `lessons.ts`, `modules.ts`, `enrollments.ts`, `quizzes.ts`, `progress.ts`, `reviews.ts`, `certificates.ts`, `payments.ts`, `support.ts`, `coupons.ts`, `moderation.ts`, `plagiarism.ts`

---

#### [NEW] `src/lib/server/`

ย้ายจาก `src/lib/` — ไฟล์ที่เป็น server-only (ใช้ `requireAdmin`, `requireUser`, `getAdminDb`):
- `admin.ts` → `lib/server/admin.ts`
- `organizations.ts` → `lib/server/organizations.ts`
- `server-auth.ts` → `lib/server/server-auth.ts`

---

#### [NEW] `src/lib/external/`

แยก external service integrations:
- `stripe.ts` → `lib/external/stripe.ts`
- `storage.ts` → `lib/external/storage.ts`
- `ai.ts` (34KB) → แยกเป็น:
  - `lib/external/gemini.ts` — Gemini API engine (fetchGeminiWithUniversalFallback)
  - `lib/external/ai-course-gen.ts` — Course generation logic
  - `lib/external/ai-quiz-gen.ts` — Quiz generation
  - `lib/external/ai-image-gen.ts` — Image generation
  - `lib/external/ai-metadata.ts` — Metadata/learning path generation

---

#### [NEW] `src/lib/i18n/`

แยก [i18n.tsx](file:///Users/nattaphan/Documents/Repositories/ai-learn-hub-22/src/lib/i18n.tsx) (40KB / 702 lines) เป็น:
- `lib/i18n/index.tsx` — Provider + useI18n hook
- `lib/i18n/en.ts` — English translations object
- `lib/i18n/th.ts` — Thai translations object

---

### AI Avatar

ส่วน WebAvatar → ย้ายจาก `components/web-avatar.tsx` ไปเป็น `components/avatar/web-avatar.tsx` เฉยๆ — ไม่ต้องแก้ logic หรือ tag เพิ่ม (ตามที่บอกว่าแก้ไปแล้ว)

---

## ⚠️ User Review Required

> [!IMPORTANT]
> **การ refactor นี้เป็นการ move files + extract components เท่านั้น** — ไม่ได้แก้ logic, UI, หรือ functionality ใดๆ แต่จะต้อง update import paths ทั้งหมดที่อ้างอิงไฟล์ที่ย้าย

> [!WARNING]
> **Route files ที่ใหญ่มาก (admin 5,042 lines, dashboard 2,829 lines)** — การ extract components ออกมาต้องทำทีละ route อย่างระมัดระวัง เพราะอาจมี local state/closure ที่ share กันภายในไฟล์ ควรเริ่มจากไฟล์ที่เล็กกว่าก่อน แล้วค่อยทำไฟล์ใหญ่

## Open Questions

> [!IMPORTANT]
> 1. **ลำดับการ refactor**: อยากเริ่มจากส่วนไหนก่อน? ผมเลือก : `lib/` restructure ก่อน (เพราะเป็น dependency ของทุก route) → แล้วค่อย extract components จาก routes
> 2. **ขอบเขต**: อยากให้ทำทั้งหมดในรอบเดียว หรือแบ่งเป็น phase?: แบ่งเป็น phase
> 3. **`src/server-runtime/`**: ส่วนนี้จัดได้ดีอยู่แล้ว (7 files แยกชัดเจน) — ต้องการเปลี่ยนอะไรเพิ่มไหม? : ไม่ต้อง 
> 4. **`chat-widget.js` (773KB)** อยู่ที่ root — ควรย้ายไป `public/` หรือลบออก (เพราะโหลดจาก CDN อยู่แล้ว)? : ไม่ต้องย้าย

---

## Verification Plan

### Automated Tests
```bash
# TypeScript compilation check (ตรวจว่า import paths ถูกต้องหมด)
npx tsc --noEmit

# Dev server สามารถ start ได้
npm run dev

# ESLint check
npm run lint
```

### Manual Verification
- ตรวจสอบว่าทุก page ยัง render ได้ปกติ
- ตรวจสอบว่า import paths ไม่ broken
- ตรวจสอบว่า WebAvatar ยังทำงานได้