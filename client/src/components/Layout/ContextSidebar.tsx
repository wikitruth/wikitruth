import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import type { HomeDataResponse, TopicEntryResponse } from '../../types/api';
import type { LegacyEntity } from '../../types/legacy';

type SidebarApplication = LegacyEntity & {
  id?: string;
  title?: string;
  homeUrl?: string;
  logoIcon?: string;
};

type SidebarCategory = LegacyEntity & {
  title?: string;
  contextTitle?: string;
  friendlyUrl?: string;
  icon?: string;
  childrenCount?: {
    topics?: {
      accepted?: number;
    };
  };
};

interface SidebarNavItem {
  key: string;
  label: string;
  icon?: string;
  to?: string;
  href?: string;
  badge?: number;
  logoIcon?: string;
  level?: number;
  emphasize?: boolean;
}

interface SidebarSection {
  title: string;
  titleTo?: string;
  items: SidebarNavItem[];
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

function buildTopicLink(topic: Pick<SidebarCategory, '_id' | 'friendlyUrl'>): string {
  const friendly = encodeURIComponent(String(topic.friendlyUrl || topic._id || ''));
  const id = encodeURIComponent(String(topic._id || ''));
  return `/topics/entry/${friendly}/${id}`;
}

function buildSectionLink(section: SidebarSection): string | undefined {
  return section.titleTo;
}

const ContextSidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const section = getSectionFromPath(location.pathname);
  const entryId = getEntryIdFromPath(location.pathname);
  const [homeContext, setHomeContext] = useState<HomeDataResponse | null>(null);
  const [topicContext, setTopicContext] = useState<TopicEntryResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await apiService.getHomeData();
        if (mounted) {
          setHomeContext(data);
        }
      } catch (_error) {
        if (mounted) {
          setHomeContext(null);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (section !== 'topics' || !entryId) {
      setTopicContext(null);
      return;
    }

    let mounted = true;
    const loadTopicContext = async () => {
      try {
        const data = await apiService.getTopicEntry(entryId);
        if (mounted) {
          setTopicContext(data);
        }
      } catch (_error) {
        if (mounted) {
          setTopicContext(null);
        }
      }
    };

    void loadTopicContext();
    return () => {
      mounted = false;
    };
  }, [section, entryId]);

  const appsSection = useMemo<SidebarSection>(() => {
    const appItems: SidebarNavItem[] = [
      {
        key: 'app-core',
        label: 'Wikitruth',
        href: '/',
        logoIcon: '/img/logo-64x64.png',
      },
    ];

    const applications = (homeContext?.applications || []) as SidebarApplication[];
    applications.forEach((app, index) => {
      const title = String(app.title || app.id || '').trim();
      const homeUrl = String(app.homeUrl || '').trim();
      if (!title || !homeUrl) {
        return;
      }

      appItems.push({
        key: `app-${index}-${title}`,
        label: title,
        href: homeUrl,
        logoIcon: app.logoIcon ? String(app.logoIcon) : undefined,
      });
    });

    return {
      title: 'Apps',
      items: appItems,
    };
  }, [homeContext?.applications]);

  const exploreSection = useMemo<SidebarSection>(() => {
    const categories = (homeContext?.appCategories || []) as SidebarCategory[];
    const items: SidebarNavItem[] = categories.map((category, index) => {
      const acceptedTopics = Number(category.childrenCount?.topics?.accepted || 0);
      const icon = String(category.icon || '').trim() || 'folder-open';
      return {
        key: `category-${index}-${String(category._id || '')}`,
        label: String(category.contextTitle || category.title || '(Untitled)'),
        to: buildTopicLink(category),
        icon,
        badge: acceptedTopics > 0 ? acceptedTopics : undefined,
      };
    });

    return {
      title: 'Explore',
      titleTo: '/explore',
      items,
    };
  }, [homeContext?.appCategories]);

  const sectionItemsByRoot: Record<string, SidebarSection> = {
    topics: {
      title: 'In This Section',
      items: [
        { key: 'topics-list', label: 'Topics', to: '/topics', icon: 'folder-open' },
        { key: 'topics-create', label: 'Create Topic', to: '/topics/create', icon: 'plus-circle' },
      ],
    },
    arguments: {
      title: 'In This Section',
      items: [
        { key: 'arguments-list', label: 'Facts', to: '/arguments', icon: 'flash' },
        { key: 'arguments-create', label: 'Create Fact', to: '/arguments/create', icon: 'plus-circle' },
      ],
    },
    questions: {
      title: 'In This Section',
      items: [
        { key: 'questions-list', label: 'Questions', to: '/questions', icon: 'question-circle' },
        { key: 'questions-create', label: 'Ask Question', to: '/questions/create', icon: 'plus-circle' },
      ],
    },
    answers: {
      title: 'In This Section',
      items: [
        { key: 'answers-list', label: 'Answers', to: '/answers', icon: 'check-circle' },
        { key: 'answers-create', label: 'Create Answer', to: '/answers/create', icon: 'plus-circle' },
      ],
    },
    artifacts: {
      title: 'In This Section',
      items: [
        { key: 'artifacts-list', label: 'Artifacts', to: '/artifacts', icon: 'puzzle-piece' },
        { key: 'artifacts-create', label: 'Add Artifact', to: '/artifacts/create', icon: 'plus-circle' },
      ],
    },
    issues: {
      title: 'In This Section',
      items: [
        { key: 'issues-list', label: 'Issues', to: '/issues', icon: 'exclamation-circle' },
        { key: 'issues-create', label: 'Report Issue', to: '/issues/create', icon: 'plus-circle' },
      ],
    },
    opinions: {
      title: 'In This Section',
      items: [
        { key: 'opinions-list', label: 'Comments', to: '/opinions', icon: 'comments-o' },
        { key: 'opinions-create', label: 'Share Opinion', to: '/opinions/create', icon: 'plus-circle' },
      ],
    },
  };

  const topicInSection = useMemo<SidebarSection | null>(() => {
    if (section !== 'topics') {
      return null;
    }

    const fallback: SidebarSection = {
      title: 'In This Section',
      items: [
        { key: 'topics-list', label: 'Topics', to: '/topics', icon: 'folder-open' },
        { key: 'topics-create', label: 'Create Topic', to: '/topics/create', icon: 'plus-circle' },
      ],
    };

    if (!topicContext?.topic) {
      return fallback;
    }

    const topic = topicContext.topic as SidebarCategory;
    const children = ((topicContext.topicChildren || topicContext.topics || []) as SidebarCategory[]).slice(0, 8);
    const siblings = ((topicContext.topicSiblings || []) as SidebarCategory[]).slice(0, 8);
    const items: SidebarNavItem[] = [
      { key: 'topic-explore', label: 'Explore', to: '/explore', icon: 'globe' },
      {
        key: `topic-current-${String(topic._id)}`,
        label: String(topic.title || topic.contextTitle || '(Untitled)'),
        to: buildTopicLink(topic),
        icon: String(topic.icon || '').trim() || 'folder-open',
        badge: Number(topic.childrenCount?.topics?.accepted || 0) || undefined,
        emphasize: true,
      },
    ];

    children.forEach((child, index) => {
      items.push({
        key: `topic-child-${index}-${String(child._id)}`,
        label: String(child.title || child.contextTitle || '(Untitled)'),
        to: buildTopicLink(child),
        icon: String(child.icon || '').trim() || 'folder-open',
        badge: Number(child.childrenCount?.topics?.accepted || 0) || undefined,
        level: 1,
      });
    });

    siblings.forEach((sibling, index) => {
      items.push({
        key: `topic-sibling-${index}-${String(sibling._id)}`,
        label: String(sibling.title || sibling.contextTitle || '(Untitled)'),
        to: buildTopicLink(sibling),
        icon: String(sibling.icon || '').trim() || 'folder-open',
        badge: Number(sibling.childrenCount?.topics?.accepted || 0) || undefined,
      });
    });

    if (topicContext.topicSiblingsMore) {
      items.push({
        key: 'topic-siblings-more',
        label: 'more...',
        to: `/topics/${encodeURIComponent(String(topic.friendlyUrl || ''))}/${encodeURIComponent(String(topic._id || ''))}`,
        icon: 'ellipsis-h',
      });
    }

    items.push({
      key: 'topic-create',
      label: 'Create Topic',
      to: `/topics/create?topic=${encodeURIComponent(String(topic._id || ''))}`,
      icon: 'plus-circle',
    });

    return {
      title: 'In This Section',
      items,
    };
  }, [section, topicContext]);

  const relatedItems: SidebarNavItem[] = [];
  if (section === 'topics' && entryId) {
    relatedItems.push({ key: 'related-facts', label: 'Related Facts', to: `/arguments?topic=${encodeURIComponent(entryId)}`, icon: 'flash' });
    relatedItems.push({ key: 'related-questions', label: 'Related Questions', to: `/questions?topic=${encodeURIComponent(entryId)}`, icon: 'question-circle' });
    relatedItems.push({ key: 'related-artifacts', label: 'Related Artifacts', to: `/artifacts?topic=${encodeURIComponent(entryId)}`, icon: 'puzzle-piece' });
  }

  const personalSection: SidebarSection | null = user
    ? {
        title: 'My Shortcuts',
        items: [
          { key: 'my-profile', label: 'My Profile', to: `/members/${encodeURIComponent(user.username)}`, icon: 'user-circle' },
          { key: 'my-journal', label: 'My Journal', to: `/members/${encodeURIComponent(user.username)}/journal`, icon: 'book' },
          { key: 'my-groups', label: 'My Groups', to: '/groups', icon: 'group' },
        ],
      }
    : null;

  const sections: SidebarSection[] = [appsSection];
  if (exploreSection.items.length > 0) {
    sections.push(exploreSection);
  }
  if (section === 'topics' && topicInSection) {
    sections.push(topicInSection);
  } else if (sectionItemsByRoot[section]) {
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
      <ul className="wt-nav nav">
        {sections.map((navSection, sectionIndex) => (
          <React.Fragment key={`${navSection.title}-${sectionIndex}`}>
            {sectionIndex > 0 && <li role="separator" className="divider"></li>}
            <li className="dropdown-header">
              {buildSectionLink(navSection) ? (
                <Link to={String(buildSectionLink(navSection))}>{navSection.title}</Link>
              ) : (
                navSection.title
              )}
            </li>
            {navSection.items.map((item) => {
              const isActive = item.to ? location.pathname === item.to : false;
              const iconName = item.icon || 'folder-open';
              const linkStyle: React.CSSProperties = {
                marginLeft: item.level ? `${item.level * 18}px` : undefined,
                fontWeight: item.emphasize ? 700 : undefined,
              };
              return (
                <li key={item.key} className={isActive ? 'active' : ''}>
                  {item.to ? (
                    <Link to={item.to} style={linkStyle}>
                      <i className={`fa fa-${iconName}`} aria-hidden="true"></i> {item.label}
                      {typeof item.badge === 'number' ? <span className="wt-label label label-default">{item.badge}</span> : null}
                    </Link>
                  ) : (
                    <a href={item.href || '#'} style={linkStyle}>
                      {item.logoIcon ? (
                        <img
                          src={item.logoIcon}
                          alt=""
                          style={{ width: 16, height: 16, marginRight: 8, objectFit: 'contain' }}
                          aria-hidden="true"
                        />
                      ) : (
                        <i className={`fa fa-${iconName}`} aria-hidden="true"></i>
                      )}{' '}
                      {item.label}
                    </a>
                  )}
                </li>
              );
            })}
          </React.Fragment>
        ))}
      </ul>
    </aside>
  );
};

export default ContextSidebar;
