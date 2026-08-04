import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useApplicationContext } from '../../context/ApplicationContext';
import ApplicationLink from '../common/ApplicationLink';
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
import { useContentVisibility } from '../../context/ContentVisibilityContext';
import { countForView } from '../../utils/contentVisibility';

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
  titleAction?: {
    label: string;
    to: string;
  };
  items: SidebarNavItem[];
}

function getEntryIdFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 3 || parts[1] !== 'entry') {
    return null;
  }

  const entryParts = parts.slice(2);
  const subrouteIndex = entryParts.findIndex((part) => ['answers', 'discussion', 'timeline'].includes(part));
  const entryPath = subrouteIndex >= 0 ? entryParts.slice(0, subrouteIndex) : entryParts;
  const entryId = entryPath.at(-1);
  return entryId ? decodeURIComponent(entryId) : null;
}

function getSectionFromPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] || 'home';
}

function getMemberUsernameFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'members') {
    return null;
  }
  const username = parts[1];
  if (!username || username === 'profile') {
    return null;
  }
  return decodeURIComponent(username);
}

function buildTopicLink(topic: Pick<SidebarCategory, '_id' | 'friendlyUrl'>): string {
  const friendly = encodeURIComponent(String(topic.friendlyUrl || topic._id || ''));
  const id = encodeURIComponent(String(topic._id || ''));
  return `/topics/entry/${friendly}/${id}`;
}

function buildGroupLink(group: Pick<LegacyEntity, '_id' | 'friendlyUrl'>): string {
  const friendly = encodeURIComponent(String(group.friendlyUrl || group._id || ''));
  const id = encodeURIComponent(String(group._id || ''));
  return `/groups/${friendly}/${id}`;
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
  const { effectiveView } = useContentVisibility();
  const {
    application,
    applications,
    appCategories,
    applicationPath,
    localTenantContext,
    platformHomeUrl,
  } = useApplicationContext();
  const section = getSectionFromPath(location.pathname);
  const entryId = getEntryIdFromPath(location.pathname);
  const memberUsernameFromPath = getMemberUsernameFromPath(location.pathname);
  const profileUsername = memberUsernameFromPath || user?.username || '';
  const profileBasePath = profileUsername ? `/members/${encodeURIComponent(profileUsername)}` : '/members/profile';
  const locationQuery = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const topicLinkQuery = String(locationQuery.get('topicLink') || '').trim();
  const argumentLinkQuery = String(locationQuery.get('argumentLink') || '').trim();
  const [homeContext, setHomeContext] = useState<HomeDataResponse | null>(null);
  const [topicContext, setTopicContext] = useState<TopicEntryResponse | null>(null);
  const [contextTopicId, setContextTopicId] = useState<string | null>(null);
  const [contextTopicLinks, setContextTopicLinks] = useState<SidebarCategory[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await apiService.getHomeData(localTenantContext, effectiveView);
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
  }, [effectiveView, localTenantContext]);

  useEffect(() => {
    if (!entryId) {
      setContextTopicId(null);
      setContextTopicLinks([]);
      return;
    }

    if (section === 'topics') {
      if (!topicLinkQuery) {
        setContextTopicId(entryId);
        setContextTopicLinks(normalizeEntryTopicLinks(topicContext?.topicLinks || []));
        return;
      }

      let mounted = true;
      const loadLinkedTopicContext = async () => {
        try {
          const response = await apiService.getTopicEntry(entryId, {
            topicLink: topicLinkQuery,
            id: topicLinkQuery,
            view: effectiveView,
          });
          if (!mounted) {
            return;
          }
          const topic = (response?.topic || null) as SidebarCategory | null;
          const topicId = String(topic?._id || '').trim();
          setContextTopicId(topicId || null);
          setContextTopicLinks(normalizeEntryTopicLinks(response?.topicLinks || []));
        } catch (_error) {
          if (!mounted) {
            return;
          }
          setContextTopicId(null);
          setContextTopicLinks([]);
        }
      };

      void loadLinkedTopicContext();
      return () => {
        mounted = false;
      };
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
            response = await apiService.getArgumentEntry(entryId, {
              argumentLink: argumentLinkQuery || undefined,
              id: argumentLinkQuery || undefined,
              view: effectiveView,
            });
            break;
          case 'questions':
            response = await apiService.getQuestionEntry(entryId, effectiveView);
            break;
          case 'answers':
            response = await apiService.getAnswerEntry(entryId, effectiveView);
            break;
          case 'artifacts':
            response = await apiService.getArtifactEntry(entryId, effectiveView);
            break;
          case 'issues':
            response = await apiService.getIssueEntry(entryId, effectiveView);
            break;
          case 'opinions':
            response = await apiService.getOpinionEntry(entryId, effectiveView);
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
  }, [argumentLinkQuery, effectiveView, section, entryId, topicContext?.topicLinks, topicLinkQuery]);

  useEffect(() => {
    if (!contextTopicId) {
      setTopicContext(null);
      return;
    }

    let mounted = true;
    const loadTopicContext = async () => {
      try {
        const data = await apiService.getTopicEntry(contextTopicId, { view: effectiveView });
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
  }, [contextTopicId, effectiveView]);

  const appsSection = useMemo<SidebarSection>(() => {
    const appItems: SidebarNavItem[] = [
      {
        key: 'app-core',
        label: 'Wikitruth',
        href: platformHomeUrl,
        logoIcon: '/img/logo-64x64.png',
      },
    ];

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
  }, [applications, platformHomeUrl]);

  const exploreSection = useMemo<SidebarSection>(() => {
    const categories = appCategories as SidebarCategory[];
    const items: SidebarNavItem[] = categories.map((category, index) => {
      const acceptedTopics = countForView(category.childrenCount?.topics, effectiveView);
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
      titleTo: application?.exploreUrl || '/explore',
      items,
    };
  }, [appCategories, application?.exploreUrl, effectiveView]);

  const sectionItemsByRoot = useMemo<Record<string, SidebarSection>>(() => ({
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
    members: {
      title: 'In This Section',
      items: [
        { key: 'members-overview', label: 'Overview', to: profileBasePath, icon: 'user' },
        { key: 'members-topics', label: 'Topics', to: `${profileBasePath}/topics`, icon: 'folder-open' },
        { key: 'members-journal', label: 'Journal', to: `${profileBasePath}/journal`, icon: 'book' },
        { key: 'members-contributions', label: 'Contributions', to: `${profileBasePath}/contributions`, icon: 'bolt' },
        { key: 'members-following', label: 'Following', to: `${profileBasePath}/following`, icon: 'feed' },
        { key: 'members-pages', label: 'Pages', to: `${profileBasePath}/pages`, icon: 'file-text-o' },
        ...(user?.username && profileUsername === user.username
          ? [{ key: 'members-settings', label: 'Settings', to: '/members/profile/settings', icon: 'cog' }]
          : []),
      ],
    },
  }), [profileBasePath, profileUsername, user?.username]);

  const topicInSection = useMemo<SidebarSection | null>(() => {
    const fallback = sectionItemsByRoot[section] || null;
    if (!contextTopicId || !topicContext?.topic) {
      return fallback;
    }

    const topic = topicContext.topic as SidebarCategory;
    const parentTopic = (topicContext.parentTopic || topic.parentTopic || null) as SidebarCategory | null;
    const grandParentTopic = (topicContext.grandParentTopic || null) as SidebarCategory | null;
    const children = ((topicContext.topicChildren || topicContext.topics || []) as SidebarCategory[]).slice(0, 8);
    const siblings = ((topicContext.topicSiblings || []) as SidebarCategory[]).slice(0, 8);
    const parentSiblings = ((topicContext.parentSiblings || []) as SidebarCategory[]).slice(0, 8);
    const items: SidebarNavItem[] = [];

    if (section === 'topics' && !parentTopic?._id) {
      items.push({ key: 'topic-explore', label: 'Explore', to: '/explore', icon: 'globe' });
    }

    if (parentTopic?._id) {
      items.push({
        key: `topic-parent-${String(parentTopic._id)}`,
        label: String(parentTopic.contextTitle || parentTopic.title || '(Untitled)'),
        to: buildTopicLink(parentTopic),
        icon: String(parentTopic.icon || '').trim() || 'folder-open',
        badge: countForView(parentTopic.childrenCount?.topics, effectiveView) || undefined,
      });
    }

    const currentLevel = parentTopic?._id ? 1 : 0;
    items.push({
      key: `topic-current-${String(topic._id)}`,
      label: String(topic.contextTitle || topic.title || '(Untitled)'),
      to: buildTopicLink(topic),
      icon: String(topic.icon || '').trim() || 'folder-open',
      badge: countForView(topic.childrenCount?.topics, effectiveView) || undefined,
      emphasize: true,
      level: currentLevel,
    });

    children.forEach((child, index) => {
      items.push({
        key: `topic-child-${index}-${String(child._id)}`,
        label: String(child.contextTitle || child.title || '(Untitled)'),
        to: buildTopicLink(child),
        icon: String(child.icon || '').trim() || 'folder-open',
        badge: countForView(child.childrenCount?.topics, effectiveView) || undefined,
        level: currentLevel + 1,
      });
    });

    if (topicContext.topicChildrenMore) {
      items.push({
        key: 'topic-children-more',
        label: 'more...',
        to: `/topics/${encodeURIComponent(String(topic.friendlyUrl || ''))}/${encodeURIComponent(String(topic._id || ''))}`,
        icon: 'folder',
        level: currentLevel + 1,
      });
    }

    siblings.forEach((sibling, index) => {
      items.push({
        key: `topic-sibling-${index}-${String(sibling._id)}`,
        label: String(sibling.contextTitle || sibling.title || '(Untitled)'),
        to: buildTopicLink(sibling),
        icon: String(sibling.icon || '').trim() || 'folder-open',
        badge: countForView(sibling.childrenCount?.topics, effectiveView) || undefined,
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

    parentSiblings.forEach((parentSibling, index) => {
      items.push({
        key: `topic-parent-sibling-${index}-${String(parentSibling._id)}`,
        label: String(parentSibling.contextTitle || parentSibling.title || '(Untitled)'),
        to: buildTopicLink(parentSibling),
        icon: String(parentSibling.icon || '').trim() || 'folder-open',
        badge: countForView(parentSibling.childrenCount?.topics, effectiveView) || undefined,
      });
    });

    if (topicContext.parentSiblingsMore && grandParentTopic?._id) {
      items.push({
        key: 'topic-parent-siblings-more',
        label: 'more...',
        to: `/topics/${encodeURIComponent(String(grandParentTopic.friendlyUrl || ''))}/${encodeURIComponent(String(grandParentTopic._id || ''))}`,
        icon: 'folder',
      });
    }

    return {
      title: 'In This Section',
      items,
    };
  }, [contextTopicId, effectiveView, section, sectionItemsByRoot, topicContext]);

  const diarySection = useMemo<SidebarSection | null>(() => {
    if (!user) {
      return null;
    }
    const categories = (homeContext?.diaryCategories || []) as SidebarCategory[];
    if (categories.length === 0) {
      return null;
    }
    return {
      title: 'My Journal',
      titleTo: `/members/${encodeURIComponent(user.username)}/journal`,
      items: categories.map((category, index) => ({
        key: `diary-${index}-${String(category._id || '')}`,
        label: String(category.contextTitle || category.title || '(Untitled)'),
        to: buildTopicLink(category),
        icon: String(category.icon || '').trim() || 'folder-open',
        badge: countForView(category.childrenCount?.topics, effectiveView) || undefined,
      })),
    };
  }, [effectiveView, homeContext?.diaryCategories, user]);

  const groupsSection = useMemo<SidebarSection | null>(() => {
    if (!user) {
      return null;
    }
    const groups = (homeContext?.myGroups || []) as LegacyEntity[];
    return {
      title: 'Groups',
      titleTo: '/groups',
      titleAction: { label: '+ Create', to: '/groups/create' },
      items: groups.map((group, index) => ({
        key: `group-${index}-${String(group._id || '')}`,
        label: String(group.title || '(Untitled)'),
        to: buildGroupLink(group),
        icon: 'group',
      })),
    };
  }, [homeContext?.myGroups, user]);

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
  if (diarySection) {
    sections.push(diarySection);
  }
  if (groupsSection) {
    sections.push(groupsSection);
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
                <ApplicationLink href={applicationPath(String(buildSectionLink(navSection)))}>{navSection.title}</ApplicationLink>
              ) : (
                navSection.title
              )}
              {navSection.titleAction ? (
                <Link to={applicationPath(navSection.titleAction.to)} className="pull-right">
                  {navSection.titleAction.label}
                </Link>
              ) : null}
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
                    <Link to={applicationPath(item.to)} style={linkStyle} className="wt-context-sidebar-link">
                      <i className={`fa fa-${iconName}`} aria-hidden="true"></i>
                      <span className="wt-context-sidebar-label">{item.label}</span>
                      {typeof item.badge === 'number' ? (
                        <span className="wt-context-sidebar-badge">{item.badge}</span>
                      ) : null}
                    </Link>
                  ) : (
                    <ApplicationLink href={item.href || '#'} style={linkStyle} className="wt-context-sidebar-link">
                      {item.logoIcon ? (
                        <img
                          src={item.logoIcon}
                          alt=""
                          style={{ width: 16, height: 16, marginRight: 8, objectFit: 'contain' }}
                          aria-hidden="true"
                        />
                      ) : (
                        <i className={`fa fa-${iconName}`} aria-hidden="true"></i>
                      )}
                      <span className="wt-context-sidebar-label">{item.label}</span>
                    </ApplicationLink>
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
