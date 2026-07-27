import React, { useMemo, useState } from 'react';
import type { LegacyEntity } from '../../types/legacy';

export interface HomeRankings {
  formulas: {
    latest: string;
    trending: string;
    top: string;
    disclaimer: string;
  };
  candidateCount: number;
  candidateWindow: string;
  buckets: {
    latest: LegacyEntity[];
    trending: LegacyEntity[];
    top: LegacyEntity[];
  };
}

type BucketKey = keyof HomeRankings['buckets'];

const BUCKETS: Array<{ key: BucketKey; label: string; icon: string }> = [
  { key: 'latest', label: 'Latest', icon: 'clock-o' },
  { key: 'trending', label: 'Trending', icon: 'line-chart' },
  { key: 'top', label: 'Top', icon: 'trophy' },
];

const HomeRankingBuckets: React.FC<{
  rankings: HomeRankings;
  renderEntry: (entry: LegacyEntity) => React.ReactNode;
}> = ({ rankings, renderEntry }) => {
  const [active, setActive] = useState<BucketKey>('latest');
  const columns = useMemo(() => {
    const entries = rankings.buckets[active] || [];
    const splitAt = Math.ceil(entries.length / 2);
    return [entries.slice(0, splitAt), entries.slice(splitAt)].filter((column) => column.length > 0);
  }, [active, rankings.buckets]);

  return (
    <section aria-labelledby="home-discovery-heading">
      <h1 id="home-discovery-heading" className="page-header wt-header">
        <i className="fa fa-globe" aria-hidden="true"></i> Discover Posts
      </h1>
      <div className="clearfix" style={{ marginBottom: 12 }}>
        <div className="btn-group" role="tablist" aria-label="Home discovery ranking">
          {BUCKETS.map((bucket) => (
            <button
              key={bucket.key}
              type="button"
              role="tab"
              aria-selected={active === bucket.key}
              className={`btn ${active === bucket.key ? 'btn-primary' : 'btn-default'}`}
              onClick={() => setActive(bucket.key)}
            >
              <i className={`fa fa-${bucket.icon}`} aria-hidden="true"></i> {bucket.label}
            </button>
          ))}
        </div>
      </div>
      <div className="alert alert-info" style={{ padding: '8px 12px' }}>
        <strong>{BUCKETS.find((bucket) => bucket.key === active)?.label}:</strong> {rankings.formulas[active]}{' '}
        <span className="text-muted">Candidate window: {rankings.candidateWindow}. {rankings.formulas.disclaimer}</span>
      </div>
      {columns.length ? (
        <div className="row">
          {columns.map((column, columnIndex) => (
            <div key={`${active}-${columnIndex}`} className="col-md-6 col-sm-12">
              <div className="wt-list-container">
                <ul className="list-group top-list-items wt-list">
                  {column.map((entry) => renderEntry(entry))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-muted">No accepted public entries are available for this bucket.</p>}
    </section>
  );
};

export default HomeRankingBuckets;
