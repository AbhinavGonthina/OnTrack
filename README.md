# OnTrack

A full-stack job application tracker website built for general CS job searches. Features include a dashboard containing an application status pipeline and application statistics, application manager, and a Gemini-powered resume and job-description fit check.

**Live demo:** [ontrack.abhinavgonthina.me](https://ontrack.abhinavgonthina.me). Click "Try Demo" for a read-only tour with seeded data, or sign up for your own account!

> The way the backend is hosted right now, it spins down after 15 minutes idle. First load after a nap might take up to two and a half minutes to wake back up. The UI includes this detail, and will keep you occupied with a 100-question CS and SWE interview quiz while it boots.

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

## Why it is built

I created this project as a way to track my own job search. I wanted to create a hub where I can track the overall progression of my job search without having to manually calculate anything or us more than one source to do so. In r/NEU (Northeastern's reddit), often times people will post the results of their internship/co-op search by means of a sankey diagram - https://en.wikipedia.org/wiki/Sankey_diagram. This web app combines that with the basic CRUD features that someone would want to keep track of their application, and also incorporates an integrated AI review aspect in case you want quick tips on how to tweak your resume for a specific job description/a better general resume.

## Technical details

Behind the CRUD there are a handful of things I deliberately spent time on, and they are the parts I would actually want to talk through in an interview.

**Event-sourced status pipeline.** Status changes are appended as immutable `StatusEvent` rows instead of overwriting a single column. The full history survives, the funnel can be recomputed at any time, and "how many applications ever reached OA" becomes a real query rather than a guess. It also means a rejection needs no separate "rejected from" field, because the event sitting before it already is the stage it came from.

**SQL where an ORM would not reach.** The Sankey needs a `LAG()` window function to compare each status event with the one before it per application, which JPQL cannot express. `StatsService` drops down to `NamedParameterJdbcTemplate` with raw SQL for exactly that, while everything else uses Spring Data JPA where a repository is the right tool.

**Rate limiting at three levels.** A Bucket4j filter caps general API traffic at 60 requests per minute per user, falling back to IP when the caller is not signed in. Gemini calls get their own budget of 20 per user per day, checked only on a genuine cache miss so re-reading a cached result costs nothing. Outbound email is capped at 5 per address per hour, so nobody can point the signup or password reset forms at a stranger's inbox and flood it. The Gemini and email counters live in Postgres rather than memory, because a limit that resets every time a free tier container spins down is not really a limit.

**Caching every AI result.** Fit analyses are keyed on a SHA-256 of the resume and job description together, resume strength on a hash of the resume by itself. Change nothing and you pay nothing. Change a single word and it recomputes, because the hash stops matching.

**Demo mode that cannot cost money.** The seeded demo user's fit analyses have their input hashes computed in Postgres with `pgcrypto`, so they match the runtime Java hash exactly. Demo traffic flows through the ordinary cache hit path and can never trigger a live Gemini call, without a single special case anywhere in the service layer.

**Auth that keeps nothing sensitive in the browser.** The JWT lives in React context only. Restoring a session after a refresh works off an httpOnly cookie that JavaScript can never read, so the page holds nothing worth stealing and nothing it could tamper with. The Gemini API key stays server side and every AI call is proxied through the backend, which is also where the caching and rate limiting live.

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
