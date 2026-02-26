# Client Development Setup

This guide covers local setup for the React client migration work.

## Prerequisites

- Node.js `>=22.4.1 <25` (recommended: `24.13.1`, see `.nvmrc`)
- npm `>=10.8.1 <12`
- Backend dependencies installed (`npm install` at repository root)

## Install Dependencies

From the repository root:

```bash
npm install
```

## Run Development Environment

Run backend and React client together:

```bash
npm run dev:all
```

Run backend only:

```bash
npm run dev:server
```

Run React client with webpack dev server + HMR only:

```bash
npm run dev:client
```

## Local URLs

- Legacy/backend app: `http://localhost:8000`
- React dev server: `http://localhost:3001`
- React SPA route base: `http://localhost:3001/app`

`/api/*` requests from the React dev server are proxied to `http://localhost:8000`.

## Build and Test

Build production client bundle:

```bash
npm run build:client
```

Run client tests:

```bash
npm run test:client
```

Run client tests in watch mode:

```bash
npm run test:client:watch
```

Run client coverage:

```bash
npm run test:coverage
```

Generate bundle analysis artifacts:

```bash
npm run analyze:bundle
```

## Environment Variables

Copy `.env.example` to `.env` and update for your environment.
Backend/runtime configuration is read from `config/config.js`.
Client-side configuration is injected at build time through webpack defines.

See `docs/frontend/ENVIRONMENT_VARIABLES.md` for the full variable matrix.

## Troubleshooting

- If port `3001` is in use, stop conflicting processes or change `devServer.port` in `webpack.config.js`.
- If API calls fail from the dev server, verify backend is running on `8000`.
- If TypeScript build fails, run `npm run tsc` to isolate server-side type errors.
