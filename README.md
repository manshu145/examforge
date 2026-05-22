# ExamForge

> Your AI Mentor for UPSC, NEET, JEE & State PSC Exams

An AI-native preparation platform: personalized study planner, descriptive
answer evaluator, AI doubt solver, mock tests (engine ready), PYQ + Current
Affairs (data ready), and Stripe billing.

---

## Tech stack

| Layer        | Choice                                              |
| ------------ | --------------------------------------------------- |
| Framework    | Next.js 15 (App Router) + TypeScript + React 19     |
| Styling      | Tailwind CSS v4 + shadcn/ui (new-york)              |
| Auth         | Supabase Auth (email + Google OAuth)                |
| Database     | Supabase Postgres + Drizzle ORM                     |
| Payments     | Stripe (Checkout + Customer Portal + webhooks)      |
| AI           | Groq (Llama 3.3 70B) + OpenAI (GPT-4o-mini)         |
| Forms        | React Hook Form + Zod                               |
| Toasts       | Sonner                                              |
| Deployment   | Vercel + Supabase                                   |

## What's shipped

| Feature                    | Status                                          |
| -------------------------- | ----------------------------------------------- |
| Marketing site             | ✅ Landing, pricing, about                       |
| Auth                       | ✅ Email/password + Google OAuth                 |
| Onboarding                 | ✅ 3-step wizard (exam → year/hours → weak topics) |
| Study planner              | ✅ AI-generated, adaptive, check-off tasks       |
| Answer evaluator           | ✅ 6-dim rubric + model answer + improvement notes |
| Doubt solver               | ✅ Threaded chat, exam-aware                     |
| Stripe billing             | ✅ Checkout + Customer Portal + webhooks         |
| Quotas (free/pro)          | ✅ append-only `usage_events` ledger             |
| Mock tests                 | 📦 DB schema + RLS ready, UX placeholder         |
| PYQ + Current Affairs      | 📦 DB schema + RLS ready, UX placeholder         |
| Progress analytics         | 📦 DB schema + RLS ready, UX placeholder         |

---

## Local setup (5 minutes)

### 1. Install

```bash
git clone https://github.com/<you>/examforge
cd examforge
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the URL, anon key, and service role key into `.env.local`.
3. **Project Settings → Database**: copy the **pooler** connection string (Session mode, port 5432) into `DATABASE_URL`.
4. **Authentication → URL Configuration**: add `http://localhost:3000/callback` to redirect URLs.
5. **Authentication → Providers**: enable Email; optionally enable Google (paste OAuth client ID/secret).

```bash
npm run db:push      # creates the 17 tables
npm run db:seed      # applies RLS, triggers, and seeds 4 exams / 13 subjects / 56 topics
```

### 3. AI

```env
GROQ_API_KEY=gsk_...        # planner + doubt solver (Llama 3.3 70B)
OPENAI_API_KEY=sk-...       # answer evaluator (GPT-4o-mini)
```

Either is optional — features that need a key will show a clean "missing key" error rather than crash.

### 4. Stripe (optional for billing)

1. Create products in Stripe (Test mode):
   - "ExamForge Pro" with two recurring prices: ₹499/month, ₹3999/year
2. Copy the price IDs into `.env.local` as `STRIPE_PRICE_ID_PRO_MONTHLY` and `STRIPE_PRICE_ID_PRO_YEARLY`.
3. Stripe CLI for local webhook testing:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy the `whsec_...` it prints into STRIPE_WEBHOOK_SECRET
```

### 5. Run

```bash
npm run dev
# http://localhost:3000
```

---

## Deploy to Vercel

```bash
# from the repo root
vercel link        # one-time, links to your Vercel project
vercel env pull    # pulls existing env vars (or set them in the dashboard)
vercel --prod
```

In the **Vercel dashboard → Project → Settings → Environment Variables**, add:

| Var                              | Required                          |
| -------------------------------- | --------------------------------- |
| `NEXT_PUBLIC_APP_URL`            | `https://your-app.vercel.app`     |
| `NEXT_PUBLIC_SUPABASE_URL`       | ✅                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | ✅                                 |
| `SUPABASE_SERVICE_ROLE_KEY`      | ✅ (webhooks)                      |
| `DATABASE_URL`                   | ✅ (Supabase pooler URL)           |
| `GROQ_API_KEY`                   | for `/planner` + `/doubts`        |
| `OPENAI_API_KEY`                 | for `/evaluator`                  |
| `STRIPE_SECRET_KEY`              | for billing                       |
| `STRIPE_WEBHOOK_SECRET`          | for billing                       |
| `STRIPE_PRICE_ID_PRO_MONTHLY`    | for billing                       |
| `STRIPE_PRICE_ID_PRO_YEARLY`     | for billing                       |

After your first deploy:

1. **Supabase** — add `https://your-app.vercel.app/callback` to Auth redirect URLs.
2. **Stripe** — in Dashboard → Developers → Webhooks, add an endpoint `https://your-app.vercel.app/api/stripe/webhook` listening to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Redeploy so the new envs take effect.

---

## Scripts

| Script                | What it does                                     |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | Local dev server                                 |
| `npm run build`       | Production build                                 |
| `npm run lint`        | ESLint                                           |
| `npm run typecheck`   | `tsc --noEmit`                                   |
| `npm run db:generate` | Drizzle: emit SQL migrations from schema         |
| `npm run db:migrate`  | Drizzle: apply migrations                        |
| `npm run db:push`     | Drizzle: push schema directly (dev only)         |
| `npm run db:studio`   | Drizzle Studio (browse the DB)                   |
| `npm run db:seed`     | Apply RLS + seed exams/subjects/topics           |

## Project layout

```
src/
├── app/
│   ├── (marketing)/      # Landing, pricing, about
│   ├── (auth)/           # Login, signup, OAuth callback
│   ├── (app)/            # Protected: dashboard, planner, evaluator, doubts, settings
│   ├── onboarding/       # Post-signup gate
│   └── api/stripe/       # Webhook handler
├── components/
│   ├── ui/               # shadcn primitives
│   ├── marketing/        # Public-site components
│   ├── app/              # Topbar, user menu, coming-soon
│   ├── auth/             # Login + signup forms
│   ├── onboarding/       # Wizard
│   ├── planner/          # Timeline, task cards, new-plan form
│   ├── evaluator/        # Form, rubric chart
│   └── doubts/           # Chat input + message
├── lib/
│   ├── env.ts            # Zod-validated env
│   ├── supabase/         # Browser/server/middleware clients
│   ├── db/               # Drizzle schema + migrations + RLS
│   ├── ai/               # Provider, prompts, schemas
│   ├── stripe/           # Client + plan IDs
│   ├── auth.ts           # getCurrentUser / requireUser / requireOnboardedUser
│   └── quotas.ts         # FREE_LIMITS + assertQuota + logUsage
├── server/actions/       # Server actions (planner, evaluator, doubts, billing, …)
└── middleware.ts         # Session refresh + route protection
```

## Free vs Pro

| Feature            | Free                  | Pro       |
| ------------------ | --------------------- | --------- |
| Study plans        | 2 generations / month | Unlimited |
| Doubt solver       | 5 / day               | Unlimited |
| Answer evaluator   | 3 / month             | Unlimited |
| Mock tests         | 2 / month             | Unlimited |
| Priority model     | —                     | ✅         |
| Exportable reports | —                     | ✅         |

Limits are enforced at the server-action layer (`src/lib/quotas.ts`) using the
append-only `usage_events` table. Tweak in one file.
