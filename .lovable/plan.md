
# Implementation Plan: Incremental Refactor `src/server.ts` (Gated + Hard Constraints)

แผนนี้ไม่มีโค้ด ทุก phase หยุดรอ approval ก่อนทำ และก่อน-หลังแต่ละ phase ต้องรายงานตาม protocol ด้านล่าง

---

## 0. Hard Constraints (บังคับตลอด refactor)

### Whitelist ไฟล์ที่อนุญาตให้แตะ
- `src/server.ts`
- `src/server-runtime/**` (ทั้ง tree, สร้างใหม่)

### ไฟล์/โฟลเดอร์ที่ห้ามแตะเด็ดขาด
- `src/lib/**`, `src/routes/**`, `src/components/**`, `src/integrations/**`
- `src/hooks/**`, `src/styles.css`, `src/router.tsx`, `src/start.ts`, `src/client.tsx`
- `src/routeTree.gen.ts`
- `supabase/**` (migrations, config, functions, RLS)
- `vite.config.ts`, `tsconfig*.json`, `package.json`, `bun.lock`
- `public/**`
- Database / RLS / secrets / edge functions ใน Supabase

### Public contract ที่ห้ามเปลี่ยน
- Export names ใน `src/server.ts` (default export object ที่มี `fetch`)
- Function signatures ของ default export
- Endpoint paths: `/api/stripe-webhook`, `/api/stripe/webhook` (+ SSR passthrough)
- Request/response shape ทุก endpoint
- Status codes (200, 400, 405, 500)
- Log message text ทุกตัวอักษร (ที่ส่งออก `addLog` หรือ `console.error`)
- Env variable names (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SB_SERVICE_ROLE_KEY`)

### กฎปฏิบัติ
- ห้ามลบไฟล์ใด ๆ
- ห้าม rename / move directory เดิม
- ห้ามเพิ่ม npm dependency
- ห้ามแตะ DB / schema / RLS / migrations
- หาก phase ใดจำเป็นต้องแตะนอก whitelist → **หยุดทันที** และขอ approval ก่อน

---

## A. Pre-phase Protocol (ก่อนเริ่มทุก phase)

รายงานต่อ user แล้วรอ approval:
1. ไฟล์ที่จะ **สร้าง** ใน phase นี้
2. ไฟล์ที่จะ **แก้** ใน phase นี้
3. ประมาณจำนวนบรรทัดที่เปลี่ยน (ต่อไฟล์)
4. ความเสี่ยง + scope confirmation ว่าอยู่ใน whitelist

## B. Post-phase Protocol (หลังจบทุก phase)

รายงานต่อ user:
1. Build result (Vite + TanStack)
2. Typecheck result (`tsgo`)
3. ยืนยัน `/api/stripe-webhook` GET diagnostics + POST flow ยังทำงาน
4. ยืนยัน SSR (route ปกติ + error path) ยังทำงาน
5. จำนวนไฟล์ที่ถูกแก้/สร้าง **จริง** (vs ที่ประกาศไว้ pre-phase)
6. Rollback note: snapshot `src/server.ts` + รายการไฟล์ใหม่ที่สร้าง

หากข้อใดข้อหนึ่งไม่ผ่าน → ไม่ขอ approval phase ถัดไป + เสนอ rollback

---

## C. รายการไฟล์ "สร้างใหม่" (รวม 29 ไฟล์, ทุกตัวอยู่ใต้ `src/server-runtime/`)

| # | ไฟล์ | สร้างใน phase | เหตุผล |
|---|---|---|---|
| 1 | `README.md` | 1 | บันทึก import rule + dependency graph |
| 2 | `shared/id-extractors.ts` | 1→2 | pure: เลือก tx/PI id จาก checkout vs payment_intent |
| 3 | `shared/money.ts` | 1→2 | pure: cents → dollars |
| 4 | `shared/time.ts` | 1→2 | pure: `daysFromNow(n)` ISO string |
| 5 | `observability/webhook-log.ts` | 1→2 | ย้าย `WEBHOOK_LOGS` + `addLog` |
| 6 | `infrastructure/stripe-client.ts` | 1→2 | stripe singleton + re-init |
| 7 | `infrastructure/supabase-admin.ts` | 1→2 | factory `createDb(url, key)` |
| 8 | `bootstrap/env.ts` | 1→3 | resolve env layered (env / process.env / config) |
| 9 | `bootstrap/ssr-entry.ts` | 1→3 | lazy load TanStack server-entry |
| 10 | `bootstrap/container.ts` | 1→3 | composition root: build `RequestDeps` |
| 11 | `http/error-response.ts` | 1→3 | brandedErrorResponse + normalize |
| 12 | `http/ssr-handler.ts` | 1→3 | try/catch รอบ SSR |
| 13 | `http/router.ts` | 1→8 | dispatch pathname → handler |
| 14 | `stripe-webhook/index.ts` | 1→7 | entry `handleStripeWebhook(req, deps)` |
| 15 | `stripe-webhook/diagnostics.ts` | 1→4 | GET diagnostics JSON |
| 16 | `stripe-webhook/verify.ts` | 1→4 | verify signature + construct event |
| 17 | `stripe-webhook/metadata.ts` | 1→4 | `getMeta` / `clean` / extract |
| 18 | `stripe-webhook/dispatcher.ts` | 1→7 | ลำดับ priority + call payments |
| 19 | `stripe-webhook/fulfillment/types.ts` | 1→5 | shared types |
| 20 | `fulfillment/b2b-org-seats.ts` | 1→5e | PRIORITY 1 |
| 21 | `fulfillment/enterprise-plan.ts` | 1→5a | PRIORITY 2 |
| 22 | `fulfillment/creator-subscription.ts` | 1→5b | PRIORITY 2.1 |
| 23 | `fulfillment/ad-purchase.ts` | 1→5f | PRIORITY 2.2 |
| 24 | `fulfillment/bundle.ts` | 1→5c | PRIORITY 3 |
| 25 | `fulfillment/standard-course.ts` | 1→5d | PRIORITY 4 + coupon |
| 26 | `payments/record-payment.ts` | 1→6 | orchestrator 3-tier |
| 27 | `payments/attempt-full-upsert.ts` | 1→6 | ATTEMPT 1 |
| 28 | `payments/attempt-insert-no-tx.ts` | 1→6 | ATTEMPT 2 |
| 29 | `payments/attempt-legacy-minimal.ts` | 1→6 | ATTEMPT 3 |

> "phase 1→N" = สร้างเป็น stub ใน Phase 1, ใส่ logic จริงใน Phase N

## D. รายการไฟล์ที่ "ถูกแก้"

| ไฟล์ | ถูกแก้ใน phase | สรุปการแก้ |
|---|---|---|
| `src/server.ts` | 2, 3, 4, 5a–5f, 6, 7, 8 | แต่ละ phase แทน inline block ด้วย import จาก `server-runtime/*` — Phase 8 ตัดให้เหลือ ~30–50 บรรทัด (entry + delegate) |

**ไม่มีไฟล์อื่นถูกแก้ตลอด refactor**

## E. รายการไฟล์ที่ "รับประกันไม่ถูกแตะ"

ทุกไฟล์นอก whitelist §0 (`src/lib/**`, `src/routes/**`, `src/components/**`, `src/integrations/**`, `src/hooks/**`, `supabase/**`, config files, generated route tree, public assets, ทุก migration, RLS, secret)

---

## F. Phase Execution Plan

### Phase 1 — Skeleton (สร้างไฟล์เปล่า)

- **สร้าง**: 29 ไฟล์ตาม §C (export stub `export {}` หรือ placeholder type)
- **แก้**: ไม่มี
- **บรรทัดเปลี่ยน**: ~29 ไฟล์ × ~2 บรรทัด = ~60 บรรทัด
- **Acceptance**: build + typecheck ผ่าน, ไม่มีไฟล์ใหม่ถูก import จากใคร
- **ความเสี่ยง**: ต่ำมาก — dead code

### Phase 2 — Shared + Observability + Infrastructure

- **แก้ไฟล์**: #2, #3, #4, #5, #6, #7 (logic จริง) + `src/server.ts`
- **บรรทัดเปลี่ยน**: `src/server.ts` -~15/+~6; ไฟล์ใหม่ ~80 บรรทัดรวม
- **Acceptance**: log text + Stripe re-init lifecycle เหมือนเดิม
- **ความเสี่ยง**: ต่ำ — pure ย้าย

### Phase 3 — Bootstrap + HTTP

- **แก้ไฟล์**: #8, #9, #10, #11, #12 + `src/server.ts`
- **บรรทัดเปลี่ยน**: `src/server.ts` -~40/+~10; ไฟล์ใหม่ ~120 บรรทัด
- **Acceptance**: SSR + branded error page + env propagation เหมือนเดิม
- **ความเสี่ยง**: กลาง — env resolution มี fallback หลายชั้น ต้อง mirror เป๊ะ

### Phase 4 — Diagnostics + Verify + Metadata

- **แก้ไฟล์**: #15, #16, #17 + `src/server.ts`
- **บรรทัดเปลี่ยน**: `src/server.ts` -~50/+~15; ไฟล์ใหม่ ~90 บรรทัด
- **Acceptance**: GET diagnostics JSON keys + values + signature error message เหมือนเดิม
- **ความเสี่ยง**: ต่ำ

### Phase 5 — Fulfillment (ทีละ priority, รอ approval ทุก sub-phase)

ลำดับ (สั้น → ซับซ้อน):
- 5a: enterprise-plan (~10 บรรทัด)
- 5b: creator-subscription (~15)
- 5c: bundle (~25)
- 5d: standard-course + coupon (~25)
- 5e: b2b-org-seats (~35)
- 5f: ad-purchase (~60)

แต่ละ sub-phase: ย้าย 1 block + `src/server.ts` เรียก function ใหม่; log text + ลำดับ + flag `fulfilled` เหมือนเดิม
- **ความเสี่ยง**: กลาง — ลำดับ priority สำคัญ; ทำทีละตัวเพื่อจำกัด blast radius

### Phase 6 — Payments 3-tier

- **แก้ไฟล์**: #26, #27, #28, #29 + `src/server.ts`
- **บรรทัดเปลี่ยน**: `src/server.ts` -~75/+~10; ไฟล์ใหม่ ~130 บรรทัด
- **Acceptance**: ATTEMPT 1→2→3 order + log text + legacy uuid-zeros fallback เหมือนเดิม
- **ความเสี่ยง**: กลาง — fallback chain ต้องไม่สลับ

### Phase 7 — Dispatcher

- **แก้ไฟล์**: #14, #18 + `src/server.ts`
- **บรรทัดเปลี่ยน**: `src/server.ts` -~30/+~5; ไฟล์ใหม่ ~80 บรรทัด
- **Acceptance**: ลำดับ priority + `isB2B` guard + skip-no-userId + 200 "Missing userId" เหมือนเดิม
- **ความเสี่ยง**: ต่ำ (orchestration เท่านั้น)

### Phase 8 — Slim entry

- **แก้ไฟล์**: #13 + `src/server.ts`
- **บรรทัดเปลี่ยน**: `src/server.ts` เหลือ ~30–50 บรรทัด; router ~40 บรรทัด
- **Acceptance**: ทุก endpoint + SSR + error page + env propagation เหมือนเดิม
- **ความเสี่ยง**: ต่ำ (โครงสุดท้าย, logic ย้ายครบแล้ว)

---

## G. Rollback Strategy

| สถานการณ์ | วิธี rollback |
|---|---|
| Build / typecheck fail หลัง edit | ย้อน edit ของ phase นั้นทันที (ไฟล์ใหม่คง stub ไว้ได้, ไม่กระทบ runtime เพราะไม่ถูก import) |
| Build ผ่านแต่ behavior drift (log / response diff) | restore `src/server.ts` จาก snapshot ที่บันทึกใน pre-phase report; ไฟล์ใหม่คงไว้เป็น dead code |
| Runtime crash ใน preview | เหมือนด้านบน + ตรวจ webhook GET diagnostics ว่า `hasStripeKey/hasWebhookSecret/hasServiceKey/hasUrl` ยังเป็น true |
| Phase 5 sub-phase fail | ย้อนเฉพาะ sub-phase นั้น; sub-phase ที่ approved แล้วยังคงอยู่ |
| Phase 8 fail | ย้อน `src/server.ts` กลับเป็นโครงของ Phase 7 (ใช้ของใหม่ทั้งหมดยกเว้น router) |

Snapshot กลไก: เก็บ `src/server.ts` ฉบับก่อนเริ่มแต่ละ phase ใน post-phase report ครั้งก่อนหน้า (ไม่พึ่ง git operations — harness จัดการ git)

**Invariant ตลอด refactor**: 0 deletions, 0 dependency added, 0 files แตะนอก whitelist, 0 contract change

---

## H. หลัง approval แผนนี้

เริ่ม Phase 1: รายงาน pre-phase (29 ไฟล์ใหม่ + 0 ไฟล์แก้) → รอ approval → สร้าง skeleton → รายงาน post-phase → รอ approval Phase 2
