import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function getEntryIdFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 3 || parts[1] !== 'entry') {
    return null;
  }
  if (parts.length >= 4) {
    return decodeURIComponent(parts[3]);
  }
  return decodeURIComponent(parts[2]);
}

function getSectionFromPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] || 'home';
}

const ContextSidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const section = getSectionFromPath(location.pathname);
  const entryId = getEntryIdFromPath(location.pathname);

  const appSection: NavSection = {
    title: 'Apps',
    items: [
      { label: 'Explore', to: '/topics', icon: 'globe' },
      { label: 'Search', to: '/search', icon: 'search' },
      { label: 'Visualize', to: '/visualize', icon: 'snowflake-o' },
    ],
  };

  const sectionItemsByRoot: Record<string, NavSection> = {
    topics: {
      title: 'In This Section',
      items: [
        { label: 'Topics', to: '/topics', icon: 'folder-open' },
        { label: 'Create Topic', to: '/topics/create', icon: 'plus-circle' },
      ],
    },
    arguments: {
      title: 'In This Section',
      items: [
        { label: 'Facts', to: '/arguments', icon: 'flash' },
        { label: 'Create Fact', to: '/arguments/create', icon: 'plus-circle' },
      ],
    },
    questions: {
      title: 'In This Section',
      items: [
        { label: 'Questions', to: '/questions', icon: 'question-circle' },
        { label: 'Ask Question', to: '/questions/create', icon: 'plus-circle' },
      ],
    },
    answers: {
      title: 'In This Section',
      items: [
        { label: 'Answers', to: '/answers', icon: 'check-circle' },
        { label: 'Create Answer', to: '/answers/create', icon: 'plus-circle' },
      ],
    },
    artifacts: {
      title: 'In This Section',
      items: [
        { label: 'Artifacts', to: '/artifacts', icon: 'puzzle-piece' },
        { label: 'Add Artifact', to: '/artifacts/create', icon: 'plus-circle' },
      ],
    },
    issues: {
      title: 'In This Section',
      items: [
        { label: 'Issues', to: '/issues', icon: 'exclamation-circle' },
        { label: 'Report Issue', to: '/issues/create', icon: 'plus-circle' },
      ],
    },
    opinions: {
      title: 'In This Section',
      items: [
        { label: 'Comments', to: '/opinions', icon: 'comments-o' },
        { label: 'Share Opinion', to: '/opinions/create', icon: 'plus-circle' },
      ],
    },
    groups: {
      title: 'In This Section',
      items: [
        { label: 'Groups', to: '/groups', icon: 'group' },
        { label: 'Create Group', to: '/groups/create', icon: 'plus-circle' },
      ],
    },
    members: {
      title: 'In This Section',
      items: [{ label: 'Members', to: '/members', icon: 'user-circle' }],
    },
  };

  const relatedItems: NavItem[] = [];
  if (section === 'topics' && entryId) {
    relatedItems.push({ label: 'Related Facts', to: `/arguments?topic=${encodeURIComponent(entryId)}`, icon: 'flash' });
    relatedItems.push({ label: 'Related Questions', to: `/questions?topic=${encodeURIComponent(entryId)}`, icon: 'question-circle' });
    relatedItems.push({ label: 'Related Artifacts', to: `/artifacts?topic=${encodeURIComponent(entryId)}`, icon: 'puzzle-piece' });
    relatedItems.push({ label: 'Related Issues', to: `/issues?topic=${encodeURIComponent(entryId)}`, icon: 'exclamation-circle' });
    relatedItems.push({ label: 'Related Comments', to: `/opinions?topic=${encodeURIComponent(entryId)}`, icon: 'comments-o' });
  }
  if (section === 'questions' && entryId) {
    relatedItems.push({ label: 'Answers', to: `/answers?question=${encodeURIComponent(entryId)}`, icon: 'check-circle' });
  }

  const personalSection: NavSection | null = user
    ? {
        title: 'My Shortcuts',
        items: [
          { label: 'My Profile', to: `/members/${encodeURIComponent(user.username)}`, icon: 'user-circle' },
          { label: 'My Diary', to: `/members/${encodeURIComponent(user.username)}/diary`, icon: 'book' },
          { label: 'My Groups', to: '/groups', icon: 'group' },
        ],
      }
    : null;

  const sections: NavSection[] = [appSection];
  if (sectionItemsByRoot[section]) {
    sections.push(sectionItemsByRoot[section]);
  }
  if (relatedItems.length > 0) {
    sections.push({ title: 'Related', items: relatedItems });
  }
  if (personalSection) {
    sections.push(personalSection);
  }

  return (
    <aside className="wt-context-sidebar" aria-label="Contextual navigation">
      {sections.map((navSection) => (
        <div key={navSection.title} className="wt-context-sidebar-section">
          <div className="wt-context-sidebar-header">{navSection.title}</div>
          <ul className="nav">
            {navSection.items.map((item) => (
              <li key={`${navSection.title}-${item.to}`}>
                <Link to={item.to}>
                  <i className={`fa fa-${item.icon}`} aria-hidden="true"></i> {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
};

export default ContextSidebar;
