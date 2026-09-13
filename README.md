# OnTrack

A full-stack job application tracker built for SWE and CS job searches. It combines an event-sourced status pipeline, SQL-driven funnel analytics with a Sankey visualization, and a Gemini-powered resume and job-description fit check, all on top of a JWT-authenticated CRUD backend.

**Live demo:** [ontrack.abhinavgonthina.me](https://ontrack.abhinavgonthina.me). Click "Try Demo" for a read-only tour with seeded data, or sign up for your own account.

> The backend runs on Render's free tier, which spins down after 15 minutes idle. First load after a nap takes up to two and a half minutes to wake back up. The UI says so plainly and keeps you busy with a 100-question CS and SWE interview quiz while it boots. That is a deliberate trade for a demo link that costs nothing and stays live indefinitely, not an oversight.

## Screenshots

**Landing page**

![Landing page](docs/screenshots/landing.png)

**Dashboard: stage counts, funnel metrics, and a Sankey diagram of the whole pipeline**

![Dashboard](docs/screenshots/dashboard.png)

**Applications: searchable, filterable and paginated**

![Applications table](docs/screenshots/applications.png)

**Application detail: status timeline, notes, and the Gemini fit analysis**

![Application detail](docs/screenshots/application-detail.png)

> Earlier versions of the interface are archived in [`docs/screenshots/legacy-ui/`](docs/screenshots/legacy-ui/).

## What it does

- **Track applications** through a full status pipeline (Applied, OA, Phone Screen, Interview, Offer, then Accepted or Declined, with a rejection possible at any stage), keeping a timeline of every change and free-form notes per application.
- **See the whole funnel at a glance.** The dashboard shows how many applications currently sit at each stage, response and OA and interview and offer rates, and a Sankey diagram of exactly where applications progressed or fell off. It is computed server-side with a SQL window function over the append-only status history, not from each application's latest status.
- **Check your resume against a job description.** Paste a JD and get a Gemini-backed fit score, the keywords you are missing, and rewritten resume bullets. Results are cached on a hash of the resume and JD pair, so re-opening a result never costs another API call.
- **Upload a resume as PDF or DOCX**, have it normalized into clean text, and score its strength across four fixed categories. Strength scores are cached against the resume text, so re-scoring unchanged text is free.
- **Try it with zero setup** through a public, read-only demo with 12 seeded applications and no signup.

## Why it is built this way

This project exists to demonstrate backend engineering, not to be a wrapper around an AI API. The fit analysis is one feature among several. The CRUD, the event-sourced status model, and the SQL analytics are all meant to stand on their own in a technical interview.

- **Event-sourced status pipeline.** Status changes are appended as immutable `StatusEvent` rows rather than overwritten in place. The full history survives, funnel analytics can be recomputed at any time, and "how many applications ever reached OA" is an honest query instead of an assumption. It also means a rejection needs no separate "rejected from" field: the event before it already is the stage it came from.
- **SQL where an ORM would not reach.** The Sankey needs a `LAG()` window function to compare each status event with the previous one per application, which JPQL cannot express. `StatsService` uses `NamedParameterJdbcTemplate` with raw SQL for exactly this, while the rest of the app uses Spring Data JPA where a repository is the right tool.
- **Cost and abuse protection treated as a feature.** General API rate limiting (Bucket4j, 60 requests per minute per user or IP) is separate from a dedicated Gemini limiter (20 calls per user per day) that is only consulted on an actual cache miss. Both the Gemini cap and the per-email send cap live in Postgres rather than in memory, because a limit that resets every time a free-tier container spins down is not a limit. Every AI result is cached on a SHA-256 of its inputs, so repeat views cost nothing.
- **No credentials in browser storage.** The JWT lives in React context only, with an httpOnly refresh cookie the frontend can never read. A hard refresh re-validates against the server rather than trusting anything the page could have tampered with.

## Tech stack

**Backend:** Java 21, Spring Boot 4.1, Spring Data JPA plus `NamedParameterJdbcTemplate`, Spring Security 7 with JWT via `jjwt`, Flyway migrations, Bucket4j rate limiting, PostgreSQL on Neon, deployed to Render via Docker.

**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts for the Sankey diagram, deployed on Vercel.

**AI:** Google Gemini (`gemini-3.5-flash-lite`, pinned rather than a `-latest` alias) through Spring's `RestClient`, using structured JSON output and SHA-256 input-hash caching.

**Email:** Resend, for verification, password reset and problem reports.

**Testing:** JUnit 5 with Mockito and MockMvc on the backend (177 tests), Vitest with React Testing Library on the frontend (201 tests).

## Architecture

```
frontend/   Next.js app. All AI and database access goes through the
            backend API, never directly from the browser
backend/    Spring Boot API: auth, CRUD, rate limiting, Gemini proxy,
            SQL analytics
```

The Gemini API key never reaches the frontend. Every AI call is proxied through the backend, which is also where the rate limiting and caching live. Demo mode never makes a live Gemini call. It serves pre-seeded `FitAnalysis` rows whose input hashes are computed in Postgres to match the runtime Java hash exactly, so they flow through the same cache-hit path a real cached result would.

## Running it locally

**Backend** (needs a Postgres database, and Neon's free tier works well):

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
./mvnw spring-boot:run
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:8080`.
