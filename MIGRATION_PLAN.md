# Frontend Migration Plan: Legacy Templates to Modern React

## Executive Summary

This document provides a comprehensive migration plan for transitioning the Wikitruth application from legacy template engines (Dust.js, Jade/Pug) to a modern React-based frontend architecture.

### Current State Analysis

**Legacy Templates:**
- **Dust.js Templates**: 122 files in `public/templates/dust/`
- **Jade Templates**: 41 files in `public/templates/jade/`
- **Existing React**: 2 components in `public/templates/react/`
- **Total Templates**: 163 files requiring migration

**Technology Stack:**
- Backend: Node.js/Express with Kraken.js framework
- Current Templating: Dust.js (primary), Jade/Pug (authentication/admin)
- Build System: Grunt, Webpack (configured but not fully utilized)
- Dependencies: React 18.2.0, TypeScript 5.8.3 already installed

**Template Categories:**

1. **Core Application (Dust.js)**
   - Wiki System (Topics, Arguments, Questions, Answers, Issues, Opinions, Artifacts)
   - Groups & Members
   - Search & Explore
   - Layouts & Common Components

2. **Authentication & Admin (Jade)**
   - Login/Signup/Password Reset
   - Account Management
   - Admin Panel (Users, Accounts, Categories, etc.)

## Migration Strategy

### Phase-Based Approach

We recommend a **gradual, incremental migration** with the following phases:

#### Phase 0: Foundation Setup (Week 1)
- Set up modern React infrastructure
- Configure build pipeline
- Establish development workflow
- Create base components and utilities

#### Phase 1: Component Library & Design System (Week 2-3)
Build reusable UI components that mirror existing functionality:
- Layout components (Header, Footer, Sidebar)
- Common UI elements (Buttons, Forms, Cards, Lists)
- Navigation components
- Modal/Popover components

#### Phase 2: Authentication & Admin (Week 4-5)
Migrate Jade templates (lower complexity, critical functionality):
- Login/Signup flows
- Password reset
- Account settings
- Admin panel pages

#### Phase 3: Wiki Core Features (Week 6-10)
Migrate Dust.js templates in priority order:
1. Common/Shared components
2. Entry display components (Topics, Arguments, Questions, etc.)
3. Index/List views
4. Create/Edit forms
5. Advanced features (Screening, Verdict, Visualize)

#### Phase 4: Groups & Members (Week 11-12)
Migrate community features:
- Groups management
- Member profiles
- Contributions tracking

#### Phase 5: Polish & Optimization (Week 13-14)
- Performance optimization
- SEO improvements
- Accessibility enhancements
- Clean up legacy code

#### Phase 6: Production Deployment (Week 15-16)
- Testing in staging
- Gradual rollout
- Monitoring and bug fixes
- Remove legacy code

---

## Detailed Migration Checklist

### 🏗️ Foundation Setup

#### Infrastructure
- [ ] Create `client/` directory structure
- [ ] Set up TypeScript configuration for client
- [x] Configure ESLint/Prettier for React
- [ ] Set up Hot Module Replacement (HMR) for development
- [ ] Configure CSS/SCSS/CSS Modules solution
- [ ] Set up React Router for client-side routing
- [ ] Configure state management (Context API or Redux)
- [ ] Set up API client layer (Axios or Fetch wrapper)

#### Build Configuration
- [ ] Update webpack config for proper entry points
- [ ] Configure development and production builds
- [ ] Set up code splitting and lazy loading
- [ ] Configure asset handling (images, fonts)
- [ ] Set up source maps for debugging
- [ ] Configure build optimization (minification, tree-shaking)
- [ ] Set up bundle analysis tools

#### Development Environment
- [ ] Create development server setup
- [ ] Configure proxy for API calls to backend
- [ ] Set up environment variables management
- [x] Create npm scripts for common tasks
- [x] Add `npm run dev:server`, `npm run dev:client`, and `npm run dev:all`
- [x] Add `npm run test:client`, `npm run test:client:watch`, and `npm run test:coverage`
- [x] Add dedicated client Jest config (`jest.config.client.js`)
- [x] Add at least one client smoke test (`client/src/**/*.test.ts(x)`)
- [ ] Update .gitignore for client build artifacts
- [ ] Set up testing infrastructure (Jest, React Testing Library)
- [ ] Configure Storybook for component development (optional)

#### Phase 0 Exit Criteria
- [x] `npm run build:client` completes successfully
- [x] `npm run test:client` completes successfully
- [x] `/app` and `/app/*` render `public/react-app.html`
- [x] Legacy routes still render Dust/Jade templates as expected
- [x] Migration docs are updated to match scripts and file paths

### 📚 Component Library

#### Layout Components
- [ ] `Layout/MainLayout.tsx` - Main application layout
- [ ] `Layout/Header.tsx` - Site header with navigation
- [ ] `Layout/Footer.tsx` - Site footer
- [ ] `Layout/Sidebar.tsx` - Navigation sidebar
- [ ] `Layout/Breadcrumbs.tsx` - Breadcrumb navigation

#### Common UI Components
- [ ] `Button.tsx` - Reusable button component
- [ ] `Input.tsx` - Form input component
- [ ] `Select.tsx` - Dropdown select component
- [ ] `Checkbox.tsx` - Checkbox component
- [ ] `Radio.tsx` - Radio button component
- [ ] `TextArea.tsx` - Text area component
- [ ] `Form.tsx` - Form wrapper with validation
- [ ] `Card.tsx` - Content card component
- [ ] `List.tsx` - List component
- [ ] `Table.tsx` - Data table component
- [ ] `Tabs.tsx` - Tab navigation
- [ ] `Modal.tsx` - Modal dialog
- [ ] `Popover.tsx` - Popover component
- [ ] `Alert.tsx` - Alert/notification component
- [ ] `Badge.tsx` - Badge/label component
- [ ] `Spinner.tsx` - Loading spinner
- [ ] `Icon.tsx` - Icon wrapper component
- [ ] `Pagination.tsx` - Pagination component

#### Navigation Components
- [ ] `NavBar.tsx` - Main navigation bar
- [ ] `NavItem.tsx` - Navigation item
- [ ] `DropdownMenu.tsx` - Dropdown menu
- [ ] `BreadcrumbNav.tsx` - Breadcrumb navigation

### 🔐 Authentication & Admin Pages

#### Authentication (Jade → React)
- [ ] `pages/Login/LoginPage.tsx` - Login page
- [ ] `pages/Signup/SignupPage.tsx` - Registration page
- [ ] `pages/ForgotPassword/ForgotPasswordPage.tsx` - Password reset request
- [ ] `pages/ResetPassword/ResetPasswordPage.tsx` - Password reset form
- [ ] `pages/Logout/LogoutPage.tsx` - Logout handler
- [ ] `components/SocialLogin.tsx` - Social login buttons

#### Account Management
- [ ] `pages/Account/AccountPage.tsx` - Account overview
- [ ] `pages/Account/SettingsPage.tsx` - Account settings
- [ ] `pages/Account/VerificationPage.tsx` - Email verification

#### Admin Panel
- [ ] `pages/Admin/AdminDashboard.tsx` - Admin home
- [ ] `pages/Admin/Users/UsersList.tsx` - Users management
- [ ] `pages/Admin/Users/UserDetails.tsx` - User details
- [ ] `pages/Admin/Accounts/AccountsList.tsx` - Accounts management
- [ ] `pages/Admin/Accounts/AccountDetails.tsx` - Account details
- [ ] `pages/Admin/Administrators/AdminList.tsx` - Admins list
- [ ] `pages/Admin/Administrators/AdminDetails.tsx` - Admin details
- [ ] `pages/Admin/AdminGroups/GroupsList.tsx` - Admin groups list
- [ ] `pages/Admin/AdminGroups/GroupDetails.tsx` - Admin group details
- [ ] `pages/Admin/Categories/CategoriesList.tsx` - Categories management
- [ ] `pages/Admin/Categories/CategoryDetails.tsx` - Category details
- [ ] `pages/Admin/Statuses/StatusesList.tsx` - Statuses management
- [ ] `pages/Admin/Statuses/StatusDetails.tsx` - Status details

### 📖 Wiki System - Common Components

#### Entry Components (Shared across all entity types)
- [ ] `components/Entry/EntryHeader.tsx` - Entry header
- [ ] `components/Entry/EntryBody.tsx` - Entry content
- [ ] `components/Entry/EntryFooter.tsx` - Entry footer
- [ ] `components/Entry/EntryRow.tsx` - Entry list item
- [ ] `components/Entry/EntryOutline.tsx` - Entry outline
- [ ] `components/Entry/EntryOptions.tsx` - Entry options menu
- [ ] `components/Entry/EntryOptionsPopover.tsx` - Options popover (already exists, needs integration)
- [ ] `components/Entry/NewOptionsPopover.tsx` - New entry options
- [ ] `components/Entry/EntrySet.tsx` - Set of entries
- [ ] `components/Entry/EntryVerdictLabel.tsx` - Verdict label
- [ ] `components/Entry/EntryVerdictList.tsx` - Verdict list
- [ ] `components/Entry/EntryScreeningLabel.tsx` - Screening status label
- [ ] `components/Entry/ScreeningSelector.tsx` - Screening status selector

#### Common Wiki Components
- [ ] `components/Wiki/IndexHeader.tsx` - Index page header
- [ ] `components/Wiki/PageHeader.tsx` - Page header
- [ ] `components/Wiki/PageTabs.tsx` - Page tabs navigation
- [ ] `components/Wiki/Pager.tsx` - Pagination component
- [ ] `components/Wiki/SubtitleCreate.tsx` - Create subtitle
- [ ] `components/Wiki/SubtitleEdit.tsx` - Edit subtitle

### 📖 Wiki System - Topics

#### Topic Pages
- [ ] `pages/Wiki/Topics/TopicsIndex.tsx` - Topics listing
- [ ] `pages/Wiki/Topics/TopicEntry.tsx` - Topic detail view
- [ ] `pages/Wiki/Topics/TopicCreate.tsx` - Create topic form
- [ ] `pages/Wiki/Topics/TopicTiles.tsx` - Topic tiles view

#### Topic Components
- [ ] `components/Topics/TopicRow.tsx` - Topic list row
- [ ] `components/Topics/TopicLink/TopicLinkEntry.tsx` - Topic link entry
- [ ] `components/Topics/TopicLink/TopicLinkEdit.tsx` - Edit topic link

### 📖 Wiki System - Arguments

#### Argument Pages
- [ ] `pages/Wiki/Arguments/ArgumentsIndex.tsx` - Arguments listing
- [ ] `pages/Wiki/Arguments/ArgumentEntry.tsx` - Argument detail view
- [ ] `pages/Wiki/Arguments/ArgumentCreate.tsx` - Create argument form
- [ ] `pages/Wiki/Arguments/ArgumentListPreview.tsx` - Arguments preview list

#### Argument Components
- [ ] `components/Arguments/ArgumentRow.tsx` - Argument list row
- [ ] `components/Arguments/ArgumentLink/ArgumentLinkEntry.tsx` - Argument link entry
- [ ] `components/Arguments/ArgumentLink/ArgumentLinkEdit.tsx` - Edit argument link

### 📖 Wiki System - Questions

#### Question Pages
- [ ] `pages/Wiki/Questions/QuestionsIndex.tsx` - Questions listing
- [ ] `pages/Wiki/Questions/QuestionEntry.tsx` - Question detail view
- [ ] `pages/Wiki/Questions/QuestionCreate.tsx` - Create question form
- [ ] `pages/Wiki/Questions/QuestionListPreview.tsx` - Questions preview list

#### Question Components
- [ ] `components/Questions/QuestionRow.tsx` - Question list row

### 📖 Wiki System - Answers

#### Answer Pages
- [ ] `pages/Wiki/Answers/AnswersIndex.tsx` - Answers listing
- [ ] `pages/Wiki/Answers/AnswerEntry.tsx` - Answer detail view
- [ ] `pages/Wiki/Answers/AnswerCreate.tsx` - Create answer form
- [ ] `pages/Wiki/Answers/AnswerListPreview.tsx` - Answers preview list

#### Answer Components
- [ ] `components/Answers/AnswerRow.tsx` - Answer list row

### 📖 Wiki System - Issues

#### Issue Pages
- [ ] `pages/Wiki/Issues/IssuesIndex.tsx` - Issues listing
- [ ] `pages/Wiki/Issues/IssueEntry.tsx` - Issue detail view
- [ ] `pages/Wiki/Issues/IssueCreate.tsx` - Create issue form
- [ ] `pages/Wiki/Issues/IssueListPreview.tsx` - Issues preview list

#### Issue Components
- [ ] `components/Issues/IssueRow.tsx` - Issue list row

### 📖 Wiki System - Opinions

#### Opinion Pages
- [ ] `pages/Wiki/Opinions/OpinionsIndex.tsx` - Opinions listing
- [ ] `pages/Wiki/Opinions/OpinionEntry.tsx` - Opinion detail view
- [ ] `pages/Wiki/Opinions/OpinionCreate.tsx` - Create opinion form
- [ ] `pages/Wiki/Opinions/OpinionListPreview.tsx` - Opinions preview list

#### Opinion Components
- [ ] `components/Opinions/OpinionRow.tsx` - Opinion list row

### 📖 Wiki System - Artifacts

#### Artifact Pages
- [ ] `pages/Wiki/Artifacts/ArtifactsIndex.tsx` - Artifacts listing
- [ ] `pages/Wiki/Artifacts/ArtifactEntry.tsx` - Artifact detail view
- [ ] `pages/Wiki/Artifacts/ArtifactCreate.tsx` - Create artifact form
- [ ] `pages/Wiki/Artifacts/ArtifactListPreview.tsx` - Artifacts preview list

#### Artifact Components
- [ ] `components/Artifacts/ArtifactRow.tsx` - Artifact list row

### 📖 Wiki System - Advanced Features

#### Specialized Pages
- [ ] `pages/Wiki/Screening/ScreeningPage.tsx` - Screening management
- [ ] `pages/Wiki/Verdict/VerdictUpdate.tsx` - Update verdict
- [ ] `pages/Wiki/Visualize/VisualizePage.tsx` - Visualization view
- [ ] `pages/Wiki/Related/RelatedPage.tsx` - Related content
- [ ] `pages/Wiki/Convert/ConvertPage.tsx` - Convert entries
- [ ] `pages/Wiki/Explore/ExplorePage.tsx` - Explore page
- [ ] `pages/Wiki/Outline/OutlineLinkTo.tsx` - Outline link creation

### 👥 Groups & Members

#### Groups Pages
- [ ] `pages/Groups/GroupsIndex.tsx` - Groups listing
- [ ] `pages/Groups/GroupCreate.tsx` - Create group form
- [ ] `pages/Groups/Group/GroupPage.tsx` - Group detail view
- [ ] `pages/Groups/Group/GroupPosts.tsx` - Group posts
- [ ] `pages/Groups/Group/GroupMembers.tsx` - Group members

#### Groups Components
- [ ] `components/Groups/GroupHeader.tsx` - Group header
- [ ] `components/Groups/GroupItem.tsx` - Group list item
- [ ] `components/Groups/GroupsHeader.tsx` - Groups page header

#### Members Pages
- [ ] `pages/Members/ContributorsPage.tsx` - Contributors listing
- [ ] `pages/Members/ScreenersPage.tsx` - Screeners listing
- [ ] `pages/Members/ReviewersPage.tsx` - Reviewers listing
- [ ] `pages/Members/AdministratorsPage.tsx` - Administrators listing

#### Member Profile Pages
- [ ] `pages/Members/Profile/ProfilePage.tsx` - Member profile
- [ ] `pages/Members/Profile/ProfileSettings.tsx` - Profile settings
- [ ] `pages/Members/Profile/ProfileTopics.tsx` - Member's topics
- [ ] `pages/Members/Profile/ProfileContributions.tsx` - Member's contributions
- [ ] `pages/Members/Profile/ProfileFollowing.tsx` - Following list
- [ ] `pages/Members/Profile/Pages/PagesIndex.tsx` - Member pages list
- [ ] `pages/Members/Profile/Pages/PageView.tsx` - View member page
- [ ] `pages/Members/Profile/Pages/PageCreate.tsx` - Create member page

#### Members Components
- [ ] `components/Members/ProfileHeader.tsx` - Profile header
- [ ] `components/Members/MemberItem.tsx` - Member list item
- [ ] `components/Members/MembersHeader.tsx` - Members page header

### 🔍 Search & Other Pages

#### Search & Navigation
- [ ] `pages/Search/SearchPage.tsx` - Search results page
- [ ] `pages/Home/HomePage.tsx` - Home/landing page
- [ ] `pages/About/AboutPage.tsx` - About page
- [ ] `pages/HelpUs/HelpUsPage.tsx` - Help/support page
- [ ] `pages/Contact/ContactPage.tsx` - Contact page

#### Utility Pages
- [ ] `pages/Install/InstallPage.tsx` - Installation wizard
- [ ] `pages/Admin/DBBackup/DBBackupPage.tsx` - Database backup
- [ ] `pages/FastSwitch/FastSwitchPage.tsx` - Fast switch utility

#### Error Pages
- [ ] `pages/Errors/NotFound404.tsx` - 404 error page
- [ ] `pages/Errors/ServerError500.tsx` - 500 error page
- [ ] `pages/Errors/ServiceUnavailable503.tsx` - 503 error page

### 🛠️ Utilities & Services

#### API Layer
- [ ] `services/api/client.ts` - API client configuration
- [ ] `services/api/topics.ts` - Topics API
- [ ] `services/api/arguments.ts` - Arguments API
- [ ] `services/api/questions.ts` - Questions API
- [ ] `services/api/answers.ts` - Answers API
- [ ] `services/api/issues.ts` - Issues API
- [ ] `services/api/opinions.ts` - Opinions API
- [ ] `services/api/artifacts.ts` - Artifacts API
- [ ] `services/api/groups.ts` - Groups API
- [ ] `services/api/members.ts` - Members API
- [ ] `services/api/auth.ts` - Authentication API
- [ ] `services/api/admin.ts` - Admin API

#### State Management
- [ ] `context/AuthContext.tsx` - Authentication state
- [ ] `context/UserContext.tsx` - User data context
- [ ] `context/ThemeContext.tsx` - Theme/UI context
- [ ] `hooks/useAuth.ts` - Authentication hook
- [ ] `hooks/useApi.ts` - API data fetching hook
- [ ] `hooks/useForm.ts` - Form handling hook
- [ ] `hooks/usePagination.ts` - Pagination hook

#### Utilities
- [ ] `utils/constants.ts` - Application constants
- [ ] `utils/paths.ts` - Route paths
- [ ] `utils/helpers.ts` - Helper functions
- [ ] `utils/validation.ts` - Form validation
- [ ] `utils/formatting.ts` - Data formatting

#### Types
- [ ] `types/models.ts` - Data model types
- [ ] `types/api.ts` - API response types
- [ ] `types/common.ts` - Common types

### 🎨 Styling

#### CSS/SCSS Setup
- [ ] Choose CSS solution (CSS Modules, Styled Components, or Tailwind CSS)
- [ ] Migrate Bootstrap dependencies or choose alternative
- [ ] Create global styles
- [ ] Create theme variables
- [ ] Set up responsive breakpoints

### 🔄 Backend Integration

#### Server-Side Rendering (SSR) Consideration
- [ ] Evaluate if SSR is needed
- [ ] If yes, set up Next.js or custom SSR solution
- [ ] Configure hydration strategy
- [ ] Set up SEO metadata handling

#### API Endpoints
- [ ] Create RESTful API endpoints for React consumption
- [ ] Update existing controllers to support JSON responses
- [ ] Implement proper error handling
- [ ] Add API versioning if needed
- [ ] Update authentication/authorization for API calls

#### Routing Strategy
- [ ] Decide on routing approach (SPA vs. Hybrid)
- [ ] Configure client-side routing (React Router)
- [ ] Update server routes to serve React app
- [ ] Handle deep linking and browser history
- [ ] Configure catch-all route for SPA
- [ ] Validate `/app` and nested React routes in browser refresh scenarios
- [ ] Add regression checks to ensure non-`/app` legacy routes are unaffected

### ✅ Testing

#### Unit Tests
- [ ] Set up Jest and React Testing Library
- [ ] Write tests for common components
- [ ] Write tests for page components
- [ ] Write tests for utilities and hooks
- [ ] Achieve >80% code coverage

#### Integration Tests
- [ ] Test API integration
- [ ] Test authentication flow
- [ ] Test critical user journeys

#### E2E Tests
- [ ] Set up Playwright or Cypress
- [ ] Create E2E tests for critical paths
- [ ] Test across different browsers

### 📊 Progress Governance
- [ ] Update checklist status at every migration PR merge
- [ ] Keep all migration docs `Last Updated` dates current
- [ ] Run weekly doc-to-repo drift review (scripts, paths, and route assumptions)

### 📦 Deployment & DevOps

#### Build & Deploy
- [ ] Update CI/CD pipeline for React build
- [ ] Configure production webpack settings
- [ ] Set up CDN for static assets
- [ ] Configure caching strategies
- [ ] Set up monitoring and error tracking

#### Performance
- [ ] Implement code splitting
- [ ] Optimize bundle size
- [ ] Implement lazy loading for routes
- [ ] Add performance monitoring
- [ ] Optimize images and assets

### 🧹 Cleanup

#### Legacy Code Removal
- [ ] Remove unused Dust.js templates
- [ ] Remove unused Jade templates
- [ ] Remove Dust.js dependencies
- [ ] Remove Jade/Pug dependencies
- [ ] Clean up unused Grunt tasks
- [ ] Update documentation
- [ ] Remove legacy build artifacts

---

## Technical Architecture

### Directory Structure

```
wikitruth/
├── client/                          # New React application
│   ├── index.tsx                    # React entry point
│   ├── tsconfig.json                # Client TypeScript config
│   ├── src/
│   │   ├── components/              # Reusable components
│   │   │   ├── common/              # Common UI components
│   │   │   ├── Layout/              # Layout components
│   │   │   ├── Form/                # Form components
│   │   │   └── EntryRow/            # Entry row components
│   │   ├── pages/                   # Page components
│   │   │   └── *.tsx                # Current page routes
│   │   ├── services/                # API services
│   │   ├── context/                 # React Context providers
│   │   ├── hooks/                   # Custom hooks
│   │   ├── types/                   # TypeScript types
│   │   ├── styles/                  # Global styles
│   │   ├── App.tsx                  # Root component
│   │   └── ...
├── public/
│   ├── react-app.html               # HTML shell for /app
│   └── templates/                   # Legacy templates (to be removed after migration)
├── controllers/                     # Express controllers
├── models/                          # Database models
├── webpack.config.js                # Webpack configuration
└── package.json                     # Root package.json
```

### Technology Decisions

#### State Management
**Recommendation**: Start with React Context API
- Simpler setup for initial migration
- Sufficient for current app complexity
- Can migrate to Redux later if needed

#### Styling
**Options**:
1. **CSS Modules** (Recommended for migration)
   - Easy migration from existing CSS
   - No additional dependencies
   - Good TypeScript support

2. **Tailwind CSS** (Alternative)
   - Faster development
   - Consistent design system
   - Requires style rewrite

3. **Styled Components** (Alternative)
   - Component-scoped styles
   - Dynamic styling
   - Additional dependency

#### Routing
**Recommendation**: React Router v6
- De facto standard for React apps
- Supports both hash and browser history
- Good TypeScript support

#### Form Handling
**Recommendation**: React Hook Form
- Minimal re-renders
- Simple validation
- Good TypeScript support

### Migration Patterns

#### 1. Component Extraction Pattern
For each Dust template:
1. Identify data dependencies
2. Extract to React component
3. Convert template logic to JSX
4. Implement props interface
5. Add TypeScript types

**Example**:
```typescript
// Before (Dust.js)
{#topics}
  <div class="topic">
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
{/topics}

// After (React + TypeScript)
interface Topic {
  title: string;
  description: string;
}

interface TopicListProps {
  topics: Topic[];
}

const TopicList: React.FC<TopicListProps> = ({ topics }) => (
  <>
    {topics.map((topic, index) => (
      <div key={index} className="topic">
        <h3>{topic.title}</h3>
        <p>{topic.description}</p>
      </div>
    ))}
  </>
);
```

#### 2. Dual Rendering Pattern
During migration, support both old and new rendering:
1. Add route flag for React vs. legacy
2. Implement both renderers
3. Gradually migrate routes
4. Remove legacy code after verification

#### 3. API-First Pattern
Update backend to support JSON API:
```javascript
// Before
res.render('dust/wiki/topics/entry', model);

// After
if (req.accepts('json')) {
  res.json(model);
} else {
  res.render('dust/wiki/topics/entry', model);
}
```

---

## Risk Assessment & Mitigation

### High-Risk Areas

1. **Authentication Flow**
   - **Risk**: Breaking existing login/session management
   - **Mitigation**: Migrate auth last, extensive testing

2. **Admin Panel**
   - **Risk**: Data loss or corruption
   - **Mitigation**: Read-only mode first, thorough testing

3. **SEO Impact**
   - **Risk**: Loss of search rankings
   - **Mitigation**: Implement SSR or pre-rendering

4. **User Experience**
   - **Risk**: UI/UX regressions
   - **Mitigation**: Feature parity testing, user feedback

### Medium-Risk Areas

1. **Third-party Dependencies**
   - **Risk**: Bootstrap, jQuery compatibility issues
   - **Mitigation**: Gradual replacement, polyfills if needed

2. **Performance**
   - **Risk**: Slower initial page load
   - **Mitigation**: Code splitting, lazy loading

3. **Browser Compatibility**
   - **Risk**: Breaking older browsers
   - **Mitigation**: Polyfills, transpilation, browser testing

---

## Success Criteria

### Functional Requirements
- [ ] All existing features work in React
- [ ] No loss of functionality during migration
- [ ] All user workflows complete successfully
- [ ] Admin panel fully functional

### Performance Requirements
- [ ] Page load time < 3 seconds (current baseline)
- [ ] Time to Interactive < 5 seconds
- [ ] Bundle size < 1MB (gzipped)
- [ ] Lighthouse score > 90

### Quality Requirements
- [ ] Unit test coverage > 80%
- [ ] No critical accessibility violations
- [ ] No TypeScript errors
- [ ] No ESLint errors

### User Experience
- [ ] Feature parity with legacy UI
- [ ] Responsive design works on mobile/tablet
- [ ] No broken links or 404 errors
- [ ] Forms work correctly with validation

---

## Timeline Estimate

| Phase | Duration | Tasks | Dependencies |
|-------|----------|-------|--------------|
| Phase 0: Foundation | 1 week | Infrastructure setup | None |
| Phase 1: Component Library | 2 weeks | UI components | Phase 0 |
| Phase 2: Auth & Admin | 2 weeks | 41 Jade templates | Phase 1 |
| Phase 3: Wiki Core | 5 weeks | Core Dust templates | Phase 1 |
| Phase 4: Groups & Members | 2 weeks | Community features | Phase 3 |
| Phase 5: Polish | 2 weeks | Optimization | Phase 4 |
| Phase 6: Deploy | 2 weeks | Production rollout | Phase 5 |
| **Total** | **16 weeks** | **163 templates** | - |

**Note**: Timeline assumes 1 full-time developer. Can be accelerated with additional resources.

---

## Resources Required

### Development Team
- 1-2 Senior Frontend Developers (React/TypeScript)
- 1 Backend Developer (Node.js/Express)
- 1 QA Engineer
- 1 DevOps Engineer (part-time)

### Tools & Infrastructure
- Development/Staging environment
- CI/CD pipeline
- Monitoring tools (Sentry, LogRocket)
- Testing infrastructure

---

## Post-Migration Considerations

### Maintenance
- [ ] Update developer documentation
- [ ] Create component style guide
- [ ] Establish code review process
- [ ] Set up automated testing in CI/CD

### Future Enhancements
- [ ] Progressive Web App (PWA) features
- [ ] Real-time updates (WebSockets)
- [ ] Mobile app (React Native)
- [ ] Improved accessibility
- [ ] Dark mode theme

---

## Appendix

### Template Inventory

#### Dust.js Templates (122 files)
```
about/          (1)   - About pages
admin/          (1)   - Admin utilities
answers/        (1)   - Answers index
common/         (1)   - Common utilities
discuss/        (3)   - Discussion forums
errors/         (3)   - Error pages
groups/         (8)   - Groups system
members/        (15)  - Members & profiles
wiki/           (87)  - Wiki system (core)
install/        (1)   - Installation
layouts/        (3)   - Layouts
Other           (5)   - Misc pages
```

#### Jade Templates (41 files)
```
about/          (1)   - About page
account/        (6)   - Account management
admin/          (15)  - Admin panel
contact/        (3)   - Contact forms
http/           (2)   - Error pages
login/          (6)   - Authentication
signup/         (4)   - Registration
layouts/        (4)   - Layout templates
```

### Dependencies to Add
```json
{
  "dependencies": {
    "react-router-dom": "^6.x",
    "axios": "^1.x",
    "react-hook-form": "^7.x",
    "@tanstack/react-query": "^4.x"
  },
  "devDependencies": {
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x"
  }
}
```

### Dependencies to Remove (After Migration)
```json
{
  "dependencies": {
    "adaro": "^0.1.10",
    "consolidate": "^0.15.1",
    "dust-makara-helpers": "^4.2.0",
    "dustjs-helpers": "~1.3.0",
    "engine-munger": "^0.2.9",
    "jade": "^1.11.0",
    "localizr": "^1.1.0",
    "makara": "^2.1.0"
  },
  "devDependencies": {
    "grunt-dustjs": "^1.4.0",
    "grunt-localizr": "^0.2.4"
  }
}
```

---

## Conclusion

This migration plan provides a comprehensive roadmap for transitioning from legacy Dust.js/Jade templates to a modern React-based frontend. The phased approach minimizes risk while allowing for incremental progress and validation at each step.

**Key Success Factors:**
1. ✅ Start with solid foundation (infrastructure, tooling)
2. ✅ Build reusable component library first
3. ✅ Migrate in logical phases (auth → core → advanced)
4. ✅ Maintain feature parity throughout
5. ✅ Test thoroughly at each phase
6. ✅ Plan for gradual rollout to production

The estimated timeline of **16 weeks** provides a realistic schedule for a complete migration while maintaining quality and minimizing disruption to existing users.

---

*Document Version: 1.0*  
*Last Updated: 2026-02-21*  
*Author: Wikitruth Engineering Team*
