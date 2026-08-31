# Genggi

A nostalgic social network for profiles, friends, messages, and fun — built with [Next.js](https://nextjs.org).

## Local development

Contributors can run the app locally **without any production secrets**.

```bash
git clone <repo>
cd genggeng-pro
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### How it works

Local development does **not** connect directly to the production database or
Cloudflare R2, so you never need `MONGODB_URI`, the `R2_*` credentials,
`RESEND_API_KEY`, or `AUTH_SECRET` on your machine.

Instead, the local Next.js server routes every database, R2, and email
operation through the production Genggi API, which holds the real secrets:

```text
Local Next.js  ->  Genggi production API (https://genggi.com)  ->  Production DB / R2
```

This is handled automatically by `lib/genggi.ts`. In production (where the
secrets are present) the same code connects directly — there is no behaviour
difference for end users.

### The one value you need locally

The only thing a contributor needs is a shared dev token that authenticates
the local server to the Genggi API's internal `/api/internal/*` routes:

1. On the **production deployment**, set `GENGGI_API_TOKEN` to a long random
   string.
2. Give the same string to each contributor to put in their `.env.local`:

   ```bash
   cp .env.example .env.local
   # then edit .env.local and fill in GENGGI_API_TOKEN
   ```

`GENGGI_API_TOKEN` grants privileged access, so keep it server-side only and
**never** prefix it with `NEXT_PUBLIC_` (that would expose it to browsers).
All `.env*` files except the committed `.env.example` template are
`.gitignore`d.

### Optional overrides

- `GENGGI_API_URL` — point local dev at a different API base URL (defaults to
  `https://genggi.com`).

## Tests

```bash
npm test
```

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Deploy on Vercel](https://vercel.com/new)
