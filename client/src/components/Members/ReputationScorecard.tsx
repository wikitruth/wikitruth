import React from 'react';
import type { ReputationSnapshot } from '../../types';

type Props = {
  reputation: ReputationSnapshot;
};

const DIMENSION_LABELS: Array<[keyof ReputationSnapshot['dimensions'], string, string]> = [
  ['quality', 'Quality', 'Accepted contribution record, adjusted for sample size'],
  ['participation', 'Participation', 'Sustained contribution activity'],
  ['stewardship', 'Stewardship', 'Review, verdict, and accepted revision activity'],
  ['evidence', 'Evidence', 'Accepted artifacts and source-quality reviews'],
];

const ReputationScorecard: React.FC<Props> = ({ reputation }) => (
  <section className="panel panel-default wt-reputation-card" aria-labelledby="reputation-score-heading">
    <div className="panel-heading">
      <strong id="reputation-score-heading">Contribution Scorecard</strong>
      <span className="pull-right label label-info">Formula {reputation.formulaVersion}</span>
    </div>
    <div className="panel-body">
      <div className="row">
        <div className="col-sm-3 text-center">
          <div className="wt-reputation-score" aria-label={`Reputation score ${reputation.score} out of 100`}>{reputation.score}</div>
          <strong>{reputation.level}</strong>
          <p className="text-muted small">Calculated from auditable contribution and review records.</p>
        </div>
        <div className="col-sm-9">
          {DIMENSION_LABELS.map(([key, label, help]) => (
            <div key={key} className="wt-reputation-dimension">
              <div><strong>{label}</strong><span className="pull-right">{reputation.dimensions[key]}/100</span></div>
              <div className="progress" title={help}>
                <div className="progress-bar" role="progressbar" aria-valuenow={reputation.dimensions[key]} aria-valuemin={0} aria-valuemax={100} style={{ width: `${reputation.dimensions[key]}%` }}>
                  <span className="sr-only">{reputation.dimensions[key]} percent</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {reputation.badges.length ? (
        <div className="wt-reputation-badges" aria-label="Earned badges">
          {reputation.badges.map((badge) => (
            <span key={badge.key} className="label label-success" title={badge.description}>
              <i className="fa fa-certificate" aria-hidden="true"></i> {badge.label}
            </span>
          ))}
        </div>
      ) : <p className="text-muted">Badges appear when their published thresholds are met.</p>}
    </div>
  </section>
);

export default ReputationScorecard;
