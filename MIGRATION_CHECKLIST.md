# Frontend Migration Checklist

Quick reference checklist for the Wikitruth frontend migration from Dust.js/Jade to React.

> **📖 Full Plan**: See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for comprehensive details.

---

## Quick Stats

- **Total Templates**: 163 files
  - Dust.js: 122 files
  - Jade: 41 files
- **Estimated Duration**: 16 weeks
- **Current Phase**: Phase 2 - Authentication & Admin (In Progress)

---

## Phase 0: Foundation Setup ⚙️
*Week 1 | Priority: CRITICAL*

### Infrastructure
- [x] Create `client/` directory structure
- [x] Create `client/src/` subdirectories (components, pages, services, etc.)
- [x] Set up `client/tsconfig.json` for React/TypeScript
- [x] Configure ESLint for React (`client/.eslintrc.json`)
- [x] Configure Prettier for consistent formatting
- [x] Use root `package.json` for React/client dependencies

### Build Configuration
- [x] Update `webpack.config.js` to point to actual client directory
- [x] Configure webpack dev server with HMR
- [x] Set up production webpack config
- [x] Configure CSS/SCSS loader
- [x] Set up file loader for assets (images, fonts)
- [x] Add source maps configuration

### Development Scripts
- [x] Add `npm run dev:client` script
- [x] Add `npm run build:client` script
- [x] Add `npm run test:client` script
- [x] Add `npm run test:client:watch` script
- [x] Add `npm run test:coverage` script
- [x] Update `.gitignore` for client build artifacts
- [x] Create development environment setup documentation

### Testing Setup
- [x] Install Jest
- [x] Install React Testing Library
- [x] Configure Jest for React (`jest.config.client.js`)
- [x] Create test utilities and helpers
- [x] Write sample test to verify setup

### Initial Files
- [x] Create `client/index.tsx` (entry point)
- [x] Create `client/src/App.tsx` (root component)
- [x] Create `public/react-app.html` (React app shell)
- [x] Set up basic routing structure

---

## Phase 1: Component Library 🎨
*Weeks 2-3 | Priority: HIGH*

### Layout Components (8 components)
- [x] `Layout/MainLayout.tsx`
- [x] `Layout/Header.tsx`
- [x] `Layout/Footer.tsx`
- [x] `Layout/Sidebar.tsx`
- [x] `Layout/Breadcrumbs.tsx`
- [x] `Layout/Container.tsx`
- [x] `Layout/Row.tsx`
- [x] `Layout/Column.tsx`

### Form Components (8 components)
- [x] `Form/Button.tsx`
- [x] `Form/Input.tsx`
- [x] `Form/TextArea.tsx`
- [x] `Form/Select.tsx`
- [x] `Form/Checkbox.tsx`
- [x] `Form/Radio.tsx`
- [x] `Form/FormGroup.tsx`
- [x] `Form/FormError.tsx`

### UI Components (12 components)
- [x] `UI/Card.tsx`
- [x] `UI/List.tsx`
- [x] `UI/ListItem.tsx`
- [x] `UI/Badge.tsx`
- [x] `UI/Alert.tsx`
- [x] `UI/Modal.tsx`
- [x] `UI/Popover.tsx`
- [x] `UI/Tabs.tsx`
- [x] `UI/Tab.tsx`
- [x] `UI/Spinner.tsx`
- [x] `UI/Icon.tsx`
- [x] `UI/Pagination.tsx`

### Navigation Components (4 components)
- [x] `Navigation/NavBar.tsx`
- [x] `Navigation/NavItem.tsx`
- [x] `Navigation/DropdownMenu.tsx`
- [x] `Navigation/BreadcrumbNav.tsx`

### Utilities
- [x] Set up React Router v6
- [x] Create routing configuration
- [x] Set up global styles
- [x] Configure theme/variables
- [x] Create utility functions
- [x] Set up constants file

---

## Phase 2: Authentication & Admin 🔐
*Weeks 4-5 | Priority: HIGH*

### Authentication Pages (6 pages)
- [x] `pages/Auth/LoginPage.tsx`
- [x] `pages/Auth/SignupPage.tsx`
- [x] `pages/Auth/ForgotPasswordPage.tsx`
- [x] `pages/Auth/ResetPasswordPage.tsx`
- [x] `pages/Auth/LogoutPage.tsx`
- [x] `components/Auth/SocialLoginButtons.tsx`

### Account Pages (3 pages)
- [x] `pages/Account/AccountPage.tsx`
- [x] `pages/Account/SettingsPage.tsx`
- [x] `pages/Account/VerificationPage.tsx`

### Admin Pages (13 pages)
- [x] `pages/Admin/AdminDashboard.tsx`
- [x] `pages/Admin/Users/UsersList.tsx`
- [x] `pages/Admin/Users/UserDetails.tsx`
- [x] `pages/Admin/Accounts/AccountsList.tsx`
- [x] `pages/Admin/Accounts/AccountDetails.tsx`
- [x] `pages/Admin/Administrators/AdminsList.tsx`
- [x] `pages/Admin/Administrators/AdminDetails.tsx`
- [x] `pages/Admin/AdminGroups/GroupsList.tsx`
- [x] `pages/Admin/AdminGroups/GroupDetails.tsx`
- [x] `pages/Admin/Categories/CategoriesList.tsx`
- [x] `pages/Admin/Categories/CategoryDetails.tsx`
- [x] `pages/Admin/Statuses/StatusesList.tsx`
- [x] `pages/Admin/Statuses/StatusDetails.tsx`

### Services
- [x] `services/api/auth.ts`
- [x] `services/api/admin.ts`
- [x] `context/AuthContext.tsx`
- [x] `hooks/useAuth.ts`

### Testing
- [x] Unit tests for auth components
- [x] Integration tests for login flow
- [x] Tests for admin pages

---

## Phase 3: Wiki Core Features 📖
*Weeks 6-10 | Priority: MEDIUM-HIGH*

### Common Entry Components (13 components)
- [x] `components/Entry/EntryHeader.tsx`
- [x] `components/Entry/EntryBody.tsx`
- [x] `components/Entry/EntryFooter.tsx`
- [x] `components/Entry/EntryRow.tsx`
- [x] `components/Entry/EntryOutline.tsx`
- [x] `components/Entry/EntryOptions.tsx`
- [x] `components/Entry/EntryOptionsPopover.tsx`
- [x] `components/Entry/NewOptionsPopover.tsx`
- [x] `components/Entry/EntrySet.tsx`
- [x] `components/Entry/EntryVerdictLabel.tsx`
- [x] `components/Entry/EntryVerdictList.tsx`
- [x] `components/Entry/EntryScreeningLabel.tsx`
- [x] `components/Entry/ScreeningSelector.tsx`

### Wiki Common Components (6 components)
- [x] `components/Wiki/IndexHeader.tsx`
- [x] `components/Wiki/PageHeader.tsx`
- [x] `components/Wiki/PageTabs.tsx`
- [x] `components/Wiki/Pager.tsx`
- [x] `components/Wiki/SubtitleCreate.tsx`
- [x] `components/Wiki/SubtitleEdit.tsx`

### Topics (6 pages + components)
- [x] `pages/Wiki/Topics/TopicsIndex.tsx`
- [x] `pages/Wiki/Topics/TopicEntry.tsx`
- [x] `pages/Wiki/Topics/TopicCreate.tsx`
- [x] `pages/Wiki/Topics/TopicTiles.tsx`
- [x] `components/Topics/TopicRow.tsx`
- [x] `components/Topics/TopicLink/*` (2 components)

### Arguments (5 pages + components)
- [x] `pages/Wiki/Arguments/ArgumentsIndex.tsx`
- [x] `pages/Wiki/Arguments/ArgumentEntry.tsx`
- [x] `pages/Wiki/Arguments/ArgumentCreate.tsx`
- [x] `pages/Wiki/Arguments/ArgumentListPreview.tsx`
- [x] `components/Arguments/ArgumentRow.tsx`
- [x] `components/Arguments/ArgumentLink/*` (2 components)

### Questions (5 pages + components)
- [x] `pages/Wiki/Questions/QuestionsIndex.tsx`
- [x] `pages/Wiki/Questions/QuestionEntry.tsx`
- [x] `pages/Wiki/Questions/QuestionCreate.tsx`
- [x] `pages/Wiki/Questions/QuestionListPreview.tsx`
- [x] `components/Questions/QuestionRow.tsx`

### Answers (5 pages + components)
- [x] `pages/Wiki/Answers/AnswersIndex.tsx`
- [x] `pages/Wiki/Answers/AnswerEntry.tsx`
- [x] `pages/Wiki/Answers/AnswerCreate.tsx`
- [x] `pages/Wiki/Answers/AnswerListPreview.tsx`
- [x] `components/Answers/AnswerRow.tsx`

### Issues (5 pages + components)
- [x] `pages/Wiki/Issues/IssuesIndex.tsx`
- [x] `pages/Wiki/Issues/IssueEntry.tsx`
- [x] `pages/Wiki/Issues/IssueCreate.tsx`
- [x] `pages/Wiki/Issues/IssueListPreview.tsx`
- [x] `components/Issues/IssueRow.tsx`

### Opinions (5 pages + components)
- [x] `pages/Wiki/Opinions/OpinionsIndex.tsx`
- [x] `pages/Wiki/Opinions/OpinionEntry.tsx`
- [x] `pages/Wiki/Opinions/OpinionCreate.tsx`
- [x] `pages/Wiki/Opinions/OpinionListPreview.tsx`
- [x] `components/Opinions/OpinionRow.tsx`

### Artifacts (5 pages + components)
- [x] `pages/Wiki/Artifacts/ArtifactsIndex.tsx`
- [x] `pages/Wiki/Artifacts/ArtifactEntry.tsx`
- [x] `pages/Wiki/Artifacts/ArtifactCreate.tsx`
- [x] `pages/Wiki/Artifacts/ArtifactListPreview.tsx`
- [x] `components/Artifacts/ArtifactRow.tsx`

### Advanced Wiki Features (7 pages)
- [x] `pages/Wiki/Screening/ScreeningPage.tsx`
- [x] `pages/Wiki/Verdict/VerdictUpdate.tsx`
- [x] `pages/Wiki/Visualize/VisualizePage.tsx`
- [x] `pages/Wiki/Related/RelatedPage.tsx`
- [x] `pages/Wiki/Convert/ConvertPage.tsx`
- [x] `pages/Wiki/Explore/ExplorePage.tsx`
- [x] `pages/Wiki/Outline/OutlineLinkTo.tsx`

### Services
- [x] `services/api/topics.ts`
- [x] `services/api/arguments.ts`
- [x] `services/api/questions.ts`
- [x] `services/api/answers.ts`
- [x] `services/api/issues.ts`
- [x] `services/api/opinions.ts`
- [x] `services/api/artifacts.ts`

---

## Phase 4: Groups & Members 👥
*Weeks 11-12 | Priority: MEDIUM*

### Groups Pages (8 pages + components)
- [ ] `pages/Groups/GroupsIndex.tsx`
- [ ] `pages/Groups/GroupCreate.tsx`
- [ ] `pages/Groups/Group/GroupPage.tsx`
- [ ] `pages/Groups/Group/GroupPosts.tsx`
- [ ] `pages/Groups/Group/GroupMembers.tsx`
- [ ] `components/Groups/GroupHeader.tsx`
- [ ] `components/Groups/GroupItem.tsx`
- [ ] `components/Groups/GroupsHeader.tsx`

### Members Pages (12 pages + components)
- [ ] `pages/Members/ContributorsPage.tsx`
- [ ] `pages/Members/ScreenersPage.tsx`
- [ ] `pages/Members/ReviewersPage.tsx`
- [ ] `pages/Members/AdministratorsPage.tsx`
- [ ] `pages/Members/Profile/ProfilePage.tsx`
- [ ] `pages/Members/Profile/ProfileSettings.tsx`
- [ ] `pages/Members/Profile/ProfileTopics.tsx`
- [ ] `pages/Members/Profile/ProfileContributions.tsx`
- [ ] `pages/Members/Profile/ProfileFollowing.tsx`
- [ ] `pages/Members/Profile/Pages/PagesIndex.tsx`
- [ ] `pages/Members/Profile/Pages/PageView.tsx`
- [ ] `pages/Members/Profile/Pages/PageCreate.tsx`
- [ ] `components/Members/ProfileHeader.tsx`
- [ ] `components/Members/MemberItem.tsx`
- [ ] `components/Members/MembersHeader.tsx`

### Services
- [ ] `services/api/groups.ts`
- [ ] `services/api/members.ts`

---

## Phase 5: Remaining Pages & Polish ✨
*Weeks 13-14 | Priority: MEDIUM*

### Other Pages (11 pages)
- [ ] `pages/Home/HomePage.tsx`
- [ ] `pages/Search/SearchPage.tsx`
- [ ] `pages/About/AboutPage.tsx`
- [ ] `pages/Contact/ContactPage.tsx`
- [ ] `pages/HelpUs/HelpUsPage.tsx`
- [ ] `pages/Install/InstallPage.tsx`
- [ ] `pages/Admin/DBBackup/DBBackupPage.tsx`
- [ ] `pages/FastSwitch/FastSwitchPage.tsx`
- [ ] `pages/Errors/NotFound404.tsx`
- [ ] `pages/Errors/ServerError500.tsx`
- [ ] `pages/Errors/ServiceUnavailable503.tsx`

### Optimization
- [ ] Implement code splitting
- [ ] Add lazy loading for routes
- [ ] Optimize bundle size
- [ ] Add performance monitoring
- [ ] Optimize images and assets
- [ ] Implement caching strategies

### Accessibility
- [ ] Run accessibility audit
- [ ] Fix WCAG violations
- [ ] Add ARIA labels
- [ ] Test with screen readers
- [ ] Add keyboard navigation

### SEO
- [ ] Add meta tags
- [ ] Implement structured data
- [ ] Add sitemap
- [ ] Configure robots.txt
- [ ] Test with SEO tools

---

## Phase 6: Testing & Deployment 🚀
*Weeks 15-16 | Priority: CRITICAL*

### Testing
- [ ] Achieve >80% unit test coverage
- [ ] Complete integration tests
- [ ] Run E2E tests with Playwright/Cypress
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing
- [ ] Performance testing
- [ ] Load testing
- [ ] Security audit

### Backend Integration
- [ ] Update controllers for JSON API
- [ ] Implement dual rendering (legacy + React)
- [ ] Update authentication for API
- [ ] Add API error handling
- [ ] Update session management
- [ ] Test all API endpoints

### Deployment
- [ ] Deploy to staging environment
- [ ] Smoke tests in staging
- [ ] Performance verification
- [ ] User acceptance testing
- [ ] Create rollback plan
- [ ] Deploy to production (gradual rollout)
- [ ] Monitor production metrics
- [ ] Gather user feedback

### Documentation
- [ ] Update developer documentation
- [ ] Create component style guide
- [ ] Document API endpoints
- [ ] Update deployment guide
- [ ] Create troubleshooting guide

---

## Cleanup Phase 🧹
*After successful deployment*

### Remove Legacy Code
- [ ] Remove `public/templates/dust/` directory
- [ ] Remove `public/templates/jade/` directory
- [ ] Remove Dust.js dependencies
- [ ] Remove Jade/Pug dependencies
- [ ] Remove related Grunt tasks
- [ ] Clean up old build scripts
- [ ] Remove legacy configuration files
- [ ] Archive legacy code (Git tag/branch)

### Final Documentation
- [ ] Update README.md
- [ ] Archive this migration plan
- [ ] Create post-mortem document
- [ ] Update architecture diagrams

---

## Quick Reference

### Current Template Count by Category

| Category | Dust.js | Jade | Total | Status |
|----------|---------|------|-------|--------|
| **Layouts** | 3 | 4 | 7 | ⬜ Not Started |
| **Auth** | 0 | 10 | 10 | ⬜ Not Started |
| **Admin** | 1 | 15 | 16 | ⬜ Not Started |
| **Wiki - Topics** | 8 | 0 | 8 | ⬜ Not Started |
| **Wiki - Arguments** | 8 | 0 | 8 | ⬜ Not Started |
| **Wiki - Questions** | 5 | 0 | 5 | ⬜ Not Started |
| **Wiki - Answers** | 5 | 0 | 5 | ⬜ Not Started |
| **Wiki - Issues** | 5 | 0 | 5 | ⬜ Not Started |
| **Wiki - Opinions** | 5 | 0 | 5 | ⬜ Not Started |
| **Wiki - Artifacts** | 5 | 0 | 5 | ⬜ Not Started |
| **Wiki - Common** | 30 | 0 | 30 | ⬜ Not Started |
| **Wiki - Other** | 8 | 0 | 8 | ⬜ Not Started |
| **Groups** | 8 | 0 | 8 | ⬜ Not Started |
| **Members** | 15 | 0 | 15 | ⬜ Not Started |
| **Other** | 16 | 12 | 28 | ⬜ Not Started |
| **TOTAL** | **122** | **41** | **163** | **0%** |

### Status Legend
- ⬜ Not Started
- 🟦 In Progress
- ✅ Completed
- ⚠️ Blocked
- 🔄 In Review

---

## Daily Workflow

1. **Pick a task** from current phase
2. **Create feature branch**: `git checkout -b feature/migrate-[component-name]`
3. **Develop & test** the component
4. **Update this checklist** with ✅
5. **Create PR** for review
6. **Merge** after approval
7. **Update progress** in tracking tool

---

## Helpful Commands

```bash
# Development
npm run dev:server          # Start backend in dev mode (nodemon + ts-node)
npm run dev:client          # Build client continuously in watch mode
npm run dev:all             # Run backend + client watch in parallel
npm start                   # Start legacy server runtime (grunt)

# Building
npm run build:client        # Build React for production
npm run build:server        # Build backend (TypeScript)
npm run build               # Build both

# Testing
npm run test                # Run existing Grunt test suite
npm run test:jest           # Run Jest test suite
npm run test:client         # Run client-focused Jest tests
npm run test:client:watch   # Run client tests in watch mode
npm run test:coverage       # Generate client coverage report

# Linting
npm run lint                # Run ESLint
npm run lint:fix            # Fix auto-fixable issues
npm run format              # Run Prettier
```

---

## Need Help?

- 📖 **Full Plan**: [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
- 📝 **Architecture**: See "Technical Architecture" in migration plan
- 🐛 **Issues**: Create GitHub issue with `migration` label
- 💬 **Questions**: Contact team lead or post in #migration channel

---

*Last Updated: 2026-02-22*  
*Checklist Version: 1.0*
