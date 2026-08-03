# The Wikitruth Project

[![Awesome Humane Tech](https://raw.githubusercontent.com/humanetech-community/awesome-humane-tech/main/humane-tech-badge.svg?sanitize=true)](https://github.com/humanetech-community/awesome-humane-tech)

The project aims to make a better world by finding the truth and facts of reality in all aspects of human knowledge, and presenting them in a way that is easy for laypeople to search and understand. It aims to do this through a systematic approach to contribution and the organization of arguments and evidence contrasted with reality and known facts.

An argument or a topic will be broken down into the smallest pieces necessary to discuss rationally and conclude its reliability and truthfulness. A set of contribution and discussion rules will be enforced by the system (automated) to prevent chaotic discussions, together with human critical thinking, moral intent, and the collective effort of everyone who wants to find the truth.

This is an open research effort and an attempt to collect all verifiable facts, and to allow everyone to contribute and challenge arguments with all sorts of doubts and questions they can think of. Eventually, we can come up with a "golden source" of truth and facts of reality that has survived all challenges, hardened and supported by all available evidence and arguments.

This project does not intend to replace Wikipedia, Quora, or other similar internet systems. It intends to provide a place for everyone who is looking for specific truth and facts of reality out of the ocean of information they see on the internet, from news, search results, crowd-sourced sites, people around them, and various other sources.

If someone wants to find information about different topics or explore the vast information on the internet without a strong need for reliability and verifiability, there is Wikipedia, Quora, and Google. But to see what is really the truth and reality, there is Wikitruth.

**Assumptions**
* A lot of people have difficulty finding true information and determining what to believe.
* The world will be a better place if people can know the real truth, find it easily, and distinguish it from random claims and opinions.
* There is a lot of information in the world, with truth and lies often intertwined. People cannot easily differentiate truth from lies because information is highly unorganized, and much of it is unverifiable, especially on the internet.
* Public understanding of facts can be influenced by media systems, governments, major corporations, and societal, cultural, or religious conditioning.
* If we can have a place where truth and lies are clearly organized, categorized, and distinctly separated, people will more easily see the truth and recognize what is false.
* If people know the truth, there will be fewer disagreements, fewer conflicts, better governance and politics, a better education system, only one religion, a better environment, better human relationships, better health, more love, and peace.

**Common failure patterns in internet discussions and forums when seeking truth**
* Mostly single-sided, controlled by users with admin privileges or by majority sentiment
* Citing unverified or unverifiable sources
* Chaotic, unorganized, or difficult to audit
* Ends in disagreements and often turns offensive or discriminatory
* Cyclic (looping arguments), never-ending (for example, recurring Creationism vs Evolution debates)
* Vital points get buried in comments
* Nonsense comments prevail because of upvote and engagement mechanics
* Popularity can outrank evidence, where viral claims spread faster than corrections
* Echo chambers and brigading can distort consensus and suppress nuance
* Repeated claims can look credible over time even without primary evidence
* Truth is hard to find

## Related Systems

### Knowledge/Reference Platforms

* Wikipedia
* Encyclopedia Britannica
* Google Search
* Grokipedia

### Discussion/Q&A Platforms

* Quora
* Reddit
* Stack Exchange

### AI Knowledge/Answer Systems

* ChatGPT
* Gemini
* Claude
* Perplexity
* Grok

### Historical/Legacy Platforms

* Yahoo! Answers (historical)
* Debate.org (historical)
* Citizendium (historical/reference)

## Runtime Surfaces

- Modern app (canonical): `/`
- Compatibility alias: `/app/*` (redirect/alias to modern root routes)
- Legacy app mount: `/legacy/*`
- API: `/api/*`

## Requirements

- Node.js `24.13.1` recommended (see `.nvmrc`)
- Supported engines:
  - Node.js `>=22.4.1 <25`
  - npm `>=10.8.1 <12`
- MongoDB running locally or remotely
- ImageMagick installed (used for image processing flows)

## Quick Start (Local Development)

```bash
git clone https://github.com/wikitruth/wikitruth.git
cd wikitruth
nvm use
npm install
cp .env.example .env
```

Update the required local values such as the MongoDB URI, then run:

```bash
npm run dev:all
```

### Email Delivery Setup

Administrators configure Resend or SMTP from **Admin → Email Operations**. Provider credentials are encrypted in an ignored private runtime JSON store, are write-only in the UI, and take effect without editing `.env` or restarting the application. The page also configures contact routing, previews every supported HTML/plain-text message, sends tests to the current verified administrator, and displays masked delivery activity.

Existing `SMTP_*` variables remain an optional migration fallback until an administrator-managed provider is verified and activated. See [the Email Operations runbook](./docs/runbooks/EMAIL_OPERATIONS.md) for setup, webhook, backup, and rollback guidance.

Development URLs:

- Modern client (webpack dev server): `http://localhost:3001`
- Backend/API: `http://localhost:8000`
- Client `/api/*` requests are proxied to `:8000`

## Production-Style Local Run

Build client bundle and run server-only:

```bash
npm run build:client
npm start
```

Then open:

- Modern app: `http://localhost:8000/`
- Legacy app: `http://localhost:8000/legacy/`

Legacy Grunt workflow (only if needed):

```bash
npm run start:legacy-grunt
```

## First-Time Database Bootstrap

On a fresh database:

1. Open `http://localhost:8000/install`
2. Run the MongoDB restore/install flow
3. Continue and sign in with seeded local credentials:

- Username: `root`
- Password: `dev123`

Use seeded credentials for local/dev only.

## Validation And Guardrails

Common commands:

```bash
npm run lint
npm run test:server
npm run test:client
npm run test:parity
npm run build
```

Contract and drift-focused checks:

```bash
npm run test:parity:url-contracts
npm run test:parity:server
```

Full CI-style local gate:

```bash
npm run test:ci
```

## Security/Session Configuration (Env)

Session and CSRF behavior is env-driven. Key variables include:

- `SESSION_COOKIE_NAME`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_SAMESITE`
- `SESSION_COOKIE_MAX_AGE_MS`
- `CSRF_IGNORE_METHODS`
- `CSRF_COOKIE_SIGNED`
- `CSRF_COOKIE_SECURE`
- `CSRF_COOKIE_SAMESITE`

For advanced/default config mapping:

- `config/config.example.js`
- `server/src/config/config.js`

## Project Layout

- `client/` modern React frontend
- `server/src/` modern server and API runtime
- `legacy/` legacy controllers/templates/static/build toolchain
- `legacy/compatibility/` thin legacy-modern bridge layer
- `docs/` plans, canonical cards, architecture references, and reports

## Documentation Map

- Docs index: [docs/README.md](./docs/README.md)
- Canonical cards: [docs/canonical/README.md](./docs/canonical/README.md)
- Active plans: [docs/plans/README.md](./docs/plans/README.md)
- System-reference hub: [docs/system-reference/README.md](./docs/system-reference/README.md)
- Imported ideas corpus: [docs/ideas-docs/README.md](./docs/ideas-docs/README.md)
- React client notes: [client/README.md](./client/README.md)
- Legacy compatibility notes: [legacy/compatibility/README.md](./legacy/compatibility/README.md)

URL contract and drift policy quick references:

- [docs/canonical/09_URL_CONTRACT_AND_DRIFT_POLICY.md](./docs/canonical/09_URL_CONTRACT_AND_DRIFT_POLICY.md)
- [docs/plans/LEGACY_MODERN_URL_FORMAT_DRIFT_CHECKLIST_PLAN_2026-04-22.md](./docs/plans/LEGACY_MODERN_URL_FORMAT_DRIFT_CHECKLIST_PLAN_2026-04-22.md)

## Connect and discuss

Feel free to send feedback to wikitruth.project@gmail.com or start a discussion on [Facebook](https://www.facebook.com/wikitruth.project).

## License

Wikitruth is free software licensed under the [GNU Affero General Public
License, version 3 or later](./LICENSE) (`AGPL-3.0-or-later`). If you modify
Wikitruth and make that modified version available to users over a network, the
license requires offering those users access to its corresponding source code.

Third-party components remain under their own licenses. See
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and the license files kept
with bundled components.
