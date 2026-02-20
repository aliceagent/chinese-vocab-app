# Chinese Vocab App — Technical Architecture

> ⚠️ **READ THIS BEFORE MAKING ANY CHANGES. Violations of this doc have caused production outages.**

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14 (App Router) | TypeScript, Tailwind CSS |
| Backend | Next.js API Routes | /src/app/api/* |
| Database | **PostgreSQL via Supabase** | NEVER change this |
| ORM | Prisma v7 | Schema at prisma/schema.prisma |
| AI | OpenAI API | gpt-4o-mini for story generation |
| Deployment | Vercel | Auto-deploys from GitHub main branch |
| Auth | NextAuth.js + JWT | Session-based |

## Database: Supabase PostgreSQL

**Project URL:** https://lvouyldgcnahprjjjejx.supabase.co  
**Region:** AWS ap-southeast-1

### ⛔ CRITICAL RULES — DATABASE

1. **NEVER switch the database provider.** The database is Supabase PostgreSQL. Do not change to SQLite, MySQL, or any other provider.
2. **NEVER run `prisma migrate reset`** — this will wipe production data.
3. **NEVER change `provider = "postgresql"` in schema.prisma.**
4. **NEVER add `url` to the datasource** — Prisma v7 uses prisma.config.ts for connection config.
5. Schema changes: use `npx prisma db push` (not migrate) for Supabase compatibility.
6. Environment variables are managed in Vercel dashboard — the local `.env` is gitignored and never committed.

### Why not SQLite?

Vercel is a serverless platform. SQLite requires a persistent local filesystem, which serverless environments don't have. Any SQLite changes will work locally but break in production.

**Previous incident:** A sub-agent incorrectly switched the entire project to SQLite, breaking production deployment and requiring emergency restoration.

### Prisma Schema Rules

- Use native PostgreSQL types: `String[]` for arrays, proper enums
- Use `@map` annotations for snake_case DB columns
- Never convert enums to String workarounds
- `englishDefinitions String[]` — this is a native PG array, NOT a JSON string
- Never use direct database connections or better-sqlite3 in API routes

### Prisma v7 Configuration

- Database connection configured in `prisma.config.ts` (NOT in schema.prisma)
- No `url` field in the datasource block
- Use `npx prisma generate` after schema changes
- Use `npx prisma db push` to sync schema to Supabase

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| /api/stories/generate | POST | AI story generation (calls OpenAI) |
| /api/vocabulary/words | GET/POST | Vocabulary CRUD (uses Prisma) |
| /api/upload | POST | Document upload + vocab extraction |
| /api/auth/* | * | Authentication via NextAuth |
| /api/progress | GET | User progress tracking |
| /api/statistics | GET | Usage statistics |

### API Route Rules

1. **Always use Prisma client** — import from `@/lib/prisma`
2. **Never use direct database connections** — no better-sqlite3, no raw SQL
3. **Never use JSON.parse on array fields** — PostgreSQL arrays are native
4. **Validate user ownership** — check that resources belong to authenticated user
5. **Handle errors gracefully** — wrap in try/catch with proper error responses

## OpenAI Integration

- Model: `gpt-4o-mini` (set via `OPENAI_MODEL` env var, defaults to gpt-4o-mini)
- **Do NOT use `response_format: { type: "json_object" }`** — not supported by all model tiers
- Use prompt-based JSON extraction instead
- API key is in `OPENAI_API_KEY` env var (Vercel dashboard)

### Example API Call (Correct)

```typescript
const completion = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  messages: [
    { role: "system", content: "Return ONLY valid JSON..." },
    { role: "user", content: prompt }
  ],
  temperature: 0.8,
  max_tokens: 2000
  // NO response_format field
})
```

## Environment Variables

All sensitive config lives in Vercel's environment dashboard (never in git):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase PostgreSQL pooler URL |
| `DIRECT_URL` | Supabase PostgreSQL direct URL |
| `OPENAI_API_KEY` | OpenAI API key |
| `NEXTAUTH_SECRET` | NextAuth session secret |
| `NEXTAUTH_URL` | App URL |

**Local development:** Copy `.env.example` to `.env` and fill in values. The real passwords are in Vercel, not in git.

## Deployment

- **Platform:** Vercel
- **Trigger:** Push to `main` branch on GitHub → auto-deploys
- **Repo:** https://github.com/aliceagent/chinese-vocab-app
- **Build command:** `npm run build`
- **Framework:** Next.js (auto-detected)
- **Environment variables:** Set in Vercel dashboard, NOT in code

## File Structure

```
src/
  app/
    api/          # Backend API routes
    stories/      # Stories page
    vocabulary/   # Vocabulary pages  
    quiz/         # Quiz pages
  components/     # React components
  lib/
    prisma.ts     # Prisma client singleton
    auth.ts       # Auth configuration
    constants.ts  # App constants
  services/       # Service layer
prisma/
  schema.prisma   # Database schema (PostgreSQL)
  migrations/     # DO NOT run on Supabase — use db push
prisma.config.ts  # Prisma v7 connection config
```

## Common Mistakes to Avoid

| ❌ Mistake | ✅ Correct | Why |
|-----------|-----------|-----|
| Changing database to SQLite | Keep PostgreSQL/Supabase | Vercel is serverless, no persistent filesystem |
| Using `response_format: json_object` with OpenAI | Use prompt-based JSON | Not all models support structured output |
| Running `prisma migrate reset` | Use `prisma db push` only | Migrate commands can wipe production data |
| Committing `.env` files | They are gitignored — use Vercel dashboard | Prevents credential leaks |
| Treating `String[]` fields as JSON strings | They are native PG arrays | No JSON.parse needed |
| Using absolute file paths in DATABASE_URL | Use the Supabase connection string | SQLite paths don't work in serverless |
| Adding `url` to datasource in schema.prisma | Configure in prisma.config.ts | Prisma v7 requirement |
| Direct database connections in API routes | Always use Prisma client | Type safety and consistency |
| Installing better-sqlite3 | Remove it, use Prisma | Wrong database layer |

## Emergency Recovery Procedures

### If Someone Breaks the Database Config

1. **Stop** — don't make it worse
2. **Restore schema:** `git show 117157e:prisma/schema.prisma > prisma/schema.prisma`
3. **Fix datasource:** Remove `url` field, keep only `provider = "postgresql"`
4. **Restore Prisma client:** Copy template from this doc
5. **Fix API routes:** Remove JSON.parse on array fields
6. **Update packages:** `npm install prisma@latest @prisma/client@latest`
7. **Remove SQLite:** `npm uninstall better-sqlite3 @types/better-sqlite3`
8. **Generate:** `npx prisma generate`
9. **Test locally** then push

### If OpenAI Calls Fail

1. Check `OPENAI_API_KEY` in Vercel dashboard
2. Verify model name (use `gpt-4o-mini` as fallback)
3. Remove `response_format` if present
4. Check prompt format and length limits

### If Vercel Deploy Fails

1. Check build logs for Prisma errors
2. Verify environment variables are set in Vercel dashboard
3. Ensure `DATABASE_URL` uses Supabase connection string
4. Check for SQLite references in code

## Success Patterns

### Correct Prisma Usage

```typescript
import { prisma } from '@/lib/prisma'

// Create with array fields
const item = await prisma.vocabularyItem.create({
  data: {
    englishDefinitions: ['hello', 'hi', 'greetings'], // Native array
    exampleSentences: ['Hello world', 'Hi there']     // Native array
  }
})

// Query array fields
const items = await prisma.vocabularyItem.findMany({
  where: {
    englishDefinitions: {
      has: 'hello'  // PostgreSQL array contains
    }
  }
})

// Use in code - no JSON.parse needed!
const definitions = item.englishDefinitions.join(', ')
```

### Correct API Route Structure

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    // 2. Parse and validate
    const body = await request.json()
    if (!body.required_field) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // 3. Use Prisma (never direct DB)
    const result = await prisma.model.create({
      data: body
    })

    // 4. Return success
    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
```

## Monitoring and Alerts

- **Vercel deployments:** Monitor build failures
- **Supabase dashboard:** Monitor connection health
- **API errors:** Check Vercel function logs
- **OpenAI usage:** Monitor API quotas

---

**Last updated:** February 2025 after emergency restoration from SQLite incident  
**Next review:** Before any major database or infrastructure changes