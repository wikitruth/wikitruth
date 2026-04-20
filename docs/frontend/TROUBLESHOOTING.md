# Frontend Troubleshooting

## `npm run build:client` fails

- Ensure Node and npm versions match `package.json` engine constraints.
- Remove lock/cache artifacts and reinstall dependencies:
  - `rm -rf node_modules`
  - `npm install`

## React routes show 404 after refresh

- Verify server serves `public/react-app.html` for root routes (`/*`).
- Verify `/app/*` alias redirects are still wired in `server/src/middlewares/routes.ts`.

## API calls fail in local dev

- Start backend on `http://localhost:8000`.
- Ensure webpack dev server proxy in `webpack.config.js` points to backend.

## Tests fail with DOM globals missing

- Confirm Jest client config uses `jsdom` environment.
- Ensure `client/src/test-utils/setupTests.ts` is configured in `setupFilesAfterEnv`.

## Styling regressions

- Check both `client/src/styles/theme.css` and `client/src/styles/global.css` are imported by `client/src/styles/index.css`.
