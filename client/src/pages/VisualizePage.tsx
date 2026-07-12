import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/api';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import type { HomeDataResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';

interface VisDataSet {
  add(items: unknown): void;
  clear(): void;
}

interface VisNetworkClickParams {
  nodes?: Array<string | number>;
  edges?: Array<string | number>;
  pointer?: { canvas?: { x: number; y: number } };
  event?: Event;
}

interface VisNetwork {
  destroy(): void;
  on(event: string, handler: (params: VisNetworkClickParams) => void): void;
  setOptions(options: Record<string, unknown>): void;
  getPosition(nodeId: string): { x: number; y: number };
  startSimulation(): void;
  stopSimulation(): void;
}

interface VisNetworkConstructor {
  new (
    container: HTMLElement,
    data: { nodes: VisDataSet; edges: VisDataSet },
    options: Record<string, unknown>,
  ): VisNetwork;
}

interface VisDataSetConstructor {
  new (items: unknown[]): VisDataSet;
}

interface VisLibrary {
  Network: VisNetworkConstructor;
  DataSet: VisDataSetConstructor;
}

interface VisualizeWindow extends Window {
  vis?: VisLibrary;
  __wtNetwork?: VisNetwork;
}

function getVisWindow(): VisualizeWindow | undefined {
  return typeof window !== 'undefined' ? (window as VisualizeWindow) : undefined;
}

type GraphNode = {
  id: string;
  label: string;
  title: string;
  value: number;
  color: string;
  shape?: string;
  type: 'root' | 'topic' | 'entry';
  url?: string;
  exploreUrl?: string;
  visualizeUrl?: string;
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
const FULLSCREEN_PREF_KEY = 'wt.visualize.fullscreen';

let visLoadPromise: Promise<void> | null = null;

const DEFAULT_PHYSICS = {
  enabled: true,
  solver: 'barnesHut' as const,
  barnesHut: {
    gravitationalConstant: -2800,
    centralGravity: 0.22,
    springLength: 120,
    springConstant: 0.035,
    damping: 0.14,
    avoidOverlap: 0.12,
  },
  stabilization: {
    enabled: true,
    iterations: 220,
    updateInterval: 25,
    fit: true,
  },
  minVelocity: 0.2,
  maxVelocity: 30,
  adaptiveTimestep: true,
};

const DRAG_PHYSICS = {
  ...DEFAULT_PHYSICS,
  barnesHut: {
    ...DEFAULT_PHYSICS.barnesHut,
    springConstant: 0.038,
    damping: 0.095,
  },
  minVelocity: 0.08,
  maxVelocity: 42,
};

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
  const visWindow = getVisWindow();
  if (!visWindow) {
    return Promise.resolve();
  }

  if (visWindow.vis) {
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
      css.href = '/vendor/vis/dist/vis-network.min.css';
      document.head.appendChild(css);
    }

    const scriptId = 'wt-vis-network-js';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (visWindow.vis) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load vis-network script')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = '/vendor/vis/dist/vis.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load vis-network script'));
    document.body.appendChild(script);
  });

  return visLoadPromise;
}

const VisualizePage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const [data, setData] = useState<HomeDataResponse | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(FULLSCREEN_PREF_KEY) === '1';
  });
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<VisNetwork | null>(null);
  const dragMomentumTimerRef = useRef<number | null>(null);
  const dragMetaRef = useRef<{ startedAt: number; nodeId: string; position: { x: number; y: number } | null }>({
    startedAt: 0,
    nodeId: '',
    position: null,
  });
  const [graphHeight, setGraphHeight] = useState(560);
  const [nodeAction, setNodeAction] = useState<{
    label: string;
    exploreUrl: string;
    visualizeUrl?: string;
  }>({
    label: 'Topics',
    exploreUrl: '/topics',
    visualizeUrl: '/visualize',
  });

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
    const searchTopic =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('topic') : null;
    const requestedTopicId = decodeURIComponent(String(params.id || searchTopic || '')).trim();
    if (requestedTopicId) {
      setSelectedTopicId(requestedTopicId);
    }
  }, [params.id]);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(FULLSCREEN_PREF_KEY, isFullscreen ? '1' : '0');
    } catch (_error) {
      // Ignore localStorage failures (private mode / quota) and keep in-memory state only.
    }
  }, [isFullscreen]);

  const { topics, argumentsList, questions, issues, opinions, artifacts, answers } = useMemo(() => ({
    topics: (data?.topics || []) as LegacyEntity[],
    argumentsList: (data?.arguments || []) as LegacyEntity[],
    questions: (data?.questions || []) as LegacyEntity[],
    issues: (data?.issues || []) as LegacyEntity[],
    opinions: (data?.opinions || []) as LegacyEntity[],
    artifacts: (data?.artifacts || []) as LegacyEntity[],
    answers: (data?.answers || []) as LegacyEntity[],
  }), [data]);

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
      url: '/topics',
      exploreUrl: '/topics',
      visualizeUrl: '/visualize',
    });

    const topicNodes = topics.slice(0, 14);
    topicNodes.forEach((topic) => {
      const id = String(topic._id);
      const topicFriendly = encodeURIComponent(String(topic.friendlyUrl || topic._id || ''));
      const topicId = encodeURIComponent(id);
      const topicEntryUrl = `/topics/entry/${topicFriendly}/${topicId}`;
      const topicVisualizeUrl = `/visualize/topic/${topicFriendly}/${topicId}`;
      nodes.push({
        id: id,
        label: shortenLabel(String(topic.title || '(Untitled topic)')),
        title: String(topic.title || '(Untitled topic)'),
        value: selectedTopicId === id ? 24 : 18,
        color: selectedTopicId === id ? '#d26911' : '#FB7E81',
        type: 'topic',
        url: topicEntryUrl,
        exploreUrl: topicEntryUrl,
        visualizeUrl: topicVisualizeUrl,
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
          exploreUrl: renderEntryUrl(entry, kind),
        });
        edges.push({ from: selectedTopicId, to: nodeId, width: 2 });
      });
    }

    return { nodes, edges };
  }, [selectedTopicId, topicRelatedEntries, topics]);

  useEffect(() => {
    if (selectedTopic) {
      const topicFriendly = encodeURIComponent(String(selectedTopic.friendlyUrl || selectedTopic._id || ''));
      const topicId = encodeURIComponent(String(selectedTopic._id || ''));
      setNodeAction({
        label: String(selectedTopic.title || 'Topic'),
        exploreUrl: `/topics/entry/${topicFriendly}/${topicId}`,
        visualizeUrl: `/visualize/topic/${topicFriendly}/${topicId}`,
      });
      return;
    }

    setNodeAction({
      label: 'Topics',
      exploreUrl: '/topics',
      visualizeUrl: '/visualize',
    });
  }, [selectedTopic]);

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

        const visWindow = getVisWindow();
        const vis = visWindow?.vis;
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
            physics: DEFAULT_PHYSICS,
            interaction: {
              dragNodes: true,
              dragView: true,
              zoomView: true,
              hover: true,
              navigationButtons: true,
              keyboard: true,
              hideEdgesOnDrag: false,
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
        if (visWindow) {
          visWindow.__wtNetwork = network;
        }

        network.on('click', (params: VisNetworkClickParams) => {
          const nodeId = String(params?.nodes?.[0] || '');
          if (!nodeId) {
            setNodeAction({
              label: 'Topics',
              exploreUrl: '/topics',
              visualizeUrl: '/visualize',
            });
            return;
          }

          const clicked = graph.nodes.find((node) => node.id === nodeId);
          if (!clicked) {
            return;
          }

          setNodeAction({
            label: clicked.title || clicked.label || 'Explore',
            exploreUrl: clicked.exploreUrl || clicked.url || '/topics',
            visualizeUrl: clicked.visualizeUrl,
          });

          if (clicked.type === 'root') {
            setSelectedTopicId('');
            return;
          }

          if (clicked.type === 'topic') {
            setSelectedTopicId(nodeId);
          }
        });

        network.on('doubleClick', (params: VisNetworkClickParams) => {
          const nodeId = String(params?.nodes?.[0] || '');
          if (!nodeId) {
            return;
          }

          const clicked = graph.nodes.find((node) => node.id === nodeId);
          if (!clicked) {
            return;
          }

          if (clicked.type === 'entry' && clicked.exploreUrl) {
            navigate(clicked.exploreUrl);
            return;
          }

          if (clicked.type === 'topic' && clicked.visualizeUrl) {
            navigate(clicked.visualizeUrl);
            return;
          }

          if (clicked.type === 'root') {
            navigate('/visualize');
          }
        });

        network.on('dragStart', (params: VisNetworkClickParams) => {
          const nodeId = String(params?.nodes?.[0] || '');
          if (!nodeId) {
            dragMetaRef.current = {
              startedAt: Date.now(),
              nodeId: '',
              position: null,
            };
            return;
          }

          let startPosition: { x: number; y: number } | null = null;
          try {
            const position = network.getPosition(nodeId);
            if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
              startPosition = { x: position.x, y: position.y };
            }
          } catch (_error) {
            startPosition = null;
          }

          dragMetaRef.current = {
            startedAt: Date.now(),
            nodeId: nodeId,
            position: startPosition,
          };

          network.setOptions({ physics: DRAG_PHYSICS });
        });

        // Ensure the network keeps simulating briefly after drag for legacy-like momentum.
        network.on('dragEnd', () => {
          const dragDuration = Date.now() - dragMetaRef.current.startedAt;
          let dragDistance = 0;

          if (dragMetaRef.current.nodeId && dragMetaRef.current.position) {
            try {
              const endPosition = network.getPosition(dragMetaRef.current.nodeId);
              const deltaX = Number(endPosition?.x || 0) - dragMetaRef.current.position.x;
              const deltaY = Number(endPosition?.y || 0) - dragMetaRef.current.position.y;
              dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            } catch (_error) {
              dragDistance = 0;
            }
          }

          const momentumMs = clamp(
            Math.round(900 + dragDuration * 1.1 + dragDistance * 3),
            950,
            2600,
          );

          network.startSimulation();
          if (dragMomentumTimerRef.current !== null) {
            window.clearTimeout(dragMomentumTimerRef.current);
          }
          dragMomentumTimerRef.current = window.setTimeout(() => {
            network.stopSimulation();
            network.setOptions({ physics: DEFAULT_PHYSICS });
            dragMomentumTimerRef.current = null;
            dragMetaRef.current = { startedAt: 0, nodeId: '', position: null };
          }, momentumMs);
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
      if (dragMomentumTimerRef.current !== null) {
        window.clearTimeout(dragMomentumTimerRef.current);
        dragMomentumTimerRef.current = null;
      }
      if (typeof window !== 'undefined') {
        const visWindow = getVisWindow();
        if (visWindow) {
          delete visWindow.__wtNetwork;
        }
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

      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">Topics in Graph</h3>
        </div>
        <div className="panel-body">
          {topics.length === 0 ? (
            <p className="text-muted" style={{ marginBottom: 0 }}>No topics are currently available.</p>
          ) : (
            <div
              className="btn-group wt-topic-selector"
              role="group"
              aria-label="Select topic for graph details"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
            >
              {topics.slice(0, 14).map((topic) => {
                const topicId = String(topic._id || '');
                const isSelected = selectedTopicId === topicId;
                return (
                  <button
                    key={topicId}
                    type="button"
                    className={`btn wt-topic-selector-button ${isSelected ? 'btn-primary' : 'btn-default'}`}
                    style={{ marginBottom: '8px' }}
                    onClick={() => setSelectedTopicId(topicId)}
                  >
                    {String(topic.title || 'Untitled topic')}
                  </button>
                );
              })}
              {selectedTopicId && (
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => setSelectedTopicId('')}
                  style={{ marginBottom: '8px' }}
                >
                  Clear selection
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`vis-container${isFullscreen ? ' fullscreen' : ''}`}>
        <div className="wt-viz-btn-cont" style={{ left: '10px', top: '8px' }}>
          <div className="wt-viz-btn explore">
            <button
              type="button"
              className="btn btn-link"
              onClick={() => navigate(nodeAction.exploreUrl)}
              style={{ color: '#fff', textDecoration: 'none' }}
            >
              {shortenLabel(String(nodeAction.label || 'Explore'), 30)} <i className="fa fa-arrow-circle-right"></i>
            </button>
          </div>
        </div>
        {nodeAction.visualizeUrl ? (
          <div className="wt-viz-btn-cont" style={{ left: '10px', top: '48px' }}>
            <div className="wt-viz-btn visualize">
              <button
                type="button"
                className="btn btn-link"
                onClick={() => navigate(nodeAction.visualizeUrl || '/visualize')}
                style={{ color: '#fff', textDecoration: 'none' }}
              >
                Visualize <i className="fa fa-snowflake-o"></i>
              </button>
            </div>
          </div>
        ) : null}
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
