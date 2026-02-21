# React Client

This directory contains the modern React-based frontend for Wikitruth.

## Structure

```
client/
├── index.tsx           # Entry point
├── tsconfig.json       # Client TypeScript configuration (extends ../tsconfig.base.json)
├── src/
│   ├── components/     # Reusable React components
│   │   ├── Layout/     # Layout components (Header, Footer, etc.)
│   │   ├── Form/       # Form components
│   │   ├── EntryRow/   # Entry row components
│   │   └── common/     # Shared UI components
│   ├── pages/          # Page components (one per route)
│   ├── services/       # API service layer
│   ├── context/        # React context providers
│   ├── hooks/          # Reusable hooks
│   ├── types/          # TypeScript type definitions
│   ├── styles/         # CSS styles
│   └── App.tsx         # Main App component with routing
└── README.md
```

## Development

### Building the Client

To build the React client for production:

```bash
npm run build:client
```

This will compile the React app and output the bundle to `public/dist/bundle.js`.

### Development Mode

To build in development mode with source maps:

```bash
npm run build:client:dev
```

To continuously rebuild during frontend development:

```bash
npm run dev:client
```

To run backend + client watch together:

```bash
npm run dev:all
```

To run client-focused tests:

```bash
npm run test:client
```

## Accessing the React App

The React app is available at `/app` when the server is running.

For example:
- Home: `http://localhost:8000/app`
- Topics: `http://localhost:8000/app/topics`

## API Endpoints

The React app communicates with the backend through REST API endpoints:

- `GET /api/home`
- `GET /api/search?q=:query`
- `GET /api/topics` and `GET /api/topics/entry/:id`
- `GET /api/arguments` and `GET /api/arguments/entry/:id`
- `GET /api/questions` and `GET /api/questions/entry/:id`
- `GET /api/answers` and `GET /api/answers/entry/:id`
- `GET /api/issues` and `GET /api/issues/entry/:id`
- `GET /api/opinions` and `GET /api/opinions/entry/:id`
- `GET /api/artifacts` and `GET /api/artifacts/entry/:id`
- `GET /api/groups` and `GET /api/groups/entry/:id`
- `GET /api/members`, `/screeners`, `/reviewers`, `/administrators`, and `/:username`

## Technology Stack

- **React 18.2** - UI library
- **TypeScript** - Type-safe JavaScript
- **React Router 6** - Client-side routing
- **Webpack 5** - Module bundler
- **Bootstrap 3** - CSS framework (reusing existing styles)

## Notes

- The React app maintains the same look and feel as the original server-rendered version
- All existing Bootstrap styles are reused
- The app uses client-side routing for a single-page application experience
- No full page refreshes occur when navigating between pages
