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
  x: number;
  y: number;
  size: number;
  color: string;
  type: 'root' | 'topic' | 'entry';
  kind?: string;
  url?: string;
  topicId?: string;
};

type GraphEdge = {
  from: string;
  to: string;
};

type GraphPosition = {
  x: number;
  y: number;
};

type DragState = {
  nodeId: string;
  offsetX: number;
  offsetY: number;
};

const ROOT_NODE_ID = 'root';

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

const VisualizePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<HomeDataResponse | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragResetTimeoutRef = useRef<number | null>(null);
  const [graphSize, setGraphSize] = useState({ width: 960, height: 620 });
  const [positionOverrides, setPositionOverrides] = useState<Record<string, GraphPosition>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);

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

    const updateSize = () => {
      const nextWidth = clamp(Math.floor(element.clientWidth), 320, 1800);
      const nextHeight = clamp(isFullscreen ? window.innerHeight - 24 : Math.floor(nextWidth * 0.62), 420, 980);
      setGraphSize({
        width: nextWidth,
        height: nextHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
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

  const baseGraph = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const topicById = new Map<string, GraphNode>();

    const width = graphSize.width;
    const height = graphSize.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const topicRadius = Math.max(130, Math.min(width, height) * 0.3);
    const entryRadius = Math.max(150, Math.min(width, height) * 0.42);

    nodes.push({
      id: ROOT_NODE_ID,
      label: 'Wikitruth',
      x: centerX,
      y: centerY,
      size: 20,
      color: '#f0ad4e',
      type: 'root',
    });

    const topicNodes = topics.slice(0, 14);
    topicNodes.forEach((topic, index) => {
      const theta = (2 * Math.PI * index) / Math.max(topicNodes.length, 1);
      const id = String(topic._id);
      const node: GraphNode = {
        id: id,
        label: shortenLabel(String(topic.title || '(Untitled topic)')),
        x: centerX + Math.cos(theta) * topicRadius,
        y: centerY + Math.sin(theta) * topicRadius,
        size: 16,
        color: selectedTopicId === id ? '#d26911' : '#FB7E81',
        type: 'topic',
      };
      nodes.push(node);
      topicById.set(id, node);
      edges.push({ from: ROOT_NODE_ID, to: id });
    });

    if (selectedTopicId) {
      const parentTopicNode = topicById.get(selectedTopicId);
      const anchorX = parentTopicNode?.x ?? centerX;
      const anchorY = parentTopicNode?.y ?? centerY;
      const entries = topicRelatedEntries.slice(0, 24);

      entries.forEach(({ kind, entry }, index) => {
        const theta = (2 * Math.PI * index) / Math.max(entries.length, 1);
        const id = `${kind}-${String(entry._id)}`;
        const node: GraphNode = {
          id: id,
          label: shortenLabel(String(entry.title || '(Untitled entry)')),
          x: anchorX + Math.cos(theta) * entryRadius,
          y: anchorY + Math.sin(theta) * entryRadius,
          size: 12,
          color: nodeColor(kind),
          type: 'entry',
          kind: kind,
          url: renderEntryUrl(entry, kind),
          topicId: selectedTopicId,
        };
        nodes.push(node);
        edges.push({ from: selectedTopicId, to: id });
      });
    }

    return { nodes, edges };
  }, [graphSize.height, graphSize.width, selectedTopicId, topicRelatedEntries, topics]);

  useEffect(() => {
    const validNodeIds = new Set(baseGraph.nodes.map((node) => node.id));
    setPositionOverrides((previous) => {
      let changed = false;
      const next: Record<string, GraphPosition> = {};

      Object.entries(previous).forEach(([nodeId, position]) => {
        if (validNodeIds.has(nodeId)) {
          next[nodeId] = position;
        } else {
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [baseGraph.nodes]);

  useEffect(() => {
    return () => {
      if (dragResetTimeoutRef.current !== null) {
        window.clearTimeout(dragResetTimeoutRef.current);
      }
    };
  }, []);

  const graph = useMemo(() => {
    return {
      edges: baseGraph.edges,
      nodes: baseGraph.nodes.map((node) => {
        const override = positionOverrides[node.id];
        if (!override) {
          return node;
        }
        return {
          ...node,
          x: override.x,
          y: override.y,
        };
      }),
    };
  }, [baseGraph.edges, baseGraph.nodes, positionOverrides]);

  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graph.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graph.nodes]);

  const getPointerPosition = (clientX: number, clientY: number): GraphPosition | null => {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleNodePointerDown = (event: React.PointerEvent<SVGGElement>, node: GraphNode) => {
    if (event.button !== 0) {
      return;
    }
    const pointer = getPointerPosition(event.clientX, event.clientY);
    if (!pointer) {
      return;
    }

    setDragState({
      nodeId: node.id,
      offsetX: pointer.x - node.x,
      offsetY: pointer.y - node.y,
    });
    dragMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleGraphPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState) {
      return;
    }

    const pointer = getPointerPosition(event.clientX, event.clientY);
    if (!pointer) {
      return;
    }

    const nextX = clamp(pointer.x - dragState.offsetX, 18, graphSize.width - 18);
    const nextY = clamp(pointer.y - dragState.offsetY, 18, graphSize.height - 18);

    setPositionOverrides((previous) => ({
      ...previous,
      [dragState.nodeId]: {
        x: nextX,
        y: nextY,
      },
    }));

    dragMovedRef.current = true;
  };

  const handleGraphPointerUp = () => {
    if (!dragState) {
      return;
    }

    setDragState(null);

    if (dragMovedRef.current) {
      suppressClickRef.current = true;
      if (dragResetTimeoutRef.current !== null) {
        window.clearTimeout(dragResetTimeoutRef.current);
      }
      dragResetTimeoutRef.current = window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 120);
    }
  };

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
        <p>Click topic nodes to expand connected entries. Double-click entry nodes to open them.</p>
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

      <div className={`vis-container${isFullscreen ? ' fullscreen' : ''}`} ref={graphContainerRef}>
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
          style={{
            backgroundColor: '#eee',
            borderRadius: '5px',
            width: '100%',
            height: `${graphSize.height}px`,
            minHeight: '500px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <svg
            ref={svgRef}
            width={graphSize.width}
            height={graphSize.height}
            role="img"
            aria-label="Knowledge graph"
            onPointerMove={handleGraphPointerMove}
            onPointerUp={handleGraphPointerUp}
            onPointerLeave={handleGraphPointerUp}
            style={{ touchAction: 'none' }}
          >
            {graph.edges.map((edge) => {
              const source = nodeById.get(edge.from);
              const target = nodeById.get(edge.to);
              if (!source || !target) {
                return null;
              }
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#95a5a6"
                  strokeWidth={edge.from === ROOT_NODE_ID ? 2 : 1.5}
                  strokeOpacity={0.7}
                />
              );
            })}
            {graph.nodes.map((node) => (
              <g
                key={node.id}
                onPointerDown={(event) => handleNodePointerDown(event, node)}
                onClick={() => {
                  if (suppressClickRef.current) {
                    return;
                  }
                  if (node.type === 'topic') {
                    setSelectedTopicId(node.id);
                  } else if (node.type === 'entry' && node.url) {
                    navigate(node.url);
                  } else if (node.type === 'root') {
                    setSelectedTopicId('');
                  }
                }}
                onDoubleClick={() => {
                  if (suppressClickRef.current) {
                    return;
                  }
                  if (node.type === 'entry' && node.url) {
                    navigate(node.url);
                  }
                }}
                style={{
                  cursor:
                    dragState?.nodeId === node.id
                      ? 'grabbing'
                      : node.type === 'entry' || node.type === 'topic'
                        ? 'grab'
                        : 'default',
                }}
              >
                <circle cx={node.x} cy={node.y} r={node.size} fill={node.color} stroke="#fff" strokeWidth={2} />
                <text
                  x={node.x}
                  y={node.y + node.size + 14}
                  textAnchor="middle"
                  fill="#2c3e50"
                  fontSize={node.type === 'entry' ? 11 : 12}
                  fontWeight={node.type === 'topic' && selectedTopicId === node.id ? 700 : 500}
                >
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

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
