import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
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
  const [outline, setOutline] = useState<OutlineTreeResponse | null>(null);
  const [activeNode, setActiveNode] = useState<VisualizeGraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          ? await apiService.getOutlineTree(selectedTopicId, 2, { ancestorDepth: 2, childLimit: 8 })
          : await apiService.getOutlineTree(undefined, 1, { childLimit: 5, rootLimit: 20 });
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
  }, [selectedTopicId]);

  const trees = useMemo<OutlineTreeNode[]>(() => {
    if (outline?.tree) return [outline.tree];
    return outline?.trees || [];
  }, [outline]);

  const graphContext = useMemo(
    () => buildVisualizeGraphContext(trees, outline?.ancestors || [], selectedTopicId),
    [outline?.ancestors, selectedTopicId, trees],
  );

  useEffect(() => {
    setActiveNode(
      graphContext.graph.nodes.find((node) => node.id === graphContext.graph.focusNodeId) || null,
    );
  }, [graphContext]);

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

  const directParent = graphContext.directParent;
  const scopeDescription = selectedTopicId ? 'Current topic + 2 levels below' : 'Root topics + 1 level below';

  return (
    <div className="wt-visualize-page">
      <div className="wt-viz-heading-row">
        <h1 className="wt-viz-title"><i className="fa fa-snowflake-o" aria-hidden="true"></i> Visualize</h1>
        <details className="wt-viz-help">
          <summary aria-label="How to use the knowledge graph"><i className="fa fa-question-circle" aria-hidden="true"></i></summary>
          <div>
            Tap a node to inspect it. Choose <strong>Center here</strong> to navigate through the hierarchy,
            or drag and zoom the graph to explore the current view.
          </div>
        </details>
      </div>

      <nav className="wt-viz-breadcrumb" aria-label="Graph path">
        <ol>
          {graphContext.breadcrumbs.map((crumb, index) => {
            const isCurrent = index === graphContext.breadcrumbs.length - 1;
            return (
              <li key={`${crumb.id}-${index}`}>
                {isCurrent ? <span aria-current="page">{crumb.title}</span> : <Link to={crumb.visualizeUrl}>{crumb.title}</Link>}
              </li>
            );
          })}
        </ol>
      </nav>

      <TopicSearch
        onSelect={(topic) => navigate(topicVisualizeUrl(topic))}
      />

      <div className="wt-viz-scope" aria-label="Loaded graph scope">
        <span className="wt-viz-scope-chip"><i className="fa fa-folder-open" aria-hidden="true"></i> {graphContext.topicCount} topics</span>
        <span className="wt-viz-scope-copy">{scopeDescription}</span>
        {outline?.truncated ? (
          <span className="wt-viz-scope-warning" title="Some branches contain more topics than this view shows">
            <i className="fa fa-info-circle" aria-hidden="true"></i> Bounded view
          </span>
        ) : null}
        {selectedTopicId ? (
          <Link to="/visualize" className="wt-viz-root-link"><i className="fa fa-home" aria-hidden="true"></i> Root view</Link>
        ) : null}
      </div>

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
