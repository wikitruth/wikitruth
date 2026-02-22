# React Component Style Guide

## Naming

- Use `PascalCase` for component files and component names.
- Keep route pages under `client/src/pages/**`.
- Keep reusable UI pieces under `client/src/components/**`.

## Structure

- Prefer typed props interfaces.
- Keep components presentational by default.
- Move side effects into hooks or service modules.

## Accessibility

- Prefer semantic HTML elements before ARIA fallbacks.
- Every interactive control must be keyboard reachable.
- Use `aria-*` attributes when state is not otherwise exposed.

## Styling

- Use existing Bootstrap utility classes where possible.
- Keep shared styling in `client/src/styles/global.css` and `client/src/styles/theme.css`.
- Reuse CSS variables from `theme.css`.

## Testing

- Use `client/src/test-utils/render.tsx` for component tests.
- Add behavior assertions (not implementation details).
- Add accessibility assertions for critical components.
