import React, { useEffect, useRef, useState } from 'react';
import type { Theme } from '../../context/ThemeContext';
import type { VisualizeGraphNode, VisualizeGraphPayload } from './graphModel';

interface VisDataSet {
  add(items: unknown): void;
  clear(): void;
}

interface VisNetworkClickParams {
  nodes?: Array<string | number>;
}

interface VisNetwork {
  destroy(): void;
  on(event: string, handler: (params: VisNetworkClickParams) => void): void;
  fit(options?: Record<string, unknown>): void;
  focus(nodeId: string, options?: Record<string, unknown>): void;
  getScale(): number;
  moveTo(options: Record<string, unknown>): void;
}

interface VisLibrary {
  Network: new (
    container: HTMLElement,
    data: { nodes: VisDataSet; edges: VisDataSet },
    options: Record<string, unknown>,
  ) => VisNetwork;
  DataSet: new (items: unknown[]) => VisDataSet;
}

interface VisualizeWindow extends Window {
  vis?: VisLibrary;
  __wtNetwork?: VisNetwork;
}

interface KnowledgeGraphProps {
  graph: VisualizeGraphPayload;
  theme: Theme;
  activeNode: VisualizeGraphNode | null;
  upLabel?: string;
  onNodeSelected: (node: VisualizeGraphNode) => void;
  onNodeRecenter: (node: VisualizeGraphNode) => void;
  onOpenNode: (node: VisualizeGraphNode) => void;
  onNavigateUp?: () => void;
}

let visLoadPromise: Promise<void> | null = null;

function getVisWindow(): VisualizeWindow | undefined {
  return typeof window !== 'undefined' ? (window as VisualizeWindow) : undefined;
}

function ensureVisAssetsLoaded(): Promise<void> {
  const visWindow = getVisWindow();
  if (!visWindow || visWindow.vis) return Promise.resolve();
  if (visLoadPromise) return visLoadPromise;

  visLoadPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('wt-vis-network-css')) {
      const css = document.createElement('link');
      css.id = 'wt-vis-network-css';
      css.rel = 'stylesheet';
      css.href = '/vendor/vis/dist/vis-network.min.css';
      document.head.appendChild(css);
    }

    const existingScript = document.getElementById('wt-vis-network-js') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load the graph renderer')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'wt-vis-network-js';
    script.src = '/vendor/vis/dist/vis.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load the graph renderer'));
    document.body.appendChild(script);
  });

  return visLoadPromise;
}

function nodeColors(node: VisualizeGraphNode, theme: Theme) {
  if (node.role === 'current') {
    return {
      background: theme === 'dark' ? '#f5a623' : '#f0ad4e',
      border: theme === 'dark' ? '#ffd27a' : '#b76e00',
      highlight: { background: '#ffbd45', border: '#fff0c7' },
    };
  }
  if (node.role === 'up') {
    return {
      background: theme === 'dark' ? '#d33b88' : '#cc317c',
      border: theme === 'dark' ? '#ff95c9' : '#8f1f55',
      highlight: { background: '#e6539b', border: '#ffd9eb' },
    };
  }
  if (node.level === 1) {
    return {
      background: theme === 'dark' ? '#ff747c' : '#fb7e81',
      border: theme === 'dark' ? '#ffc3c6' : '#c7494f',
      highlight: { background: '#ff9399', border: '#fff0f1' },
    };
  }
  return {
    background: theme === 'dark' ? '#6faee8' : '#80a6cd',
    border: theme === 'dark' ? '#c5e3ff' : '#3d7fbe',
    highlight: { background: '#91c7f7', border: '#edf7ff' },
  };
}

function nodeValue(node: VisualizeGraphNode): number {
  if (node.role === 'current') return 30;
  return Math.abs(node.level) === 1 ? 20 : 11;
}

function edgeColor(source: VisualizeGraphNode | undefined, theme: Theme): string {
  if (source?.role === 'current') return theme === 'dark' ? '#d89b32' : '#bb7410';
  if (source?.role === 'up') return theme === 'dark' ? '#d84a91' : '#b92269';
  if (source?.level === 1) return theme === 'dark' ? '#df656d' : '#d35d64';
  return theme === 'dark' ? '#5799d4' : '#5c95cf';
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  graph,
  theme,
  activeNode,
  upLabel,
  onNodeSelected,
  onNodeRecenter,
  onOpenNode,
  onNavigateUp,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<VisNetwork | null>(null);
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      if (!containerRef.current) return;
      try {
        setRendererError(null);
        await ensureVisAssetsLoaded();
        if (cancelled || !containerRef.current) return;

        const visWindow = getVisWindow();
        const vis = visWindow?.vis;
        if (!vis) throw new Error('The graph renderer is unavailable');

        networkRef.current?.destroy();
        const canvasColor = theme === 'dark' ? '#111a24' : '#f3f6f8';
        const fontColor = theme === 'dark' ? '#e8edf2' : '#24313d';
        const focusNode = graph.nodes.find((node) => node.id === graph.focusNodeId);
        const isContextualView = focusNode?.type === 'topic';
        const graphNodeById = new Map(graph.nodes.map((node) => [node.id, node]));

        const nodes = new vis.DataSet(graph.nodes.map((node) => ({
          id: node.id,
          label: node.label,
          title: node.title,
          value: nodeValue(node),
          shape: 'dot',
          color: nodeColors(node, theme),
          font: {
            color: fontColor,
            size: node.role === 'current' ? 17 : Math.abs(node.level) === 1 ? 14 : 12,
            face: 'Arial',
            strokeWidth: 3,
            strokeColor: canvasColor,
          },
          borderWidth: node.role === 'current' ? 3 : 2,
        })));

        const edges = new vis.DataSet(graph.edges.map((edge) => ({
          from: edge.from,
          to: edge.to,
          width: edge.width,
          arrows: { to: { enabled: false } },
          dashes: false,
          color: {
            color: edgeColor(graphNodeById.get(edge.from), theme),
            opacity: 0.92,
          },
          smooth: { enabled: true, type: 'dynamic', roundness: 0.25 },
        })));

        const network = new vis.Network(containerRef.current, { nodes, edges }, {
          autoResize: true,
          layout: { improvedLayout: true, randomSeed: 7 },
          physics: {
            enabled: true,
            solver: 'barnesHut',
            barnesHut: {
              gravitationalConstant: -2600,
              centralGravity: 0.22,
              springLength: 120,
              springConstant: 0.035,
              damping: 0.14,
              avoidOverlap: 0.2,
            },
            stabilization: { enabled: true, iterations: 240, fit: false },
            minVelocity: 0.2,
          },
          interaction: {
            dragNodes: true,
            dragView: true,
            zoomView: true,
            hover: true,
            navigationButtons: false,
            keyboard: true,
          },
          nodes: { scaling: { min: 12, max: 42 } },
        });

        networkRef.current = network;
        if (visWindow) visWindow.__wtNetwork = network;
        network.on('click', (params) => {
          const nodeId = String(params.nodes?.[0] || '');
          const node = graph.nodes.find((candidate) => candidate.id === nodeId);
          if (node) onNodeSelected(node);
        });
        network.on('doubleClick', (params) => {
          const nodeId = String(params.nodes?.[0] || '');
          const node = graph.nodes.find((candidate) => candidate.id === nodeId);
          if (node) onNodeRecenter(node);
        });
        network.on('stabilizationIterationsDone', () => {
          if (networkRef.current !== network) return;
          network.fit({ animation: { duration: 260, easingFunction: 'easeInOutQuad' } });
          if (isContextualView && network.getScale() < 0.5) {
            network.focus(graph.focusNodeId, {
              scale: 0.5,
              animation: { duration: 300, easingFunction: 'easeInOutQuad' },
            });
          }
        });
      } catch (error) {
        if (!cancelled) {
          setRendererError(error instanceof Error ? error.message : 'Failed to initialize the graph');
        }
      }
    };

    void mount();
    return () => {
      cancelled = true;
      networkRef.current?.destroy();
      networkRef.current = null;
      const visWindow = getVisWindow();
      if (visWindow) delete visWindow.__wtNetwork;
    };
  }, [graph, onNodeRecenter, onNodeSelected, theme]);

  const changeZoom = (delta: number) => {
    const network = networkRef.current;
    if (!network) return;
    const nextScale = Math.min(2.5, Math.max(0.25, network.getScale() + delta));
    network.moveTo({ scale: nextScale, animation: { duration: 180, easingFunction: 'easeInOutQuad' } });
  };

  const centerNode = (node: VisualizeGraphNode) => {
    if (node.id !== graph.focusNodeId) {
      onNodeRecenter(node);
      return;
    }
    networkRef.current?.focus(node.id, {
      scale: Math.max(networkRef.current.getScale(), 0.78),
      animation: { duration: 220, easingFunction: 'easeInOutQuad' },
    });
  };

  return (
    <section className={`wt-knowledge-graph${isFullscreen ? ' is-fullscreen' : ''}`} aria-label="Knowledge graph">
      <div className="wt-viz-legend" aria-label="Graph legend">
        <span><i className="wt-viz-legend-dot is-up" aria-hidden="true"></i> Up</span>
        <span><i className="wt-viz-legend-dot is-current" aria-hidden="true"></i> Current</span>
        <span><i className="wt-viz-legend-dot is-child" aria-hidden="true"></i> Children</span>
        <span><i className="wt-viz-legend-dot is-descendant" aria-hidden="true"></i> 2nd level</span>
      </div>

      <div className="wt-viz-canvas-wrap">
        <div ref={containerRef} id="mynetwork" className="wt-viz-canvas" />
        <div className="wt-viz-controls" aria-label="Graph controls">
          {onNavigateUp ? (
            <button type="button" className="btn btn-default" onClick={onNavigateUp} title={upLabel || 'Up one level'}>
              <i className="fa fa-arrow-up" aria-hidden="true"></i>
              <span className="sr-only">{upLabel || 'Up one level'}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-default"
            onClick={() => networkRef.current?.fit({ animation: { duration: 200 } })}
            title="Center graph"
          >
            <i className="fa fa-crosshairs" aria-hidden="true"></i><span className="sr-only">Center graph</span>
          </button>
          <button type="button" className="btn btn-default" onClick={() => changeZoom(-0.2)} title="Zoom out">
            <i className="fa fa-minus" aria-hidden="true"></i><span className="sr-only">Zoom out</span>
          </button>
          <button type="button" className="btn btn-default" onClick={() => changeZoom(0.2)} title="Zoom in">
            <i className="fa fa-plus" aria-hidden="true"></i><span className="sr-only">Zoom in</span>
          </button>
          <button
            type="button"
            className="btn btn-default"
            onClick={() => setIsFullscreen((current) => !current)}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            <i className={`glyphicon ${isFullscreen ? 'glyphicon-resize-small' : 'glyphicon-resize-full'}`} aria-hidden="true"></i>
            <span className="sr-only">{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
          </button>
        </div>
      </div>

      {rendererError ? <div className="alert alert-danger wt-viz-renderer-error">{rendererError}</div> : null}

      {activeNode ? (
        <div className="wt-viz-node-action" aria-live="polite">
          <div className="wt-viz-node-action-copy">
            <span
              className={`wt-viz-node-marker is-${activeNode.role === 'child' && activeNode.level > 1 ? 'descendant' : activeNode.role}`}
              aria-hidden="true"
            ></span>
            <span><strong>{activeNode.title}</strong><small>{activeNode.type === 'root' ? 'Root view' : activeNode.role === 'current' ? 'Current topic' : activeNode.role === 'up' ? 'Up the hierarchy' : activeNode.level === 1 ? 'Child topic' : 'Second-level topic'}</small></span>
          </div>
          <div className="wt-viz-node-action-buttons">
            <button type="button" className="btn btn-default" onClick={() => onOpenNode(activeNode)}>
              <i className="fa fa-external-link" aria-hidden="true"></i> Open topic
            </button>
            <button type="button" className="btn btn-primary" onClick={() => centerNode(activeNode)}>
              <i className="fa fa-crosshairs" aria-hidden="true"></i> Center here
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default KnowledgeGraph;
