import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import type { HomeDataResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';

type GraphNode = {
  id: string;
  label: string;
  title: string;
  value: number;
  color: string;
  shape?: string;
  type: 'root' | 'topic' | 'entry';
  url?: string;
};

type GraphEdge = {
  from: string;
  to: string;
  width?: number;
};

type GraphPayload = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

const ROOT_NODE_ID = 'root';

let visLoadPromise: Promise<void> | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function shortenLabel(value: string, max = 26): string {
  const cleaned = value.trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1)}…`;
}

function nodeColor(kind: string | undefined): string {
  switch ((kind || '').toLowerCase()) {
    case 'argument':
      return '#7BE141';
    case 'question':
      return '#5cb85c';
    case 'issue':
      return '#f0ad4e';
    case 'opinion':
      return '#5bc0de';
    case 'artifact':
      return '#95a5a6';
    case 'answer':
      return '#337ab7';
    default:
      return '#FB7E81';
  }
}

function ensureVisAssetsLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if ((window as any).vis) {
    return Promise.resolve();
  }

  if (visLoadPromise) {
    return visLoadPromise;
  }

  visLoadPromise = new Promise((resolve, reject) => {
    const cssId = 'wt-vis-network-css';
    if (!document.getElementById(cssId)) {
      const css = document.createElement('link');
      css.id = cssId;
      css.rel = 'stylesheet';
      css.href = '/components/vis/dist/vis-network.min.css';
      document.head.appendChild(css);
    }

    const scriptId = 'wt-vis-network-js';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as any).vis) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load vis-network script')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = '/components/vis/dist/vis.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load vis-network script'));
    document.body.appendChild(script);
  });

  return visLoadPromise;
}

const VisualizePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<HomeDataResponse | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<any>(null);
  const [graphHeight, setGraphHeight] = useState(560);

  useEffect(() => {
    const fetchVisualizationData = async () => {
      try {
        setLoading(true);
        const result = await apiService.getHomeData();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load visualization data');
      } finally {
        setLoading(false);
      }
    };

    void fetchVisualizationData();
  }, []);

  useEffect(() => {
    const element = graphContainerRef.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      const width = clamp(Math.floor(element.clientWidth), 320, 1800);
      const nextHeight = clamp(isFullscreen ? window.innerHeight - 24 : Math.floor(width * 0.62), 420, 980);
      setGraphHeight(nextHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(element);
    window.addEventListener('resize', updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [isFullscreen]);

  const topics = (data?.topics || []) as LegacyEntity[];
  const argumentsList = (data?.arguments || []) as LegacyEntity[];
  const questions = (data?.questions || []) as LegacyEntity[];
  const issues = (data?.issues || []) as LegacyEntity[];
  const opinions = (data?.opinions || []) as LegacyEntity[];
  const artifacts = (data?.artifacts || []) as LegacyEntity[];
  const answers = (data?.answers || []) as LegacyEntity[];

  const selectedTopic = useMemo(
    () => topics.find((topic) => String(topic._id) === selectedTopicId) || null,
    [selectedTopicId, topics]
  );

  const topicRelatedEntries = useMemo(() => {
    if (!selectedTopicId) {
      return [];
    }

    const collections = [
      ...argumentsList.map((entry) => ({ kind: 'Argument', entry })),
      ...questions.map((entry) => ({ kind: 'Question', entry })),
      ...issues.map((entry) => ({ kind: 'Issue', entry })),
      ...opinions.map((entry) => ({ kind: 'Opinion', entry })),
      ...artifacts.map((entry) => ({ kind: 'Artifact', entry })),
      ...answers.map((entry) => ({ kind: 'Answer', entry })),
    ];

    return collections.filter(({ entry }) => {
      const ownerId = String(entry.ownerId || '');
      const topicId = String(entry.topicId || '');
      const parentTopicId = String(entry.parentId || '');
      return ownerId === selectedTopicId || topicId === selectedTopicId || parentTopicId === selectedTopicId;
    });
  }, [argumentsList, artifacts, answers, issues, opinions, questions, selectedTopicId]);

  const renderEntryUrl = (entry: LegacyEntity, kind: string) => {
    const id = String(entry._id || '');
    const friendlyUrl = encodeURIComponent(String(entry.friendlyUrl || ''));
    switch (kind) {
      case 'Argument':
        return `/arguments/entry/${friendlyUrl}/${id}`;
      case 'Question':
        return `/questions/entry/${friendlyUrl}/${id}`;
      case 'Issue':
        return `/issues/entry/${friendlyUrl}/${id}`;
      case 'Opinion':
        return `/opinions/entry/${friendlyUrl}/${id}`;
      case 'Artifact':
        return `/artifacts/entry/${friendlyUrl}/${id}`;
      case 'Answer':
        return `/answers/entry/${id}`;
      default:
        return '/';
    }
  };

  const graph = useMemo((): GraphPayload => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    nodes.push({
      id: ROOT_NODE_ID,
      label: 'Wikitruth',
      title: 'Wikitruth',
      value: 28,
      color: '#f0ad4e',
      type: 'root',
    });

    const topicNodes = topics.slice(0, 14);
    topicNodes.forEach((topic) => {
      const id = String(topic._id);
      nodes.push({
        id: id,
        label: shortenLabel(String(topic.title || '(Untitled topic)')),
        title: String(topic.title || '(Untitled topic)'),
        value: selectedTopicId === id ? 24 : 18,
        color: selectedTopicId === id ? '#d26911' : '#FB7E81',
        type: 'topic',
      });
      edges.push({ from: ROOT_NODE_ID, to: id, width: 3 });
    });

    if (selectedTopicId) {
      topicRelatedEntries.slice(0, 24).forEach(({ kind, entry }) => {
        const nodeId = `${kind}-${String(entry._id)}`;
        nodes.push({
          id: nodeId,
          label: shortenLabel(String(entry.title || '(Untitled entry)')),
          title: `${kind}: ${String(entry.title || '(Untitled entry)')}`,
          value: 13,
          color: nodeColor(kind),
          shape: kind === 'Argument' ? 'square' : 'dot',
          type: 'entry',
          url: renderEntryUrl(entry, kind),
        });
        edges.push({ from: selectedTopicId, to: nodeId, width: 2 });
      });
    }

    return { nodes, edges };
  }, [selectedTopicId, topicRelatedEntries, topics]);

  useEffect(() => {
    let cancelled = false;

    const mountNetwork = async () => {
      if (!graphContainerRef.current) {
        return;
      }

      try {
        setNetworkError(null);
        await ensureVisAssetsLoaded();
        if (cancelled || !graphContainerRef.current) {
          return;
        }

        const vis = (window as any).vis;
        if (!vis || !vis.Network || !vis.DataSet) {
          throw new Error('vis-network library is unavailable');
        }

        if (networkRef.current) {
          networkRef.current.destroy();
          networkRef.current = null;
        }

        const nodes = new vis.DataSet(
          graph.nodes.map((node) => ({
            id: node.id,
            label: node.label,
            title: node.title,
            value: node.value,
            color: node.color,
            shape: node.shape || 'dot',
            font: {
              size: node.type === 'entry' ? 12 : 14,
              color: '#2c3e50',
            },
          }))
        );

        const edges = new vis.DataSet(
          graph.edges.map((edge) => ({
            from: edge.from,
            to: edge.to,
            width: edge.width || 2,
            color: {
              color: '#95a5a6',
              opacity: 0.75,
            },
            smooth: {
              type: 'dynamic',
              roundness: 0.45,
            },
          }))
        );

        const network = new vis.Network(
          graphContainerRef.current,
          { nodes, edges },
          {
            autoResize: true,
            physics: {
              enabled: true,
              barnesHut: {
                gravitationalConstant: -2200,
                centralGravity: 0.3,
                springLength: 96,
                springConstant: 0.04,
                damping: 0.07,
              },
              stabilization: false,
              minVelocity: 0.1,
            },
            interaction: {
              dragNodes: true,
              dragView: true,
              zoomView: true,
              hover: true,
              navigationButtons: true,
              keyboard: true,
            },
            nodes: {
              borderWidth: 2,
              scaling: {
                min: 12,
                max: 34,
              },
            },
          }
        );

        networkRef.current = network;
        (window as any).__wtNetwork = network;

        network.on('click', (params: any) => {
          const nodeId = String(params?.nodes?.[0] || '');
          if (!nodeId) {
            return;
          }

          if (nodeId === ROOT_NODE_ID) {
            setSelectedTopicId('');
            return;
          }

          const clicked = graph.nodes.find((node) => node.id === nodeId);
          if (!clicked) {
            return;
          }

          if (clicked.type === 'topic') {
            setSelectedTopicId(nodeId);
          } else if (clicked.type === 'entry' && clicked.url) {
            navigate(clicked.url);
          }
        });

        network.on('doubleClick', (params: any) => {
          const nodeId = String(params?.nodes?.[0] || '');
          if (!nodeId) {
            return;
          }

          const clicked = graph.nodes.find((node) => node.id === nodeId);
          if (clicked?.type === 'entry' && clicked.url) {
            navigate(clicked.url);
          }
        });

        // Ensure the network keeps simulating briefly after drag for legacy-like momentum.
        network.on('dragEnd', () => {
          network.startSimulation();
        });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to initialize visualization graph';
          setNetworkError(message);
        }
      }
    };

    void mountNetwork();

    return () => {
      cancelled = true;
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
      if (typeof window !== 'undefined') {
        delete (window as any).__wtNetwork;
      }
    };
  }, [graph, navigate]);

  if (loading) {
    return <LoadingSpinner message="Loading visualization..." />;
  }

  if (error) {
    return <Alert type="danger">Failed to load visualization: {error}</Alert>;
  }

  const metrics = [
    { key: 'topics', title: 'Topics', count: topics.length, icon: 'folder-open', color: 'text-success-x' },
    { key: 'arguments', title: 'Arguments', count: argumentsList.length, icon: 'flash', color: 'text-primary' },
    { key: 'questions', title: 'Questions', count: questions.length, icon: 'question-circle', color: 'text-info' },
    { key: 'issues', title: 'Issues', count: issues.length, icon: 'exclamation-triangle', color: 'text-warning' },
    { key: 'opinions', title: 'Opinions', count: opinions.length, icon: 'comment', color: 'text-info' },
    { key: 'artifacts', title: 'Artifacts', count: artifacts.length, icon: 'paperclip', color: 'text-muted' },
    { key: 'answers', title: 'Answers', count: answers.length, icon: 'list-alt', color: 'text-primary' },
  ];

  return (
    <div>
      <h1 className="page-header wt-header">
        <i className="fa fa-snowflake-o"></i> Visualize
      </h1>

      <div className="alert alert-info" role="note">
        <h4><i className="fa fa-info-circle"></i> Knowledge Graph Explorer</h4>
        <p>Drag nodes to reposition them. The network uses legacy-style physics with momentum and bounce.</p>
      </div>

      <div className="row">
        {metrics.map((metric) => (
          <div key={metric.key} className="col-sm-6 col-md-3" style={{ marginBottom: '12px' }}>
            <div className="panel panel-default">
              <div className="panel-body">
                <div className="text-muted" style={{ marginBottom: '4px' }}>
                  <i className={`fa fa-${metric.icon} ${metric.color}`} aria-hidden="true"></i> {metric.title}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{metric.count}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`vis-container${isFullscreen ? ' fullscreen' : ''}`}>
        <div className="wt-viz-btn-cont" style={{ left: '10px', top: '8px' }}>
          <div className="wt-viz-btn explore">
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                if (!selectedTopic) {
                  navigate('/topics');
                  return;
                }
                navigate(`/topics/entry/${encodeURIComponent(String(selectedTopic.friendlyUrl || ''))}/${encodeURIComponent(String(selectedTopic._id))}`);
              }}
              style={{ color: '#fff', textDecoration: 'none' }}
            >
              {selectedTopic ? shortenLabel(String(selectedTopic.title || 'Explore topic'), 30) : 'Explore Topics'} <i className="fa fa-arrow-circle-right"></i>
            </button>
          </div>
        </div>
        <div className="wt-viz-btn-cont" style={{ right: '15px', top: '8px' }}>
          <div className="wt-viz-btn toggle-fs">
            <button
              type="button"
              className="btn btn-link"
              onClick={() => setIsFullscreen((prev) => !prev)}
              title="Toggle Fullscreen"
              style={{ color: '#fff', textDecoration: 'none' }}
            >
              <i className={`glyphicon ${isFullscreen ? 'glyphicon-resize-small' : 'glyphicon-resize-full'}`}></i>
            </button>
          </div>
        </div>
        <div
          id="mynetwork"
          ref={graphContainerRef}
          style={{
            backgroundColor: '#eee',
            borderRadius: '5px',
            width: '100%',
            height: `${graphHeight}px`,
            minHeight: '500px',
            position: 'relative',
            overflow: 'hidden',
          }}
        />
      </div>

      {networkError && (
        <div style={{ marginTop: '14px' }}>
          <Alert type="danger">Visualization renderer failed: {networkError}</Alert>
        </div>
      )}

      {selectedTopic && (
        <div className="panel panel-default" style={{ marginTop: '18px' }}>
          <div className="panel-heading">
            <h3 className="panel-title">Connections for "{selectedTopic.title}"</h3>
          </div>
          <div className="panel-body">
            {topicRelatedEntries.length === 0 ? (
              <Alert type="warning">No related entries found for this topic in the current dataset.</Alert>
            ) : (
              <ul className="list-group">
                {topicRelatedEntries.map(({ kind, entry }) => (
                  <li key={`${kind}-${entry._id}`} className="list-group-item">
                    <span className="label label-default" style={{ marginRight: '8px' }}>{kind}</span>
                    <Link to={renderEntryUrl(entry, kind)}>{entry.title || '(Untitled)'}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualizePage;
