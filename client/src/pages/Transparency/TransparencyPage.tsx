import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import Alert from '../../components/common/Alert';
import PageMeta from '../../components/common/PageMeta';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getPublicTrustDashboard,
  type PublicTrustDashboard,
  type PublicTrustMetric,
} from '../../services/api/transparency';
import './transparency.css';

const SUMMARY_ITEMS = [
  { key: 'publicKnowledge', label: 'Public knowledge', icon: 'book', tone: 'primary' },
  { key: 'accepted', label: 'Accepted', icon: 'check-circle-o', tone: 'success' },
  { key: 'pending', label: 'Under review', icon: 'clock-o', tone: 'warning' },
  { key: 'archived', label: 'Archived context', icon: 'archive', tone: 'archived' },
] as const;

const QUALITY_ICONS: Record<string, string> = {
  evidence_linked_verdicts: 'link',
  fresh_reviews: 'refresh',
  healthy_public_sources: 'shield',
  resolved_appeals: 'balance-scale',
};

const GOVERNANCE_ICONS: Record<string, string> = {
  verdict_explanations: 'file-text-o',
  material_dissent: 'comments-o',
  appeals_reviewed: 'balance-scale',
  revisions_recorded: 'pencil',
};

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formattedFreshness(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Updated daily'
    : `Updated ${new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)}`;
}

const InfoLabel: React.FC<{ text: string }> = ({ text }) => (
  <span className="wt-trust-info" title={text} role="img" aria-label={text} tabIndex={0}>
    <i className="fa fa-info-circle" aria-hidden="true"></i>
  </span>
);

const QualityRow: React.FC<{ metric: PublicTrustMetric }> = ({ metric }) => {
  const width = metric.suppressed ? 0 : Math.min(Math.max(metric.percent || 0, 0), 100);
  return (
    <li className="wt-trust-quality-row">
      <i className={`fa fa-${QUALITY_ICONS[metric.key] || 'circle-o'} wt-trust-quality-icon`} aria-hidden="true"></i>
      <span className="wt-trust-quality-label">{metric.label}<InfoLabel text={metric.description} /></span>
      <span
        className={`wt-trust-bar${metric.suppressed ? ' is-suppressed' : ''}`}
        role="img"
        aria-label={`${metric.label}: ${metric.display}`}
      >
        <span style={{ width: `${width}%` }}></span>
      </span>
      <strong>{metric.suppressed ? '—' : metric.display}</strong>
      {metric.suppressed ? <span className="sr-only">{metric.display}</span> : null}
    </li>
  );
};

const TransparencyPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<PublicTrustDashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void getPublicTrustDashboard()
      .then((value) => {
        if (active) {
          setDashboard(value);
          setError('');
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load public transparency data');
      });
    return () => { active = false; };
  }, []);

  const lifecycleTotal = useMemo(
    () => dashboard?.lifecycle.reduce((sum, item) => sum + item.value, 0) || 0,
    [dashboard],
  );

  return (
    <div className="wt-transparency-page">
      <PageMeta
        title="Transparency & Trust"
        description="A privacy-safe public view of how Wikitruth knowledge is reviewed, maintained, and protected."
      />
      <header className="wt-trust-heading">
        <div>
          <h1>Transparency &amp; Trust</h1>
          <p>A public view of how Wikitruth knowledge is reviewed, maintained, and protected.</p>
        </div>
        {dashboard ? (
          <p className="wt-trust-freshness">
            <i className="fa fa-calendar" aria-hidden="true"></i> {formattedFreshness(dashboard.generatedAt)}
          </p>
        ) : null}
      </header>

      {error ? <Alert type="danger">{error}. Please try again later.</Alert> : null}
      {!dashboard && !error ? <div className="wt-trust-loading"><LoadingSpinner /></div> : null}

      {dashboard ? (
        <>
          <section className="wt-trust-summary" aria-label="Public knowledge summary">
            {SUMMARY_ITEMS.map((item) => (
              <div className={`wt-trust-summary-item ${item.tone}`} key={item.key}>
                <i className={`fa fa-${item.icon}`} aria-hidden="true"></i>
                <span>
                  <small>{item.label}<InfoLabel text={dashboard.scope.label} /></small>
                  <strong>{formatCount(dashboard.summary[item.key])}</strong>
                </span>
              </div>
            ))}
          </section>

          <div className="wt-trust-primary-grid">
            <section className="wt-trust-panel" aria-labelledby="trust-quality-heading">
              <h2 id="trust-quality-heading">Knowledge quality <InfoLabel text="Quality rates use documented public cohorts and hide small cohorts." /></h2>
              <ul className="wt-trust-quality-list">
                {dashboard.quality.map((metric) => <QualityRow key={metric.key} metric={metric} />)}
              </ul>
            </section>

            <section className="wt-trust-panel" aria-labelledby="trust-lifecycle-heading">
              <h2 id="trust-lifecycle-heading">Lifecycle at a glance <InfoLabel text="Popularity and reactions do not affect these lifecycle states." /></h2>
              <div className="wt-trust-lifecycle-bar" role="img" aria-label={dashboard.lifecycle.map((item) => `${item.label}: ${item.value}`).join(', ')}>
                {dashboard.lifecycle.map((item) => (
                  <span
                    key={item.key}
                    className={item.key}
                    style={{ width: lifecycleTotal ? `${(item.value / lifecycleTotal) * 100}%` : '0%' }}
                  ></span>
                ))}
              </div>
              <ul className="wt-trust-lifecycle-list">
                {dashboard.lifecycle.map((item) => (
                  <li key={item.key}>
                    <span className={`wt-trust-dot ${item.key}`} aria-hidden="true"></span>
                    <span><strong>{item.label}</strong><small>{item.description}</small></span>
                    <strong>{formatCount(item.value)}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="wt-trust-governance" aria-labelledby="trust-governance-heading">
            <h2 id="trust-governance-heading">Governance in practice <InfoLabel text={`Activity metrics use a ${dashboard.scope.windowDays}-day window where stated.`} /></h2>
            <div className="wt-trust-governance-list">
              {dashboard.governance.map((metric) => (
                <details key={metric.key}>
                  <summary>
                    <i className={`fa fa-${GOVERNANCE_ICONS[metric.key] || 'circle-o'}`} aria-hidden="true"></i>
                    <span>{metric.label}</span>
                    <strong>{metric.suppressed ? '—' : metric.display}</strong>
                    <i className="fa fa-chevron-down" aria-hidden="true"></i>
                  </summary>
                  <p>{metric.description}{metric.suppressed ? ` ${metric.display} to protect small cohorts.` : ''}</p>
                </details>
              ))}
            </div>
          </section>

          <details className="wt-trust-privacy">
            <summary>
              <i className="fa fa-shield" aria-hidden="true"></i>
              <span><strong>{dashboard.privacy.title}</strong><small>{dashboard.privacy.summary}</small></span>
              <i className="fa fa-chevron-right" aria-hidden="true"></i>
            </summary>
            <ul>{dashboard.privacy.exclusions.map((item) => <li key={item}>{item}</li>)}</ul>
          </details>

          <section className="wt-trust-method" id="methodology" aria-labelledby="trust-method-heading">
            <div>
              <h2 id="trust-method-heading">How these numbers work <InfoLabel text="Methods are public and intentionally resistant to individual inference." /></h2>
              <p>These measures reflect public knowledge only. Methods are documented, open, and available for anyone to review.</p>
            </div>
            <div className="wt-trust-method-actions">
              <details className="wt-trust-method-details">
                <summary className="btn btn-default"><i className="fa fa-bar-chart" aria-hidden="true"></i> Read the methodology</summary>
                <ul>{dashboard.methodology.map((item) => <li key={item}>{item}</li>)}</ul>
              </details>
              <Link className="btn btn-default" to="/policies"><i className="fa fa-file-text-o" aria-hidden="true"></i> View public policies</Link>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};

export default TransparencyPage;
