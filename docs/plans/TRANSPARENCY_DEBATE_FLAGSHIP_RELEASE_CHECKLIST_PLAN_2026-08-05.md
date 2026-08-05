# Transparency, Debate Pilot, Flagship Content, and V2 Release Checklist (2026-08-05)

## Objective

Ship a privacy-safe public transparency and trust dashboard, reactivate a
narrow opt-in structured-debate pilot without changing normal discussion
enforcement, complete one real-world Wikitruth topic and one FixPH issue
cluster, publish the resulting `develop` release, and deploy the exact tested
SHA to the existing V2 environment.

## Authority and Boundaries

- The owner authorized direct publication to `origin/develop` and deployment to
  V2 in the current request.
- The official domain, V1 runtime, DNS, MongoDB migration, and legacy retirement
  are outside this release.
- Broad strict-debate enforcement remains deferred. The pilot is opt-in,
  isolated, reversible, and has no automatic verdict power.
- Migration/recovery-center and large-scale spam-cleanup jobs are operational
  implementation features, but remain deferred and are not part of this release.
- Populated host inventory, credentials, production exports, and test identities
  must never enter the public repository.

## Public Transparency Privacy Contract

- [x] Publish aggregates derived only from public, non-private records.
- [x] Expose no names, usernames, emails, IP addresses, session data, moderation
      notes, private records, or raw operational events.
- [x] Use coarse windows and suppression for small cohorts; do not provide a
      query surface that can be combined to infer individual activity.
- [x] Explain definitions, scope, freshness, limitations, and suppression in the
      public UI.
- [x] Keep popularity/reaction metrics separate from truth, screening, or
      verdict status.
- [x] Make the public API cacheable and bounded; aggregate only public civic
      records across tenants without exposing private tenant configuration.

## Accepted Dashboard Design Spec

- Desktop concept:
  `/Users/dsalunga/.codex/generated_images/019fb8bf-f649-7f20-9c31-2ab06c4c3ac3/exec-71658571-fe0e-48f9-8169-a5a6a71ba7d9.png`
- Mobile concept:
  `/Users/dsalunga/.codex/generated_images/019fb8bf-f649-7f20-9c31-2ab06c4c3ac3/exec-abb1f43f-cb37-43df-b447-8e88fd938328.png`
- Palette: existing `--wt-page`, `--wt-surface`, `--wt-surface-muted`,
  `--wt-text`, `--wt-text-muted`, `--wt-border`, and Wikitruth blue variables;
  restrained green/amber/slate semantics; no gradients or glow.
- Typography: existing application sans-serif stack; 38-42 px desktop title,
  30-32 px mobile title, 18-20 px section headings, 14-16 px rows, disciplined
  line heights and no browser-default control sizing.
- Container model: one bordered summary band, two desktop panels, one open
  governance list, one privacy band, and a final methodology band. Mobile uses
  the same component families in one column with a compact two-by-two summary.
- Icons: existing Font Awesome metaphors with consistent 16-22 px optical size;
  book, check, clock, archive, link, refresh, shield, balance, file, comments,
  pencil, lock, and info.
- Interaction: definition disclosures use native disclosure controls with
  visible focus; policies use a link; all touch targets are at least 44 px.
- Above-the-fold copy is locked to the title, introductory sentence, freshness,
  four summary labels, and the two first section names documented above.
- The generated placeholder bars communicate layout only. Production widths and
  values must be calculated from persisted public data and never fabricated.

## Structured-Debate Pilot Contract

- [x] Update canonical cards 92 and 95 only after explicit owner approval to
      reactivate the pilot; broad enforcement remains deferred.
- [ ] Require an explicit participant opt-in and stance selection.
- [ ] Keep ordinary replies and free-form discussion available and unchanged.
- [ ] Limit pilot membership, phases, and contribution cadence through an
      explicit versioned format.
- [ ] Separate participant argument from reviewer summary and verdict status.
- [ ] Preserve a public audit trail of phase transitions and contributions while
      keeping private identity/security data out of public responses.
- [ ] Allow an authorized facilitator to pause, close, or cancel a pilot without
      deleting its history.

## Implementation Checklist

### 1. Audit and Design

- [x] Confirm active branch, upstream, clean worktree, current runtime path, and
      exact public remote.
- [x] Inspect current verdict, evidence, appeal, revision, translation, civic,
      and discussion contracts.
- [x] Generate and inspect a complete desktop and mobile dashboard concept in
      the existing Wikitruth visual language.
- [x] Extract layout, typography, color, spacing, control, and responsive tokens
      before coding.

### 2. Public Transparency and Trust Dashboard

- [x] Add a public aggregate service and bounded API response.
- [x] Add server tests for privacy exclusions, cohort suppression, tenant
      scoping, lifecycle definitions, and failure behavior.
- [x] Add a public route and responsive light/dark dashboard UI.
- [x] Add accessible explanations for methodology, freshness, and suppressed
      data.
- [x] Add client route, API, accessibility, loading, empty, and error tests.

### 3. Opt-in Structured-Debate Pilot

- [ ] Add durable pilot, participant, phase, contribution, and transition data
      contracts after canonical approval.
- [ ] Add public-read and governed-write APIs with role, consent, validation,
      cadence, evidence, and audit guardrails.
- [ ] Add an entry-linked pilot surface and a dedicated responsive debate page.
- [ ] Prove that normal discussion and verdict paths remain unchanged.
- [ ] Add server/client tests for opt-in, authorization, phase gates, withdrawal,
      public projection, and closed/cancelled behavior.

### 4. Real-world Flagship Content Operations

- [x] Select one bounded Wikitruth topic and one bounded FixPH issue cluster.
- [x] Use primary/public sources, record claim-level citations, material dissent,
      unresolved issues, reviewer calibration, appeal/revision history, and
      multilingual variants. Real dissent, appeal outcomes, and reviewer
      activity remain intentionally unseeded until governed participants act.
- [x] Prepare an idempotent dry-run-first publication bundle or governed import.
- [x] Publish only after backup and release gates; never fabricate public counts,
      verdicts, reviewers, or consensus.
- [x] Record the exact published URLs and post-publication checks.

### 5. Validation and Publication

- [x] Run focused server/client tests and lint for every changed path.
- [x] Run type checks, complete server/client suites, builds, runtime preflight,
      OpenAPI coverage, security audit, and `git diff --check`. The React Router
      advisory is absent; the audit still reports the separately tracked legacy
      rendering dependency chain, whose safe fix is a breaking modernization.
- [x] Verify the dashboard at desktop and 390 px mobile in Browser, including
      light/dark themes, disclosures, and horizontal-overflow checks. Pilot
      verification remains pending implementation.
- [x] Compare the rendered dashboard against the accepted concept with a written
      fidelity ledger and `view_image` inspection.
- [x] Inspect staged/publication paths for secrets, personal data, host details,
      dumps, generated QA artifacts, and populated inventory.
- [x] Create focused semantic commits and push the final SHA to
      `origin/develop`; verify remote SHA and worktree state.

### 6. V2 Production Release

- [x] Resolve the populated private operator inventory without printing or
      committing its sensitive values.
- [x] Record V2 previous SHA, service health, co-tenant health, capacity, and
      rollback path.
- [x] Create and verify the required restricted pre-change backup.
- [x] Materialize and build exactly the pushed release SHA as an immutable
      release.
- [x] Activate only the inventoried V2 service; do not change DNS, V1, or the
      official domain.
- [x] Verify build identity, service stability, HTTPS, homepage, deep links,
      dashboard, authentication configuration/UI, privacy and permission
      boundaries, static assets, co-tenant health, and database invariants.
- [ ] Verify the structured-debate surface after canonical approval and
      implementation; complete real-inbox email delivery and physical-device
      passkey ceremonies when the required operator accounts/devices are
      available.
- [x] Record deployed and live-verified states separately, including any gates
      that require a physical device or real inbox.

## Completion Rule

This plan moves to `docs/plans/completed/` only after a separate verification
pass confirms that all non-deferred items are complete. If production inventory,
credentials, real-inbox access, or physical-device passkey acceptance blocks a
gate, keep the plan active and report the exact unverified boundary.

## Dashboard Fidelity Ledger (2026-08-05)

- Information hierarchy: matched. The rendered page preserves the concept's
  title, public-summary band, paired quality/lifecycle panels, governance rows,
  privacy disclosure, methodology actions, and standard footer.
- Responsive structure: matched. Desktop uses the paired-panel layout and the
  390 px viewport uses a two-by-two summary plus a single-column reading order;
  measured body width and viewport width were both 390 px with no overflow.
- Visual language: matched with an intentional simplification. Existing
  Wikitruth theme variables, Font Awesome assets, and square restrained panels
  replace the concept's illustrative glows and custom icon treatments so the
  page remains native to the application and light mode works consistently.
- Data fidelity: improved over the concept. All placeholder values and bars were
  replaced by live public aggregates; unavailable or small-cohort values render
  as a dash with a plain-language explanation rather than a fabricated number.
- Interaction: matched and hardened. Governance and privacy use native
  disclosures, while methodology expands inline at mobile width so it cannot
  obscure the privacy section; desktop retains a compact anchored disclosure.
- Above-the-fold copy diff: no substantive divergence. The title and opening
  sentence are exact. The concept's generic `Updated daily` is rendered as the
  daily-rounded date (for example `Updated Aug 5, 2026`), and summary labels are
  unchanged. The first two section names remain `Knowledge quality` and
  `Lifecycle at a glance`.
- Inspection evidence: generated desktop/mobile concepts and rendered
  desktop/mobile captures were each inspected at original detail with
  `view_image`; Browser also verified the disclosure contents, theme switch,
  standard shell, and absence of horizontal overflow.

## Release and Flagship Publication Record (2026-08-05)

- Tested, pushed, deployed, and loaded release:
  `83db5d487182d21173b8b51c30ea88d3efaa372d`.
- V2 code activation passed loopback candidate smoke, atomic activation,
  loaded-working-directory identity, zero-restart/fatal-log checks, public TLS,
  static-asset digest parity, and shared-host health checks. V1 and DNS were not
  changed and the official legacy endpoint remained available.
- The restricted pre-change MongoDB archive passed checksum, mode/ownership,
  and `mongorestore --dryRun` verification. Its private location and digest are
  recorded only in the operator inventory.
- The publication dry run planned 15 inserts with zero verdicts and zero
  reviewer votes. Apply created 15 pending entries, 15 immutable revisions, 15
  submission events, 3 pending Filipino translations, 4 knowledge evidence or
  qualification links, and 3 FixPH evidence links. The post-apply dry run was
  `0 insert / 15 unchanged` and reviewer-vote count remained zero.
- Wikitruth topic:
  `https://v2.wikitruth.net/topics/entry/global-mean-sea-level-rise/6306a192ee817788564bf031`.
- FixPH cluster anchor:
  `https://v2.wikitruth.net/civic/records/c363fe6db6ecbcdad10a3d5d`.
- FixPH project:
  `https://v2.wikitruth.net/civic/records/f2da598e9a2ca55b02f967e0`.
- Public dashboard:
  `https://v2.wikitruth.net/transparency`; after cache refresh it reported
  1,126 public records, 1,111 accepted, 15 under review, and 0 archived.
- Live Browser acceptance covered desktop and 390 px mobile dashboard layout,
  dark mode, privacy disclosure, topic and FixPH rendering, and login/register
  surfaces. No horizontal overflow or application alert was observed.
