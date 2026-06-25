# แก้ Stripe redirect ให้ทะลุ iframe ใน preview

แก้ไฟล์เดียว: `src/routes/checkout.$courseId.tsx` บรรทัด 148-152

เปลี่ยน `window.location.href = url` เป็น redirect ผ่าน `window.top` พร้อม fallback เปิด tab ใหม่:

```ts
if (url) {
  try {
    const top = window.top ?? window;
    top.location.href = url;
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
} else {
  throw new Error("Failed to create checkout session");
}
```

## ผลกระทบ
- **Production** (ไม่ใช่ iframe): `window.top === window` → พฤติกรรมเดิมทุกประการ
- **Lovable preview**: ทะลุ iframe ไป Stripe Checkout ได้, ถ้า browser block cross-origin ก็เปิด tab ใหม่แทน

## ไม่แตะ
backend, `src/server-runtime/**`, `src/server.ts`, webhook, schema, log text
