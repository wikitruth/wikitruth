import React, { useState } from 'react';
import type { Theme } from '../../context/ThemeContext';
import { act, fireEvent, render, screen, waitFor } from '../../test-utils/render';
import KnowledgeGraph from './KnowledgeGraph';
import type { VisualizeGraphNode, VisualizeGraphPayload } from './graphModel';

type GraphEventHandler = (params: {
  nodes?: Array<string | number>;
  pointer?: { DOM?: { x: number; y: number } };
}) => void;

class FakeDataSet {
  constructor(_items: unknown[]) {}
  add() {}
  clear() {}
}

class FakeNetwork {
  handlers = new Map<string, GraphEventHandler>();
  destroy = jest.fn();
  fit = jest.fn();
  focus = jest.fn();
  moveTo = jest.fn();
  stopSimulation = jest.fn();

  constructor() {
    rememberLatestNetwork(this);
  }

  on(event: string, handler: GraphEventHandler) {
    this.handlers.set(event, handler);
  }

  emit(event: string, params: Parameters<GraphEventHandler>[0] = {}) {
    this.handlers.get(event)?.(params);
  }

  getScale() {
    return 0.7;
  }

  getPositions(nodeIds: Array<string | number> = []) {
    return Object.fromEntries(nodeIds.map((id) => [String(id), { x: 120, y: 160 }]));
  }

  canvasToDOM(position: { x: number; y: number }) {
    return position;
  }
}

let latestNetwork: FakeNetwork | null = null;

function rememberLatestNetwork(network: FakeNetwork): void {
  latestNetwork = network;
}

const currentNode: VisualizeGraphNode = {
  id: 'current',
  label: 'Current',
  title: 'Current',
  level: 0,
  role: 'current',
  type: 'topic',
  archived: false,
  exploreUrl: '/topics/entry/current/current',
  visualizeUrl: '/visualize/topic/current/current',
};
const childNode: VisualizeGraphNode = {
  id: 'child',
  label: 'Child',
  title: 'Child topic',
  level: 1,
  role: 'child',
  type: 'topic',
  archived: false,
  exploreUrl: '/topics/entry/child/child',
  visualizeUrl: '/visualize/topic/child/child',
};
const graph: VisualizeGraphPayload = {
  focusNodeId: currentNode.id,
  nodes: [currentNode, childNode],
  edges: [{ from: currentNode.id, to: childNode.id, direction: 'down', width: 4 }],
};

describe('KnowledgeGraph', () => {
  beforeEach(() => {
    latestNetwork = null;
    (window as unknown as { vis: unknown }).vis = {
      DataSet: FakeDataSet,
      Network: FakeNetwork,
    };
  });

  afterEach(() => {
    delete (window as unknown as { vis?: unknown }).vis;
  });

  it('stops the initial simulation and opens clamped actions when a node is tapped', async () => {
    const openNode = jest.fn();
    const recenterNode = jest.fn();

    const Harness = () => {
      const [activeNode, setActiveNode] = useState<VisualizeGraphNode | null>(null);
      return (
        <KnowledgeGraph
          graph={graph}
          theme={'dark' as Theme}
          activeNode={activeNode}
          onNodeSelected={setActiveNode}
          onNodeRecenter={recenterNode}
          onOpenNode={openNode}
        />
      );
    };

    render(<Harness />);
    await waitFor(() => expect(latestNetwork).not.toBeNull());

    act(() => latestNetwork?.emit('stabilizationIterationsDone'));
    await waitFor(() => expect(latestNetwork?.stopSimulation).toHaveBeenCalled());

    act(() => latestNetwork?.emit('click', {
      nodes: [childNode.id],
      pointer: { DOM: { x: 140, y: 180 } },
    }));

    expect(await screen.findByRole('dialog', { name: 'Child topic actions' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /open topic/i }));
    expect(openNode).toHaveBeenCalledWith(childNode);
    fireEvent.click(screen.getByRole('button', { name: /center here/i }));
    expect(recenterNode).toHaveBeenCalledWith(childNode);

    act(() => latestNetwork?.emit('click'));
    expect(screen.queryByRole('dialog', { name: /topic actions/i })).not.toBeInTheDocument();
  });
});
