import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api';
import type { OutlineTreeNode, OutlineTreeResponse } from '../types/api';
import KnowledgeGraph from './visualize/KnowledgeGraph';
import TopicSearch from './visualize/TopicSearch';
import {
  buildVisualizeGraphContext,
  topicVisualizeUrl,
  type VisualizeGraphNode,
} from './visualize/graphModel';
import './visualize/visualize.css';
import { useContentVisibility } from '../context/ContentVisibilityContext';

function decodeTopicId(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

const VisualizePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const { theme } = useTheme();
  const { effectiveView } = useContentVisibility();
  const [outline, setOutline] = useState<OutlineTreeResponse | null>(null);
  const [activeNode, setActiveNode] = useState<VisualizeGraphNode | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const helpRef = useRef<HTMLDivElement | null>(null);

  const selectedTopicId = useMemo(() => {
    const searchTopic = new URLSearchParams(location.search).get('topic') || '';
    return decodeTopicId(String(params.id || searchTopic || ''));
  }, [location.search, params.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = selectedTopicId
          ? await apiService.getOutlineTree(selectedTopicId, 2, { ancestorDepth: 20, childLimit: 11, view: effectiveView })
          : await apiService.getOutlineTree(undefined, 1, { childLimit: 11, rootLimit: 20, view: effectiveView });
        if (selectedTopicId && (!result.tree || result.success === false)) {
          throw new Error(result.message || 'The requested public topic could not be loaded');
        }
        if (!cancelled) setOutline(result);
      } catch (loadError) {
        if (!cancelled) {
          setOutline(null);
          setError(loadError instanceof Error ? loadError.message : 'Failed to load the visualization');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [effectiveView, selectedTopicId]);

  const trees = useMemo<OutlineTreeNode[]>(() => {
    if (outline?.tree) return [outline.tree];
    return outline?.trees || [];
  }, [outline]);

  const graphContext = useMemo(
    () => buildVisualizeGraphContext(trees, outline?.ancestors || [], selectedTopicId, {
      hierarchyContextUnavailable: Boolean(
        selectedTopicId
        && (outline?.hierarchyContext === 'unavailable' || !Array.isArray(outline?.ancestors)),
      ),
    }),
    [outline?.ancestors, outline?.hierarchyContext, selectedTopicId, trees],
  );

  useEffect(() => {
    setActiveNode(null);
  }, [graphContext]);

  useEffect(() => {
    if (!isHelpOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!helpRef.current?.contains(event.target as Node)) {
        setIsHelpOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHelpOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHelpOpen]);

  const selectGraphNode = useCallback((node: VisualizeGraphNode) => {
    setActiveNode(node);
  }, []);

  const recenterGraphNode = useCallback((node: VisualizeGraphNode) => {
    if (node.visualizeUrl !== location.pathname) navigate(node.visualizeUrl);
  }, [location.pathname, navigate]);

  const openGraphNode = useCallback((node: VisualizeGraphNode) => {
    navigate(node.exploreUrl);
  }, [navigate]);

  if (loading) return <LoadingSpinner message="Loading visualization..." />;

  if (error || graphContext.graph.nodes.length === 0) {
    return (
      <div className="wt-visualize-page">
        <h1 className="wt-viz-title"><i className="fa fa-snowflake-o" aria-hidden="true"></i> Visualize</h1>
        <Alert type="danger">
          {error || 'No public topics are available for this graph.'}
          {selectedTopicId ? <div><Link to="/visualize">Return to the Wikitruth graph</Link></div> : null}
        </Alert>
      </div>
    );
  }

  const directParent = graphContext.directParent?.type === 'topic' ? graphContext.directParent : null;
  const scopeDescription = selectedTopicId
    ? 'Parents + 2 child levels'
    : 'Root topics + 1 child level';
  const topicCountLabel = `${graphContext.topicCount} ${graphContext.topicCount === 1 ? 'topic' : 'topics'}`;

  return (
    <div className="wt-visualize-page">
      <div className="wt-viz-heading-row">
        <h1 className="wt-viz-title"><i className="fa fa-snowflake-o" aria-hidden="true"></i> Visualize</h1>
        <div ref={helpRef} className={`wt-viz-help${isHelpOpen ? ' is-open' : ''}`}>
          <button
            type="button"
            className="wt-viz-help-trigger"
            aria-label="How to use the knowledge graph"
            aria-expanded={isHelpOpen}
            aria-controls="wt-viz-help-panel"
            onClick={() => setIsHelpOpen((open) => !open)}
          >
            <i className="fa fa-question-circle" aria-hidden="true"></i>
          </button>
          {isHelpOpen ? <div id="wt-viz-help-panel" role="dialog" aria-label="Knowledge graph help">
            Tap a node to inspect it. Choose <strong>Center here</strong> to navigate through the hierarchy,
            or drag and zoom the graph to explore the current view.
          </div> : null}
        </div>
      </div>

      <nav className="wt-viz-breadcrumb" aria-label="Graph path">
        <ol>
          {graphContext.breadcrumbs.map((crumb, index) => {
            const isCurrent = index === graphContext.breadcrumbs.length - 1;
            return (
              <li key={`${crumb.id}-${index}`}>
                {index === 0 ? <i className="fa fa-globe wt-viz-breadcrumb-icon" aria-hidden="true"></i> : null}
                {isCurrent ? <span aria-current="page">{crumb.title}</span> : <Link to={crumb.visualizeUrl}>{crumb.title}</Link>}
                {crumb.archived ? (
                  <span
                    className="wt-viz-breadcrumb-archive"
                    aria-label={`${crumb.title} is archived hierarchy context`}
                    title="Archived hierarchy context"
                  >
                    <i className="fa fa-archive" aria-hidden="true"></i>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <TopicSearch
        onSelect={(topic) => navigate(topicVisualizeUrl(topic))}
      />

      <div className="wt-viz-scope" role="group" aria-label="Loaded graph scope and navigation">
        <div className="wt-viz-scope-summary">
          <span className="wt-viz-scope-chip"><i className="fa fa-folder-open" aria-hidden="true"></i> {topicCountLabel}</span>
          <span className="wt-viz-scope-copy">{scopeDescription}</span>
          {outline?.truncated ? (
            <span className="wt-viz-scope-warning" title="Some branches contain more topics than this view shows">
              <i className="fa fa-info-circle" aria-hidden="true"></i> Bounded view
            </span>
          ) : null}
        </div>
        {selectedTopicId ? <div className="wt-viz-scope-actions">
          {directParent ? (
            <Link to={directParent.visualizeUrl} className="wt-viz-up-link" aria-label={`Up to ${directParent.title}`}>
              <i className="fa fa-arrow-up" aria-hidden="true"></i> {directParent.title}
            </Link>
          ) : null}
          <Link to="/visualize" className="wt-viz-root-link" aria-label="Root view">
            <i className="fa fa-home" aria-hidden="true"></i>
            <span className="wt-viz-root-label">Root view</span>
          </Link>
        </div> : null}
      </div>

      {graphContext.hierarchyContextUnavailable ? (
        <Alert type="warning">
          <strong>Parent context unavailable</strong>. This graph shows the current topic and available children only.
        </Alert>
      ) : null}

      <KnowledgeGraph
        graph={graphContext.graph}
        theme={theme}
        activeNode={activeNode}
        onNodeSelected={selectGraphNode}
        onNodeRecenter={recenterGraphNode}
        onOpenNode={openGraphNode}
        onNavigateUp={directParent ? () => navigate(directParent.visualizeUrl) : undefined}
        upLabel={directParent ? `Up to ${directParent.title}` : undefined}
      />
    </div>
  );
};

export default VisualizePage;
