import React, { forwardRef } from 'react';
import type { VisualizeGraphNode } from './graphModel';
import './nodeActionPopover.css';

interface NodeActionPopoverProps {
  node: VisualizeGraphNode;
  position: { left: number; top: number } | null;
  onClose: () => void;
  onOpen: () => void;
  onCenter: () => void;
}

function nodeContextLabel(node: VisualizeGraphNode): string {
  if (node.archived) return 'Archived hierarchy context';
  if (node.type === 'root') return 'Root view';
  if (node.role === 'current') return 'Current topic';
  if (node.role === 'up') return 'Up the hierarchy';
  return node.level === 1 ? 'Child topic' : 'Second-level topic';
}

function markerClass(node: VisualizeGraphNode): string {
  if (node.archived) return 'archived';
  if (node.role === 'child' && node.level > 1) return 'descendant';
  return node.role;
}

const NodeActionPopover = forwardRef<HTMLDivElement, NodeActionPopoverProps>(({
  node,
  position,
  onClose,
  onOpen,
  onCenter,
}, ref) => (
  <div
    ref={ref}
    className="wt-viz-node-popover"
    role="dialog"
    aria-label={`${node.title} actions`}
    aria-live="polite"
    style={{
      left: position?.left ?? 0,
      top: position?.top ?? 0,
      visibility: position ? 'visible' : 'hidden',
    }}
  >
    <button type="button" className="wt-viz-node-popover-close" onClick={onClose} aria-label="Close topic actions">
      <i className="fa fa-times" aria-hidden="true"></i>
    </button>
    <div className="wt-viz-node-action-copy">
      <span className={`wt-viz-node-marker is-${markerClass(node)}`} aria-hidden="true"></span>
      <span><strong>{node.title}</strong><small>{nodeContextLabel(node)}</small></span>
    </div>
    <div className="wt-viz-node-action-buttons">
      <button type="button" className="btn btn-default" onClick={onOpen}>
        <i className="fa fa-external-link" aria-hidden="true"></i> Open topic
      </button>
      <button type="button" className="btn btn-primary" onClick={onCenter}>
        <i className="fa fa-crosshairs" aria-hidden="true"></i> Center here
      </button>
    </div>
  </div>
));

NodeActionPopover.displayName = 'NodeActionPopover';

export default NodeActionPopover;
