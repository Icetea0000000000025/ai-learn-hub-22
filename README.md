# AI Learn Hub

An AI-powered learning platform designed for creating, consuming, and managing online courses. Creators can generate structured course paths with Google Gemini AI, boost visibility using active Stripe ad sponsorships, and sell courses. Students can enroll, track progress, test their knowledge with AI-generated quizzes, and receive verified certificates of completion.

Detailed system flow documentation is available in [flow.md](flow.md).

---

## Prerequisites

Ensure you have the following installed:
* **Node.js** (v22.12.0 or higher) or **Bun** (v1.1.0 or higher)
* **Supabase Account** (for Auth, PostgreSQL, and Storage)
* **Google AI Studio Key** (for Gemini AI content generation)
* **Stripe Account** (for payment and ad sponsor testing)

---

## Getting Started

### 1. Clone & Install Dependencies

Clone this repository to your local machine:
```bash
git clone <repository-url>
cd ai-learn-hub-22
```

Install packages using `npm` or `bun`:
```bash
# Using npm
npm install

# Using bun
bun install
```

### 2. Environment Variables Configuration

Copy the example environment file to create your `.env` configuration:
```bash
cp .env.example .env
```

Open `.env` and populate the keys:
```env
# Supabase Configuration (Vite-exposed)
VITE_SUPABASE_URL=https://your_supabase_url.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key

# Backend Configuration (Strictly Private - No VITE_ prefix)
SUPABASE_SERVICE_ROLE_KEY=your_private_service_role_key
GEMINI_API_KEY=your_gemini_api_key

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application URL (for Stripe redirect fallbacks)
APP_URL=http://localhost:8080/
```

### 3. Database Setup (Supabase)

Ensure you have the required schema tables set up in your Supabase project. Key tables include:
* `profiles`
* `courses`
* `modules`
* `lessons`
* `enrollments`
* `user_progress`
* `quizzes`
* `organization_profiles`, `organization_packages`, `organization_members`
* `ai_logs`
* `payments`, `ad_purchases`

You can find the schema migration file or context under the `supabase/` folder.

---

## Development Scripts

Run the following commands inside the root directory:

### Run Local Development Server
Starts the Vite dev server with Hot Module Replacement (HMR) at `http://localhost:8080/`.
```bash
npm run dev
# or
bun run dev
```

### Production Build
Builds the client and server assets for production deployment (specifically optimized for Cloudflare SSR Workers).
```bash
npm run build
# or
bun run build
```

### Preview Production Build
Starts a local preview server of the generated production bundle to test SSR capabilities.
```bash
npm run preview
# or
bun run preview
```

### Code Quality (Linting & Formatting)
Analyze code for errors and formatting issues:
```bash
# Run ESLint check
npm run lint

# Automatically format code with Prettier
npm run format
```

---

## Key Directories

* `/src/routes/`: File-based application routes mapped using TanStack Router.
* `/src/lib/`: Unified client-side libraries and TanStack Start `createServerFn` actions (Gemini course generator, auth hooks, stripe calls, plagiarism checks).
* `/src/components/`: Shared UI components built with Tailwind v4.
* `/src/server-runtime/`: Server-specific entry handlers (Stripe webhook verification, purchase fulfillment, SSR response normalization).
