import React from 'react';

export type OpinionClassification = 'general' | 'supplement' | 'objection' | 'question';

const PRESENTATION: Record<OpinionClassification, { label: string; className: string; icon: string }> = {
  general: { label: 'Comment', className: 'label-default', icon: 'comment-o' },
  supplement: { label: 'Supplement', className: 'label-info', icon: 'plus-circle' },
  objection: { label: 'Objection', className: 'label-warning', icon: 'hand-stop-o' },
  question: { label: 'Question', className: 'label-primary', icon: 'question-circle' },
};

export function normalizeOpinionClassification(value: unknown): OpinionClassification {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'supplement' || normalized === 'objection' || normalized === 'question' ? normalized : 'general';
}

const OpinionClassificationLabel: React.FC<{ value: unknown; className?: string }> = ({ value, className = '' }) => {
  const presentation = PRESENTATION[normalizeOpinionClassification(value)];
  return (
    <span className={`label ${presentation.className} ${className}`.trim()} title="Purpose of this discussion contribution">
      <i className={`fa fa-${presentation.icon}`} aria-hidden="true"></i> {presentation.label}
    </span>
  );
};

export default OpinionClassificationLabel;
