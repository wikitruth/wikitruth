import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import type {
  AnswerEntryResponse,
  ArgumentEntryResponse,
  ArtifactEntryResponse,
  HomeDataResponse,
  IssueEntryResponse,
  OpinionEntryResponse,
  QuestionEntryResponse,
  TopicEntryResponse,
} from '../../types/api';
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

function normalizeEntryTopicLinks(raw: unknown): SidebarCategory[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw as SidebarCategory[];
}

const ContextSidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const section = getSectionFromPath(location.pathname);
  const entryId = getEntryIdFromPath(location.pathname);
  const [homeContext, setHomeContext] = useState<HomeDataResponse | null>(null);
  const [topicContext, setTopicContext] = useState<TopicEntryResponse | null>(null);
  const [contextTopicId, setContextTopicId] = useState<string | null>(null);
  const [contextTopicLinks, setContextTopicLinks] = useState<SidebarCategory[]>([]);

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
    if (!entryId) {
      setContextTopicId(null);
      setContextTopicLinks([]);
      return;
    }

    if (section === 'topics') {
      setContextTopicId(entryId);
      setContextTopicLinks(normalizeEntryTopicLinks(topicContext?.topicLinks || []));
      return;
    }

    if (!['arguments', 'questions', 'answers', 'artifacts', 'issues', 'opinions'].includes(section)) {
      setContextTopicId(null);
      setContextTopicLinks([]);
      return;
    }

    let mounted = true;
    const loadEntryContext = async () => {
      try {
        let response:
          | ArgumentEntryResponse
          | QuestionEntryResponse
          | AnswerEntryResponse
          | ArtifactEntryResponse
          | IssueEntryResponse
          | OpinionEntryResponse;

        switch (section) {
          case 'arguments':
            response = await apiService.getArgumentEntry(entryId);
            break;
          case 'questions':
            response = await apiService.getQuestionEntry(entryId);
            break;
          case 'answers':
            response = await apiService.getAnswerEntry(entryId);
            break;
          case 'artifacts':
            response = await apiService.getArtifactEntry(entryId);
            break;
          case 'issues':
            response = await apiService.getIssueEntry(entryId);
            break;
          case 'opinions':
            response = await apiService.getOpinionEntry(entryId);
            break;
          default:
            return;
        }

        const responseRecord = response as Record<string, unknown>;
        const entityBySection: Partial<Record<string, LegacyEntity | undefined>> = {
          arguments: responseRecord.argument as LegacyEntity | undefined,
          questions: responseRecord.question as LegacyEntity | undefined,
          answers: responseRecord.answer as LegacyEntity | undefined,
          artifacts: responseRecord.artifact as LegacyEntity | undefined,
          issues: responseRecord.issue as LegacyEntity | undefined,
          opinions: responseRecord.opinion as LegacyEntity | undefined,
        };

        const entryEntity = entityBySection[section];
        const responseTopic = ((responseRecord.topic as SidebarCategory | undefined) || entryEntity?.parentTopic || null) as SidebarCategory | null;
        const topicId = String(responseTopic?._id || '').trim();
        const topicLinks = normalizeEntryTopicLinks(responseRecord.topicLinks || entryEntity?.topicLinks || []);

        if (!mounted) {
          return;
        }
        setContextTopicId(topicId || null);
        setContextTopicLinks(topicLinks);
      } catch (_error) {
        if (!mounted) {
          return;
        }
        setContextTopicId(null);
        setContextTopicLinks([]);
      }
    };

    void loadEntryContext();
    return () => {
      mounted = false;
    };
  }, [section, entryId, topicContext?.topicLinks]);

  useEffect(() => {
    if (!contextTopicId) {
      setTopicContext(null);
      return;
    }

    let mounted = true;
    const loadTopicContext = async () => {
      try {
        const data = await apiService.getTopicEntry(contextTopicId);
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
  }, [contextTopicId]);

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
    const fallback = sectionItemsByRoot[section] || null;
    if (!contextTopicId || !topicContext?.topic) {
      return fallback;
    }

    const topic = topicContext.topic as SidebarCategory;
    const parentTopic = (topic.parentTopic || null) as SidebarCategory | null;
    const children = ((topicContext.topicChildren || topicContext.topics || []) as SidebarCategory[]).slice(0, 8);
    const siblings = ((topicContext.topicSiblings || []) as SidebarCategory[]).slice(0, 8);
    const items: SidebarNavItem[] = [];

    if (section === 'topics' && !parentTopic?._id) {
      items.push({ key: 'topic-explore', label: 'Explore', to: '/explore', icon: 'globe' });
    }

    if (parentTopic?._id) {
      items.push({
        key: `topic-parent-${String(parentTopic._id)}`,
        label: String(parentTopic.title || parentTopic.contextTitle || '(Untitled)'),
        to: buildTopicLink(parentTopic),
        icon: String(parentTopic.icon || '').trim() || 'folder-open',
        badge: Number(parentTopic.childrenCount?.topics?.accepted || 0) || undefined,
      });
    }

    const currentLevel = parentTopic?._id ? 1 : 0;
    items.push({
      key: `topic-current-${String(topic._id)}`,
      label: String(topic.title || topic.contextTitle || '(Untitled)'),
      to: buildTopicLink(topic),
      icon: String(topic.icon || '').trim() || 'folder-open',
      badge: Number(topic.childrenCount?.topics?.accepted || 0) || undefined,
      emphasize: true,
      level: currentLevel,
    });

    children.forEach((child, index) => {
      items.push({
        key: `topic-child-${index}-${String(child._id)}`,
        label: String(child.title || child.contextTitle || '(Untitled)'),
        to: buildTopicLink(child),
        icon: String(child.icon || '').trim() || 'folder-open',
        badge: Number(child.childrenCount?.topics?.accepted || 0) || undefined,
        level: currentLevel + 1,
      });
    });

    siblings.forEach((sibling, index) => {
      items.push({
        key: `topic-sibling-${index}-${String(sibling._id)}`,
        label: String(sibling.title || sibling.contextTitle || '(Untitled)'),
        to: buildTopicLink(sibling),
        icon: String(sibling.icon || '').trim() || 'folder-open',
        badge: Number(sibling.childrenCount?.topics?.accepted || 0) || undefined,
        level: currentLevel,
      });
    });

    if (topicContext.topicSiblingsMore) {
      items.push({
        key: 'topic-siblings-more',
        label: 'more...',
        to: `/topics/${encodeURIComponent(String(topic.friendlyUrl || ''))}/${encodeURIComponent(String(topic._id || ''))}`,
        icon: 'ellipsis-h',
        level: currentLevel,
      });
    }

    return {
      title: 'In This Section',
      items,
    };
  }, [contextTopicId, section, sectionItemsByRoot, topicContext]);

  const relatedItems = useMemo<SidebarNavItem[]>(() => {
    const entrySection = ['topics', 'arguments', 'questions', 'answers', 'artifacts', 'issues', 'opinions'].includes(section);
    if (!entrySection || !entryId) {
      return [];
    }

    const resolvedTopicId = contextTopicId || entryId;
    if (!resolvedTopicId) {
      return [];
    }

    const topicLinks = section === 'topics'
      ? normalizeEntryTopicLinks(topicContext?.topicLinks || [])
      : contextTopicLinks;
    const firstRelatedTopic = topicLinks[0];
    const fallbackTopic = topicContext?.topic as SidebarCategory | undefined;
    const relatedTopic = firstRelatedTopic || fallbackTopic;

    return [
      {
        key: 'related-topic',
        label: String(relatedTopic?.contextTitle || relatedTopic?.title || 'Related topic'),
        to: relatedTopic?._id ? buildTopicLink(relatedTopic) : `/topics/entry/${encodeURIComponent(resolvedTopicId)}/${encodeURIComponent(resolvedTopicId)}`,
        icon: 'folder-open',
      },
      {
        key: 'related-fact',
        label: 'Related fact',
        to: `/arguments?topic=${encodeURIComponent(resolvedTopicId)}`,
        icon: 'flash',
      },
      {
        key: 'related-question',
        label: 'Related question',
        to: `/questions?topic=${encodeURIComponent(resolvedTopicId)}`,
        icon: 'question-circle',
      },
      {
        key: 'related-more',
        label: 'more...',
        to: '/explore',
        icon: 'arrow-circle-right',
      },
    ];
  }, [contextTopicId, contextTopicLinks, entryId, section, topicContext?.topic, topicContext?.topicLinks]);

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
  if (topicInSection) {
    sections.push(topicInSection);
  } else if (sectionItemsByRoot[section]) {
    sections.push(sectionItemsByRoot[section]);
  }
  if (relatedItems.length > 0) {
    sections.push({ title: 'Related', items: relatedItems });
  }
  if (exploreSection.items.length > 0) {
    sections.push(exploreSection);
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
