# Quick Start Guide: Frontend Migration

This guide will help you understand and begin the migration from legacy Dust.js/Jade templates to modern React.

## 📚 Documentation Overview

1. **MIGRATION_PLAN.md** - Comprehensive strategic plan with full details
2. **MIGRATION_CHECKLIST.md** - Actionable day-to-day checklist (this is your working document)
3. **README.md** - Project setup and runtime guide (kept in sync during migration)

## 🎯 What We're Doing

Migrating from:
- ❌ Dust.js (122 templates) + Jade (41 templates) = **163 templates**
- ❌ Server-side rendering
- ❌ Grunt build system (partial)
- ❌ Legacy JavaScript

To:
- ✅ React 18.2 with TypeScript
- ✅ Client-side SPA with React Router
- ✅ Webpack build system
- ✅ Modern JavaScript/TypeScript
- ✅ Component-based architecture

## 📊 Current Analysis

### Template Breakdown
```
public/templates/
├── dust/           122 files (primary application)
│   ├── wiki/        87 files (core features)
│   ├── members/     15 files (user profiles)
│   ├── groups/       8 files (community)
│   └── other        12 files (misc pages)
│
├── jade/            41 files (auth & admin)
│   ├── admin/       15 files (admin panel)
│   ├── login/       10 files (authentication)
│   └── other        16 files (account, contact, etc.)
│
└── react/            2 files (existing React components)
    ├── hello-world.js
    └── entry-options-popover.js
```

### Existing Setup
- ✅ React 18.2.0 installed
- ✅ TypeScript 5.8.3 installed
- ✅ `client/` directory exists with initial app/pages/components
- ✅ Webpack entry points to `./client/index.tsx`
- ✅ React app shell is served from `public/react-app.html`
- ✅ Dev/test convenience scripts are available (`dev:client`, `test:client`, `test:coverage`)

## 🚀 Getting Started

### Step 1: Read the Documentation

1. **Review MIGRATION_PLAN.md** (30 min)
   - Understand the overall strategy
   - Review the phases
   - Check the technical architecture
   - Note the timeline (16 weeks)

2. **Review MIGRATION_CHECKLIST.md** (15 min)
   - Understand the task breakdown
   - Familiarize yourself with the checklist format
   - Note the current phase (Phase 0)

### Step 2: Team Alignment

Before starting development:

1. **Schedule kickoff meeting** with the team
2. **Review and discuss** the migration plan
3. **Agree on** priorities and timeline
4. **Assign** Phase 0 tasks to team members
5. **Set up** communication channels (#migration Slack channel)
6. **Establish** code review process

### Step 3: Begin Phase 0

Once aligned, start Phase 0 tasks:

```bash
# 1. Install dependencies
npm install

# 2. Build the React client bundle
npm run build:client

# 3. Run the existing test suites
npm run test
npm run test:jest
npm run test:client

# 4. Start the legacy server runtime
npm start
```

### Step 4: Set Up Configuration Files

Verify and update these key files:

1. **client/tsconfig.json**
2. **client/index.tsx** (entry point)
3. **client/src/App.tsx** (root component)
4. **webpack.config.js** (entry/output/module rules)
5. **public/react-app.html** (HTML shell for `/app`)
6. **package.json** scripts and dependency set

See the detailed specifications in **MIGRATION_PLAN.md** > Technical Architecture.

### Step 5: Update Root Configuration

Update root-level configurations:

1. **webpack.config.js** - Keep client entry/output aligned
2. **package.json** - Keep development/testing scripts current
3. **.gitignore** - Ensure build artifacts are ignored
4. **tsconfig.json** - Keep server/client TypeScript boundaries explicit

## 📋 Next Steps After Phase 0

Once Phase 0 is complete:

1. ✅ Verify server runs (`npm start`)
2. ✅ Verify builds work (`npm run build:client`)
3. ✅ Verify tests run (`npm run test`, `npm run test:jest`, `npm run test:client`)
4. ✅ Smoke test: Create a simple "Hello World" component

Then move to **Phase 1: Component Library**

## 🎨 Migration Pattern Example

Here's how to migrate a typical template:

### Before (Dust.js)
```dust
{! public/templates/dust/wiki/topics/entry-row.dust !}
<li class="list-group-item" data-id="{_id}" data-type="{type}">
  <h4 class="list-group-item-heading">
    <a href="{url}">{title}</a>
  </h4>
  {?description}
    <p class="list-group-item-text">{description}</p>
  {/description}
  <div class="entry-meta">
    <span class="text-muted">By {author.username}</span>
    <span class="text-muted">{editDate}</span>
  </div>
</li>
```

### After (React + TypeScript)
```typescript
// client/src/components/Topics/TopicRow.tsx
import React from 'react';

interface Topic {
  _id: string;
  type: string;
  title: string;
  description?: string;
  url: string;
  author: {
    username: string;
  };
  editDate: string;
}

interface TopicRowProps {
  topic: Topic;
}

export const TopicRow: React.FC<TopicRowProps> = ({ topic }) => {
  return (
    <li 
      className="list-group-item" 
      data-id={topic._id} 
      data-type={topic.type}
    >
      <h4 className="list-group-item-heading">
        <a href={topic.url}>{topic.title}</a>
      </h4>
      {topic.description && (
        <p className="list-group-item-text">{topic.description}</p>
      )}
      <div className="entry-meta">
        <span className="text-muted">By {topic.author.username}</span>
        <span className="text-muted">{topic.editDate}</span>
      </div>
    </li>
  );
};
```

### Migration Steps for Each Component

1. **Analyze** the Dust/Jade template
2. **Identify** data requirements
3. **Define** TypeScript interfaces
4. **Create** React component
5. **Convert** template logic to JSX
6. **Add** props and types
7. **Write** unit tests
8. **Update** checklist

## 🔍 Key Considerations

### Do's ✅
- **Start small** - Begin with simple, reusable components
- **Write tests** - Test as you go, don't leave it for later
- **Type everything** - Use TypeScript properly
- **Reuse components** - Build a solid component library first
- **Follow patterns** - Use consistent patterns across codebase
- **Document** - Add JSDoc comments for complex components
- **Code review** - Every migration should be reviewed

### Don'ts ❌
- **Don't skip phases** - Follow the plan sequentially
- **Don't rush** - Quality over speed
- **Don't ignore tests** - Testing is critical
- **Don't duplicate code** - Reuse and compose components
- **Don't break existing functionality** - Feature parity is key
- **Don't ignore accessibility** - Build accessible components
- **Don't deploy untested code** - Always test thoroughly

## 🛠️ Tools & Resources

### Development Tools
- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - React DevTools
  - Jest Runner

### Libraries to Consider
- **Form handling**: React Hook Form
- **Data fetching**: TanStack Query (React Query)
- **State management**: React Context API (initially)
- **Routing**: React Router v6
- **Styling**: CSS Modules or Tailwind CSS
- **Testing**: Jest + React Testing Library

### Reference Documentation
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Router](https://reactrouter.com/)
- [Testing Library](https://testing-library.com/react)
- [Webpack](https://webpack.js.org/)

## 📞 Getting Help

### Questions?
1. Check **MIGRATION_PLAN.md** for detailed information
2. Search existing GitHub issues
3. Ask in #migration Slack channel
4. Create GitHub issue with `migration` label

### Found an Issue?
1. Document the issue
2. Check if it's a blocker
3. Create GitHub issue
4. Update checklist with ⚠️ Blocked status
5. Notify team

## 📈 Progress Tracking

### Daily Standup Format
- **Yesterday**: What components did you migrate?
- **Today**: What will you work on?
- **Blockers**: Any issues or questions?

### Weekly Review
- Review completed checklist items
- Discuss challenges and learnings
- Adjust timeline if needed
- Plan next week's work

### Metrics to Track
- Templates migrated (count)
- Test coverage (percentage)
- Build size (KB)
- Performance metrics
- Bugs found/fixed

## ✨ Success Criteria

You'll know Phase 0 is complete when:

- ✅ Client directory structure exists
- ✅ All configuration files are in place
- ✅ Dev server runs without errors
- ✅ Production build works
- ✅ Tests run and pass
- ✅ Simple "Hello World" component renders
- ✅ Team is aligned and ready for Phase 1

## 🎯 Final Thoughts

This migration is a **significant undertaking** but it will:
- Modernize the codebase
- Improve developer experience
- Enable better performance
- Make future development easier
- Position the project for long-term success

**Remember**: 
- This is a marathon, not a sprint
- Quality and testing are paramount
- Communication and collaboration are key
- Document as you go
- Celebrate small wins!

---

**Ready to begin?** Start with Phase 0 in [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)

Good luck! 🚀

---

*Document Version: 1.0*  
*Last Updated: 2026-02-21*
