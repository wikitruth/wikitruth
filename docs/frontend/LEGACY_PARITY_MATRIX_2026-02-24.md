# Legacy-to-Modern Parity Matrix (2026-02-24)

Legend: `Done` = modern React flow implemented and verified, `Legacy retained` = old template flow intentionally kept for comparison fallback.

| Area | Legacy route/template baseline | Modern React route | API contract | Status | Evidence |
|---|---|---|---|---|---|
| Local auth login/logout | `/login`, `/logout` templates | `/app/login`, `/app/logout` | `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | Done + Legacy retained | Client auth integration tests + server smoke tests |
| Signup | `/signup` template | `/app/signup` | `/api/auth/signup` | Done + Legacy retained | `signupFlow.integration.test.tsx` |
| Social auth (login/signup) | `/login/:provider`, `/signup/:provider` | React buttons redirect to legacy OAuth entry routes | Existing passport/OAuth routes + session auth API | Done + Legacy retained | `SocialLoginButtons.test.tsx`, route contract smoke |
| Password recovery | Legacy email/token templates | `/app/forgot-password`, `/app/reset-password` | `/api/auth/forgot-password`, `/api/auth/reset-password` | Done + Legacy retained | forgot/reset integration tests |
| Topic + argument create | Legacy create forms | `/app/topics/create`, `/app/arguments/create` | `/api/topics` POST, `/api/arguments` POST | Done + Legacy retained | server smoke + OpenAPI contract |
| Question/answer/issue/opinion/artifact create/edit | Legacy create/edit forms | `/app/*/create`, `/app/*/edit/:id` | `/api/*` POST + `/api/*/entry/:id` PUT | Done + Legacy retained | server smoke + route config tests |
| Group lifecycle | Legacy group pages | `/app/groups/create`, `/app/groups/:id`, `/app/groups/:id/members` | `/api/groups` + member join/leave/update routes | Done + Legacy retained | build + smoke coverage |
| Profile custom pages | Legacy member pages | `/app/members/profile/pages/*` and public profile page view | `/api/members/:username/pages*` | Done + Legacy retained | server smoke coverage |
| Admin reads/writes | Legacy admin templates | `/app/admin/*` | `/api/admin/users|groups|categories|statuses` GET/POST/PUT/DELETE | Done + Legacy retained | admin route smoke + admin page tests |
| Account verification | Legacy verification flow | `/app/account/verification` | `/api/auth/verification-status`, `/verification-resend`, `/verification-confirm` | Done + Legacy retained | server smoke coverage |
| DB backup admin flow | Legacy `/admin/db-backup` | `/app/admin/db-backup` | `/api/admin/db-backup` GET/POST | Done + Legacy retained | server smoke coverage |

## Notes

- Legacy templates are intentionally not deleted to support side-by-side comparison and rollback confidence.
- Parity closure for this phase is based on route/API implementation parity plus automated regression evidence captured in `/docs/frontend/UAT_CHECKLIST.md`.
