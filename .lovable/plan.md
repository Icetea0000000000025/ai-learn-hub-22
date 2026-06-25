# Refactor `src/server.ts` → `src/server-runtime/`

แยกไฟล์ `src/server.ts` (459 บรรทัด) ออกเป็นโมดูลย่อยใต้โฟลเดอร์ใหม่ `src/server-runtime/` โดย**รักษาพฤติกรรมเดิม 100%**

## ขอบเขต

- **แตะแค่:** `src/server.ts` และ `src/server-runtime/**`
- **ไม่แตะ:** ไฟล์อื่นทั้งหมด, schema, migrations, RLS, dependencies
- **คงเดิมทุกตัวอักษร:** endpoint path, status code, response shape, log message text, env variable names, fallback order

## ไฟล์ที่จะสร้างใหม่ (7 ไฟล์)

### 1. `src/server-runtime/env.ts`
Pure function `resolveEnv(env, processEnv)` รับ `env` object (worker bindings) คืน:
- `effectiveApiKey` (STRIPE_SECRET_KEY)
- `effectiveWebhookSecret` (STRIPE_WEBHOOK_SECRET)
- `serviceRoleKey` (SUPABASE_SERVICE_ROLE_KEY / SB_SERVICE_ROLE_KEY, split whitespace)
- `effectiveSupabaseUrl` (SUPABASE_URL / VITE_SUPABASE_URL)

รวมทั้ง logic propagate `env[key]` → `process.env` ที่อยู่ต้น fetch handler

คง fallback order เดิมทุกตัวอักษร: `env?.X || process.env.X || X_CONSTANT` พร้อม `.trim()` ตรงเดิม

### 2. `src/server-runtime/stripe.ts`
- module-level `let stripeClient: Stripe | null = null`
- export `getStripeClient(apiKey)` ที่ทำ lazy init + re-init เมื่อ key เปลี่ยน (เช็ก `(stripeClient as any)._api?.auth !== Bearer ${apiKey}`)
- คง `apiVersion: "2026-04-22.dahlia"` ตามเดิม

### 3. `src/server-runtime/webhook-log.ts`
- `export const WEBHOOK_LOGS: string[] = []`
- `export function addLog(msg)` — รวม timestamp format, unshift, slice ที่ 50, console.log
- รักษา log text exact

### 4. `src/server-runtime/fulfillment.ts`
ฟังก์ชันเดียว `runFulfillment({ db, meta, obj, isSession, addLog })` คืน `{ fulfilled: boolean }`

ภายในมี 6 priorities ตามลำดับเดิมเป๊ะ:
- P1: B2B Organization License (orgId + courseId)
- P2: Enterprise Plan (type === "enterprise_plan")
- P2.1: Creator Subscriptions (type === "subscription_purchase")
- P2.2: Ad Purchases (type === "ad_purchase")
- P3: Bundle (bundleId && !fulfilled)
- P4: Standard Course (!fulfilled && courseId && !isB2B) — รวม `increment_coupon_usage` RPC

หมายเหตุ: `incrementCouponUsage` จาก `./lib/coupons` ปัจจุบัน import แต่ไม่ได้ใช้ในโค้ด (ใช้ `db.rpc` ตรงๆ). จะคงสถานะนี้ — ไม่ลบ import ที่ฝั่ง `server.ts` เพื่อกัน side-effect ใดๆ (หรือถ้าไม่จำเป็นจะ verify อีกครั้งตอน implement)

### 5. `src/server-runtime/payments.ts`
ฟังก์ชัน `recordPayment({ db, baseFields, addLog })` — บันทึก 3 tier:
- ATTEMPT 1: Full upsert (`onConflict: "transaction_id"`)
- ATTEMPT 2: Insert ไม่มี `transaction_id`
- ATTEMPT 3: Legacy minimal insert (course_id fallback `00000000-...`, provider field)

รักษา log messages exact: "SUCCESS: Payment recorded via Full Upsert.", "FULL UPSERT FAILED: ...", "SUCCESS: Recorded via Insert (No transaction_id).", "INSERT FAILED: ...", "LEGACY FATAL: ...", "SUCCESS: Recorded via Legacy Minimal.", "CRITICAL DB EXCEPTION: ..."

### 6. `src/server-runtime/webhook.ts`
`handleWebhook(request, resolvedEnv)`:
- GET → diagnostics JSON เดิมเป๊ะ (key order + field names + WEBHOOK_LOGS)
- non-POST → `405 "Method Not Allowed"`
- POST → verify signature (msg เดิม "ERROR: Missing config (Sig:..., Client:..., Secret:...)"), call `runFulfillment` แล้ว `recordPayment`, return `{received: true}` 200

รักษา metadata extraction helpers (`getMeta`, `clean`) และ ID derivation (transactionId, paymentIntentId) ตรงตำแหน่งเดิม (อยู่ใน webhook.ts เพราะใช้ก่อน fulfillment + payments)

รับ `stripeClient`, `effectiveWebhookSecret`, `effectiveApiKey`, `serviceRoleKey`, `effectiveSupabaseUrl` เป็น argument

### 7. `src/server-runtime/ssr.ts`
- `getServerEntry()` (memoized promise)
- `brandedErrorResponse()`
- `isCatastrophicSsrErrorBody()` (internal)
- `normalizeCatastrophicSsrResponse()`

import `consumeLastCapturedError`, `renderErrorPage` จาก `../lib/*` (path เปลี่ยนเป็น `../lib/...`)

หมายเหตุ: `import "./lib/error-capture"` (side-effect) จะ**คงไว้ที่ `src/server.ts`** เพื่อ guarantee ว่า capture handler ถูก register ที่จุดเดิม

## ไฟล์ที่จะแก้ (1 ไฟล์)

### `src/server.ts` (459 → ~40 บรรทัด)
- คง `import "./lib/error-capture"` บรรทัดแรก
- import จาก `./server-runtime/*`
- export default `{ async fetch(request, env, ctx) { ... } }` ที่:
  1. resolve env (env.ts) + propagate env→process.env
  2. ensure stripe client (stripe.ts)
  3. ถ้า path เป็น `/api/stripe-webhook` หรือ `/api/stripe/webhook` → delegate ไป `handleWebhook`
  4. มิฉะนั้น → `getServerEntry().fetch()` + `normalizeCatastrophicSsrResponse` + branded fallback (ssr.ts)

## Dependency Graph

```text
server.ts
 ├── server-runtime/env.ts        (pure, no deps)
 ├── server-runtime/stripe.ts     (stripe)
 ├── server-runtime/webhook-log.ts (pure)
 ├── server-runtime/ssr.ts        (../lib/error-capture, ../lib/error-page)
 └── server-runtime/webhook.ts
       ├── @supabase/supabase-js
       ├── ../lib/config (SUPABASE_ANON_KEY)
       ├── ./webhook-log
       ├── ./fulfillment
       └── ./payments
```

## Acceptance Criteria (verify หลัง refactor)

- `bun run build` ผ่าน, typecheck ผ่าน
- `GET /api/stripe-webhook` คืน JSON เดิม (เทียบ key order + diagnostics shape)
- `POST /api/stripe-webhook` ไม่มี signature → 400 + msg เดิม
- `POST` method อื่น (PUT/DELETE) → 405 "Method Not Allowed"
- SSR route ปกติ render ได้ (เปิด `/pricing`)
- log messages เหมือนเดิมทุกตัวอักษร (grep เทียบกับ server.ts เดิม)

## Rollback

snapshot `src/server.ts` ก่อนแก้. ถ้า build/runtime fail → restore `src/server.ts` + ลบ `src/server-runtime/` ทั้งโฟลเดอร์

## ข้อสังเกตที่จะชี้แจง (ไม่ใช่ปัญหา)

1. `incrementCouponUsage` ถูก import ใน `server.ts` แต่ไม่ได้ถูกเรียก (โค้ดใช้ `db.rpc("increment_coupon_usage", ...)` ตรงๆ). จะ**ไม่ลบ import นี้** เพื่อกันความเสี่ยงด้าน side-effect — ถ้าต้องการลบจะถามก่อน
2. `import "./lib/error-capture"` (side-effect import) จะอยู่ที่บรรทัดแรกของ `src/server.ts` เหมือนเดิม ไม่ย้ายเข้า ssr.ts เพื่อรักษา load order
