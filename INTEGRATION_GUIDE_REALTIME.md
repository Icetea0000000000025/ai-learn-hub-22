# WebAvatar Realtime Modes Integration Guide

This guide covers the integration of the two **realtime voice modes** supported by the WebAvatar chat widget: `realtime-fullscreen` and `realtime-widget`. These modes provide a fluid, low-latency voice-to-voice experience powered via WebSockets with web navigation capability, coupled with a 3D VRM avatar that performs real-time lip-sync and contextual animations.

---

## Table of Contents

1. [The Two Realtime Modes](#1-the-two-realtime-modes)
2. [Quick Start & Embed Snippet](#2-quick-start--embed-snippet)
3. [Configuration Reference (`window.ChatWidgetConfig`)](#3-configuration-reference-windowchatwidgetconfig)
4. [Making Your Site AI-Friendly](#4-making-your-site-ai-friendly)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. The Two Realtime Modes

The widget can be configured in one of two distinct display modes for the voice-to-voice experience:

### 1. `realtime-fullscreen`
* **Layout**: The 3D avatar fills the entire viewport immediately.
* **Initialization**: Auto-initializes the WebGL canvas and loads the avatar model on page load.
* **Camera Behavior**: Shifting is fully enabled. The camera pans up/down dynamically as speech transcriptions grow to keep the avatar's face/mouth visible above the text.
* **Best For**: Dedicated voice interface landing pages (e.g., `live.html`).

### 2. `realtime-widget`
* **Layout**: The avatar appears in the bottom-right corner as a floating widget.
* **Initialization**: Lazy loads the avatar widget script and model only *after* the user clicks the "Connect" button.
* **Camera Behavior**: Camera shifting is disabled when minimized.
* **Expand/Contract**: Displays an expand button in the control stack that animates the widget to a full-viewport layout using a `ResizeObserver` to prevent canvas squishing or pixelation during transitions.
* **Best For**: Adding a voice assistant overlay on top of an existing page.

---

## 2. Quick Start & Embed Snippet

Paste the universal snippet before `</body>`. To configure the realtime experience, set the `mode` parameter to either `"realtime-fullscreen"` or `"realtime-widget"` in the config object.

```html
<script>
    window.ChatWidgetConfig = {
        mode: "realtime-widget", // "realtime-fullscreen" | "realtime-widget".
        widgetId: "Botnoi", // request from Botnoi. use "Botnoi-NT" for testing.
        avatarUrl: "Botnoi", // request from Botnoi. use "Botnoi" for testing.
        greetingInstruction: "", // if not present or empty, default = "Please greet the user."
        enableBubble: "true", // toggle bot response speech bubble on/off.
        cameraOffset: "0,0,0" // "x,y,z" or object {x,y,z}. try decimal increments first.
    };
    (function() {
        if (document.getElementById('webavatar-jssdk')) return;
        var s = document.createElement('script');
        s.id = 'webavatar-jssdk';
        s.src = 'https://webavatar.didthat.cc/chat-widget.js';
        s.async = true;
        (document.head || document.body).appendChild(s);
    })();
</script>
```

### Embedding in a Custom Parent Container

If you want the widget, controls, and canvas to render within a specific element on your page (rather than covering the entire viewport or floating at the bottom-right corner), configure the `container` property as a CSS selector string or direct `HTMLElement` reference:

```javascript
window.ChatWidgetConfig = {
    container: "#my-avatar-box" // Or direct element reference
};
```

#### SPA Frameworks (React, Next.js, Vue, Svelte)

In component-based frameworks, assign the direct DOM element reference (e.g., from React `useRef` or Vue template ref) to the `container` property inside the component's mount lifecycle hook. Call `window.WebAvatar.disconnect()` on unmount/teardown to cleanly release WebGL and WebAudio context resources.

---

## 3. Configuration Reference (`window.ChatWidgetConfig`)

Configure these properties in `window.ChatWidgetConfig` (Priority source for all frameworks):

| Config Key | Type | Default | Description |
|---|---|---|---|
| `mode` | `string` | `"panel"` | Display mode. Set to `"realtime-fullscreen"` or `"realtime-widget"`. |
| `widgetId` | `string` | — | **Required**. Used to authorize your domain, fetch settings, and generate an ephemeral WebSocket token. |
| `avatarUrl` | `string` | `"Botnoi"` | Built-in model name (e.g., `"Botnoi"`) or absolute URL to a `.vrm` file. |
| `greetingInstruction` | `string` | — | Custom system instruction injected to guide the avatar on how to greet the user. Set to `false` to disable greeting on connect. |
| `container` | `string` or `HTMLElement` | — | Optional. Selector string or direct DOM element. When specified, forces the widget, controls, and canvas to render absolutely inside this parent element instead of overlaying the document viewport/body. |
| `enableBubble` | `string` | `"true"` | Optional. Whether to enable the bot response speech bubble in realtime modes. Set to `"false"` to hide speech bubbles. |
| `cameraOffset` | `string` or `object` | — | Optional. 3D vector offset to apply to the default `cameraTarget` values (e.g., `{"x": 0, "y": 0.2, "z": 1}` or `"0,0.2,1"`). |

---

## 4. Making Your Site AI-Friendly

> 📘 **Who is this for?**
> Developers integrating the WebAvatar widget on their site who want the AI to be able to **click buttons, fill forms, navigate pages, and read content** accurately. The AI's DOM scanner runs automatically — you don't call any functions. Your job is simply to **structure your HTML well** so the scanner can find and understand your elements.

### 4.1 Quick Checklist

Use this as a quick reference. Detailed explanations are in the sections below.

| Element Type | What the AI Looks For | Your Action |
|---|---|---|
| **Buttons** | `<button>`, `<input type="button/submit">`, `[role="button"]`, `<a href>` | Use semantic tags. Add `aria-label` if text is vague. |
| **Inputs** | `<input>`, `<textarea>`, `<select>` | Use `<label for="...">` or `aria-label`. |
| **Sections** | `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>` | Use semantic HTML5 landmarks. Add `aria-label` for clarity. |
| **Panels** | `<details>` or any element with `aria-expanded` | Keep `<summary>` text descriptive. |
| **Scroll targets** | `<section>`, `<div>`, etc. with `id` | Give IDs to major sections (≥3 characters). |
| **Links** | `<a href="/path">` (same-origin only) | Use meaningful link text. |
| **Text content** | `<p>`, `<h1>`–`<h6>`, `<span>`, `<li>`, `<td>`, `<article>`, `<blockquote>` | No action needed — auto-detected. |

---

### 4.2 How the AI Reads Your Page

The AI uses a **section-first** approach — it does not blindly scan the entire page. Instead:

1. It discovers the major **sections** on the page (navbar, main content, sidebar, footer, etc.)
2. It picks a relevant section and scans it for **buttons, inputs, links, panels, and text**
3. It interacts with specific elements (click, fill, navigate)

This means the most important thing you can do is **structure your HTML into clear, labeled sections**.

---

### 4.3 Labeling Sections

The scanner detects sections in 3 tiers:

**Tier 1 — Semantic landmarks** (highest priority):
```html
<nav aria-label="Main Menu">...</nav>
<main>...</main>
<section aria-label="Pricing Plans">...</section>
<aside aria-label="Shopping Cart">...</aside>
```

**Tier 2 — Div/form containers** (detected if they contain ≥2 interactive elements AND a heading or `aria-label`):
```html
<div aria-label="Product Filter">
    <select>...</select>
    <button>Apply</button>
</div>
```

**Tier 3 — Body fallback**: If Tiers 1 and 2 yield zero sections, the scanner falls back to scanning the entire `<body>`.

#### How Section Labels Are Derived

The scanner reads labels in this order:
1. `aria-label`
2. `aria-labelledby` → resolves the referenced element's text
3. First child heading (`<h1>`–`<h4>`)
4. Humanized tag name (e.g., `<nav>` → "Navigation")

> 💡 **Tip**: Adding `aria-label` to your `<section>` and `<nav>` elements is the single highest-impact change you can make.

---

### 4.4 Labeling Buttons & Clickable Elements

**Detected elements**: `<button>`, `<input type="button">`, `<input type="submit">`, `[role="button"]`, `<a href>`

**Label priority order**:
1. `aria-label`
2. `title`
3. Visible `textContent`
4. `value` (for input buttons)

#### Handling Generic Labels

Labels like "Add", "Buy", "More", "Submit", or short labels (≤4 characters) are considered **ambiguous**. When the scanner finds these, it automatically climbs up to **4 parent levels** looking for a heading or element with a class containing `title`, `name`, `header`, or `label` to add context.

**Before** (ambiguous — the AI sees two identical "Add to cart" buttons):
```html
<div class="product">
    <span>Espresso</span>
    <button>Add to cart</button>
</div>
<div class="product">
    <span>Latte</span>
    <button>Add to cart</button>
</div>
```

**After** (clear — the scanner auto-appends context: "Add to cart (Espresso)", "Add to cart (Latte)"):
```html
<div class="product">
    <h3 class="product-name">Espresso</h3>
    <button>Add to cart</button>
</div>
<div class="product">
    <h3 class="product-name">Latte</h3>
    <button>Add to cart</button>
</div>
```

> The scanner automatically handles this disambiguation, but it relies on having a heading or title-like element near each button. If your layout doesn't have one, add `aria-label` directly:
> ```html
> <button aria-label="Add Espresso to cart">Add to cart</button>
> ```

The full list of labels treated as generic (triggering automatic context enrichment):
`add to cart`, `buy`, `buy now`, `order`, `order now`, `select`, `submit`, `click`, `click here`, `more`, `read more`, `view`, `view details`, `checkout`, `cart`, `add`, `navigate`, `increase quantity`, `decrease quantity`, `increase`, `decrease`, `quantity` — plus Thai equivalents: `สั่งเลย`, `สั่งซื้อ`, `หยิบใส่ตะกร้า`, `เลือก`, `ตกลง`, `ยืนยัน`, `ดูเพิ่มเติม`, `ตะกร้า`, `สั่งอาหาร`, `นำทาง`, `เพิ่มจำนวน`, `ลดจำนวน`, `เพิ่ม`, `ลด`, `จำนวน`

---

### 4.5 Labeling Form Inputs

**Detected elements**: `<input>` (except `type="hidden"`), `<textarea>`, `<select>`

**Label priority order** (first non-empty wins):
1. `<label for="inputId">` — an explicit label element matching the input's `id`
2. Parent `<label>` — the input is wrapped inside a `<label>` tag
3. `aria-label`
4. `placeholder`
5. `name`

**Good example**:
```html
<label for="email">Email Address</label>
<input type="email" id="email" placeholder="you@example.com">
```

**Fallback example** (no `<label>`, but `aria-label` works):
```html
<input type="email" aria-label="Email Address" placeholder="you@example.com">
```

#### Dropdowns (`<select>`)

The AI can read all `<option>` elements inside a `<select>` and fill it by matching option text. **Custom div-based dropdowns are not natively supported** — use native `<select>` elements or ensure your custom component has the correct ARIA roles.

#### Date Inputs

For `<input type="date">`, the AI formats values as `YYYY-MM-DD` (e.g., `2026-06-11`).

#### Checkboxes & Radio Buttons

The AI sets the `checked` state and dispatches `click` and `change` events.

#### Dynamic Selector Assignment

If an input has no `id` or `name` attribute, the scanner automatically assigns a temporary `data-webavatar-id="wa-X"` attribute to create a reliable CSS selector. You don't need to worry about this — but having `id` or `name` on your inputs is always better.

---

### 4.6 Labeling Panels & Accordions

**Detected elements**: `<details>` elements and any element with `aria-expanded` attribute.

**Label derivation**:
- For `<details>`: reads the `<summary>` child's text
- For `aria-expanded` elements: reads `textContent`, `aria-label`, or `title`

**Good example**:
```html
<details>
    <summary>Shipping Information</summary>
    <p>We ship to 30 countries...</p>
</details>
```

The AI sees this as a panel labeled "Shipping Information" with state `collapsed` or `expanded`, and can click the summary to toggle it.

---

### 4.7 Scroll Targets

The scanner finds section-like elements with an `id` attribute that can be scrolled to.

**Requirements**:
- Must be a structural tag: `<section>`, `<div>`, `<main>`, `<article>`, `<aside>`, `<header>`, `<footer>`
- Must have an `id` at least **3 characters long**
- IDs starting with `bcw-`, `avatar-`, `botnoi-`, or `webavatar-` are automatically excluded (reserved for the widget)

**Good example**:
```html
<section id="pricing-plans">
    <h2>Pricing</h2>
    ...
</section>
```

---

### 4.8 Navigation Links

**Detected elements**: `<a href="...">` pointing to same-origin paths.

**What is recognized**:
- Internal relative paths (e.g., `/about`, `/products/123`)
- Hash links (e.g., `#pricing`)
- Same-origin absolute URLs

**What is ignored**:
- External domain links (e.g., `https://google.com`) — blocked for security
- JavaScript-based navigation (`onclick` handlers without an `<a>` tag) — not detected as routes

**SPA Integration**: When the AI attempts to navigate, it dispatches a cancelable `webavatar-navigate` `CustomEvent`. SPA developers should listen for this event, call `e.preventDefault()`, and pass `e.detail.target` to their internal router (e.g., React Router's `useNavigate`) to prevent a hard page reload. If unhandled, the widget falls back to `window.location.href`.

```javascript
// Example: React SPA integration
window.addEventListener('webavatar-navigate', (e) => {
    e.preventDefault();
    navigate(e.detail.target); // react-router-dom useNavigate
});
```

---

### 4.9 Text Content

The scanner automatically reads text from: `<p>`, `<span>`, `<article>`, `<blockquote>`, `<h1>`–`<h6>`, `<li>`, `<td>`, `<div>`.

**Repeating group collapsing**: When ≥5 sibling elements share the same parent and tag (e.g., a list of product cards), they are automatically collapsed into a summary (e.g., "List of 12 div items") to avoid overwhelming the AI's context. Individual items are still accessible via deeper scanning.

---

### 4.10 Framework Compatibility

| Framework | Support | Notes |
|---|---|---|
| Static HTML / PHP / Django | ✅ Full | Works out of the box |
| React / Next.js | ✅ Full | Listen for `webavatar-navigate` event for SPA routing |
| Vue / Nuxt | ✅ Full | Same as React — use `webavatar-navigate` event |
| Angular / Svelte | ✅ Full | Same pattern applies |
| Web Components (Shadow DOM) | ⚠️ Partial | Elements inside Shadow DOM are **not visible** to the scanner |

**Form & Input State Sync in SPAs**: The scanner uses native prototype setters (`HTMLInputElement.prototype.value.set`, etc.) and dispatches native `focus`, `input`, `change`, and `blur` events. This ensures two-way binding frameworks (React, Vue, Angular) recognize AI-filled values correctly.

---

### 4.11 Scanning Limits

The scanner caps the number of elements reported per section to keep the AI's context manageable:

| Element Type | Max Per Section |
|---|---|
| Buttons & clickable elements | 25 |
| Form inputs | 25 |
| Expandable panels | 25 |
| Scroll targets (anchors with `id`) | 25 |
| Text blocks | 15 |

If a section has more elements than the cap, the AI can paginate using an offset parameter.

---

### 4.12 Known Limitations

1. **Shadow DOM**: `document.querySelectorAll` does not pierce Shadow DOM boundaries. Elements inside web component shadow roots are invisible to the scanner.

2. **No Background Scanning**: The AI does not continuously monitor the DOM. It scans on demand — when connecting, navigating, or after interactions. Dynamically injected content is discovered on the next explicit scan.

3. **Canvas / WebGL / Flash**: Content rendered inside `<canvas>`, WebGL, or plugin elements is invisible to the scanner.

4. **Custom Non-Semantic Widgets**: If your site uses custom dropdowns (nested divs/spans instead of `<select>`) or buttons without `role="button"`, the scanner may fail to detect them. **Always add semantic ARIA roles to custom interactive components.**

5. **DOM Settlement Timing**: After clicking an element, the scanner waits up to **1500ms** (with a 400ms quiet period) for DOM mutations to settle. Extremely slow API-driven UI updates beyond this window may not be captured immediately — the AI can scan again to see the updated state.

6. **Label Matching**: The AI uses **tolerant label matching** — it normalizes whitespace, lowercases, and checks substring containment. This means `"add to cart"` matches `"Add To Cart"` or even `"Add to cart (Espresso)"`. However, completely different labels will fail to match, causing a stale-reference safety error.

7. **External Navigation Blocked**: For security, the AI cannot navigate to external domains. All navigation is restricted to same-origin paths.

---

## 4.13 Realtime Provider Selection (Gemini vs Botnoi)

The realtime voice system supports multiple backend providers: **Gemini Live** and **Botnoi Voicebot**. The provider is selected **automatically per widget** based on your Firebase configuration — no client-side configuration is needed.

### How Provider Selection Works

1. **Client sends widgetId** to the token endpoint (no provider field)
2. **Backend reads `realtime.provider`** from widget's Firebase config
3. **Backend mints token** from appropriate provider (Gemini API or Botnoi voicebot server)
4. **Backend returns `{ provider, token, config, botnoiServerUrl? }`**
5. **Client dynamically loads** the correct provider class based on the `provider` field

### HTML Markup is Identical

Whether your widget uses Gemini or Botnoi, the HTML markup stays the same:

```html
<!-- Same markup for both providers — server decides based on widget config -->
<script>
    window.ChatWidgetConfig = {
        mode: "realtime-fullscreen",
        widgetId: "my-widget-id",  // Provider determined by Firebase config for this widget
        avatarUrl: "Botnoi"
    };
</script>
<script src="https://webavatar.didthat.cc/chat-widget.js"></script>
```

### Provider Comparison

| Feature | Gemini Live | Botnoi Voicebot |
|---------|-------------|-----------------|
| Audio Sample Rate (Output) | 24kHz | 16kHz |
| Duplex Mode (Default) | Full-duplex (barge-in enabled) | Half-duplex (`mic_off`/`mic_on`) |
| Greeting | Client sends greeting instruction | Server sends greeting automatically |
| Text Messages | Supported via `sendUserMessage()` | Not yet supported (reserved for future) |
| Tool Format | Gemini `toolCall`/`toolResponse` | OpenAI-style `tool_call`/`tool_response` |
| Session Limit (Default) | 180s (3 minutes) | 600s (10 minutes) |

### Configuring Provider in Firebase

To switch a widget between providers, update its Firebase document:

```javascript
// Firebase Firestore: widgets/{widgetId}
{
  realtime: {
    provider: "gemini",  // or "botnoi"
    prompt: "You are a helpful assistant.",
    bargeInEnabled: true,  // Gemini: barge-in, Botnoi: interruptible
    tools: [...],
    // ... other config
  }
}
```

**Note**: The `provider` field defaults to `"gemini"` if not specified, maintaining backward compatibility with existing widgets.

---

## 5. Troubleshooting

### 1. Stuck on "Connecting to AI..."
* **Origin Mismatch**: Verify that your current domain (including protocol and port, e.g. `https://mywebsite.com`) is added to the whitelisted domains in your WebAvatar dashboard settings for this `widgetId`.
* **Token Expired**: Ephemeral connection tokens are single-use and expire if the connection takes longer than 60 seconds to complete. Click connect again to request a new token.

### 2. Microphone Access Blocked
* **HTTPS Required**: Modern browsers disable microphone APIs on non-secure origins. Your website must be served over `HTTPS` (except for `localhost`).
* **In-App Webview Restrictions**: In-app browsers (such as within LINE, Facebook Messenger, or WeChat) frequently restrict microphone permissions. Catch the permission error to prompt users to open the page in their device's default web browser (Safari/Chrome).

### 3. Autoplay Restrictions / Audio is Muted
* **User Gesture Required**: Modern browsers block audio output until a user interacts with the page. The connection starts on the click of the Call Button, which serves as the required user gesture to unmute the audio context.

### 4. AI Can't Find an Element on Your Page
* **Missing labels**: Add `aria-label` to buttons and sections. Use `<label for="...">` on inputs.
* **Non-semantic markup**: Replace `<div onclick="...">` with `<button>` or add `role="button"`.
* **Shadow DOM**: Elements inside shadow roots are not accessible. Consider using light DOM or slots.
* **Same-Origin**: Navigation tools only work with same-origin links.
