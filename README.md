# HealerJi

Premium web experience for HealerJi (Sattveda Wellness Technology Pvt Ltd),
built on the **Sattva** design system — Next.js 15, TypeScript, Tailwind,
Framer Motion, Radix, Supabase.

## Run

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev
```

## Principles encoded here

1. **One Breath** — every ambient animation shares one 10s calm cycle.
2. **Show, never assert** — each trust claim links to its evidence (/trust).
3. **Honest by default** — no fake faces, no invented counters, experiential
   language only (Drugs & Magic Remedies Act / dark-pattern guidelines aware).
4. **Reduced motion is a full experience**, not an afterthought.

`lib/data/*` ships development seed data; production swaps in Supabase
queries of identical shape (see comments in each module).
