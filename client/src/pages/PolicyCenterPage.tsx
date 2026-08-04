import React from 'react';
import { Link } from 'react-router';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import PageMeta from '../components/common/PageMeta';

const POLICY_VERSION = '1.0';

const policies = [
  {
    title: 'Contribute responsibly',
    icon: 'pencil',
    summary: 'Search first, write one reviewable claim, distinguish observation from inference, and disclose evidence limitations.',
    rules: ['No impersonation or fabricated evidence', 'Keep factual and ethical judgments separate', 'Use change requests for protected content'],
  },
  {
    title: 'Screen and review consistently',
    icon: 'balance-scale',
    summary: 'Decide from evidence and published policy rather than identity, popularity, or agreement with a conclusion.',
    rules: ['Give a reason for every privileged decision', 'Disclose and reassign conflicts of interest', 'Preserve material dissenting evidence'],
  },
  {
    title: 'Classify issues precisely',
    icon: 'exclamation-circle',
    summary: 'Use the narrowest issue category. Critical means review cannot safely continue, not simply that reviewers disagree.',
    rules: ['Warning: quality concern that does not block review', 'Critical: materially false, unsafe, or unreviewable', 'Resolve or dismiss with evidence and a reason'],
  },
  {
    title: 'Evaluate sources, not prestige',
    icon: 'archive',
    summary: 'Review identity, proximity, integrity, recency, and reproducibility while recording what remains unknown.',
    rules: ['Strong: 16-20', 'Usable with limitations: 11-15', 'Weak or insufficient: 0-10'],
  },
  {
    title: 'Keep verdict channels independent',
    icon: 'columns',
    summary: 'Factual support and ethical permissibility answer different questions and never imply one another.',
    rules: ['Factual: supported, refuted, mixed, insufficient evidence', 'Ethical: permissible, impermissible, contested, not applicable', 'Name evidence or ethical framework in the reason'],
  },
  {
    title: 'Preserve history',
    icon: 'history',
    summary: 'Revisions may make comments obsolete, but review decisions preserve them as attributable historical context.',
    rules: ['Potentially obsolete is a review queue', 'No automatic expiry or age-based deletion', 'Archived records remain discoverable in an explicit view'],
  },
];

const PolicyCenterPage: React.FC = () => (
  <div>
    <PageMeta title="Policy Center" description="Wikitruth contribution, evidence, screening, verdict, and discussion policies" />
    <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Policy Center', active: true }]} />
    <PageHeader title="Policy Center" subtitle={`Operating policy ${POLICY_VERSION} - effective July 13, 2026`} icon="book" iconColor="text-primary" />
    <div className="alert alert-info">
      These policies govern modern contribution and review workflows. Historical decisions retain the policy version under which they were made.
    </div>
    <div className="row">
      {policies.map((policy) => (
        <div className="col-md-6" key={policy.title}>
          <section className="panel panel-default" style={{ minHeight: 245 }}>
            <div className="panel-heading"><strong><i className={`fa fa-${policy.icon}`} aria-hidden="true"></i> {policy.title}</strong></div>
            <div className="panel-body">
              <p>{policy.summary}</p>
              <ul>{policy.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </div>
          </section>
        </div>
      ))}
    </div>
    <div className="well">
      <strong>Ready to contribute?</strong>{' '}
      <Link to="/account/onboarding">Complete role onboarding</Link> or <Link to="/create">open the create wizard</Link>.
    </div>
  </div>
);

export default PolicyCenterPage;
