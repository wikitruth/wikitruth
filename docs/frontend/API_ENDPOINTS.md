# Frontend API Endpoints

## Base

- Client API base path: `/api`

## Auth

- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Content

- `GET /api/home`
- `GET /api/topics`
- `GET /api/topics/entry/:id`
- `GET /api/arguments`
- `GET /api/arguments/entry/:id`
- `GET /api/questions`
- `GET /api/questions/entry/:id`
- `GET /api/answers`
- `GET /api/answers/entry/:id`
- `GET /api/issues`
- `GET /api/issues/entry/:id`
- `GET /api/opinions`
- `GET /api/opinions/entry/:id`
- `GET /api/artifacts`
- `GET /api/artifacts/entry/:id`

## Community

- `GET /api/groups`
- `GET /api/groups/entry/:id`
- `GET /api/members`
- `GET /api/members/screeners`
- `GET /api/members/reviewers`
- `GET /api/members/administrators`
- `GET /api/members/:username`

## Admin

- `GET /api/admin`
- `GET /api/admin/users`
- `GET /api/admin/accounts`
- `GET /api/admin/administrators`
- `GET /api/admin/groups`
- `GET /api/admin/categories`
- `GET /api/admin/statuses`
