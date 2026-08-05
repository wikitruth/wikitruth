import React, { useState } from 'react';
import type { StructuredDebate, StructuredDebateTransitionAction } from '../../services/api/structuredDebates';

interface StructuredDebateControlsProps {
  debate: StructuredDebate;
  busy: boolean;
  onTransition: (action: StructuredDebateTransitionAction, publicReason: string) => Promise<void>;
}

const StructuredDebateControls: React.FC<StructuredDebateControlsProps> = ({ debate, busy, onTransition }) => {
  const [publicReason, setPublicReason] = useState('');
  const [pendingAction, setPendingAction] = useState<StructuredDebateTransitionAction | null>(null);
  if (!debate.viewer.canFacilitate) return null;

  const actions: Array<{ key: StructuredDebateTransitionAction; label: string; tone?: string; hidden?: boolean }> = [
    { key: 'pause', label: 'Pause pilot', hidden: debate.status !== 'open' },
    { key: 'resume', label: 'Resume pilot', hidden: debate.status !== 'paused' },
    { key: 'advance', label: 'Advance phase', hidden: debate.status !== 'open' },
    { key: 'close', label: 'Close pilot', hidden: !['open', 'paused'].includes(debate.status) },
    { key: 'cancel', label: 'Cancel pilot', tone: 'btn-danger', hidden: !['open', 'paused'].includes(debate.status) },
  ];

  const apply = async (action: StructuredDebateTransitionAction) => {
    if (action === 'cancel' && publicReason.trim().length < 10) return;
    setPendingAction(action);
    try {
      await onTransition(action, publicReason.trim());
      setPublicReason('');
    } catch (_error) {
      // The page owns the visible error state.
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <details className="wt-debate-controls">
      <summary><span><i className="fa fa-sliders" aria-hidden="true"></i> Facilitator controls</span><i className="fa fa-chevron-down" aria-hidden="true"></i></summary>
      <div>
        <p>Actions are added to the public audit trail. A reason is required when cancelling.</p>
        <label>
          Public reason or note
          <textarea className="form-control" rows={3} value={publicReason} onChange={(event) => setPublicReason(event.target.value)} placeholder="Explain this action for the public record" />
        </label>
        <div className="wt-debate-control-actions">
          {actions.filter((action) => !action.hidden).map((action) => (
            <button key={action.key} type="button" className={`btn ${action.tone || 'btn-default'}`} disabled={busy || (action.key === 'cancel' && publicReason.trim().length < 10)} onClick={() => void apply(action.key)}>
              {pendingAction === action.key ? 'Working…' : action.label}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
};

export default StructuredDebateControls;
