import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useCivicTenant } from '../../context/CivicTenantContext';
import civicApi from '../../services/api/civic';
import type { CivicOverview, CivicRecord, CivicRecordStatus } from '../../types/civic';
import CivicRecordForm from './CivicRecordForm';
import { civicSectionsForTenant, getCivicSection } from './civicSections';

const STATUS_LABELS: Record<CivicRecordStatus, string> = {
  draft: 'Draft',
  pending: 'Pending screening',
  active: 'Active',
  verified: 'Verified',
  resolved: 'Resolved',
  archived: 'Archived',
};

function recordLocation(record: CivicRecord, addressFields: string[]): string {
  const location = (record.location || {}) as Record<string, unknown>;
  return addressFields.map((field) => String(location[field] || '')).filter(Boolean).join(', ');
}

function CivicRecordCard({ record, selectable, selected, onSelect, addressFields }: {
  record: CivicRecord;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (record: CivicRecord) => void;
  addressFields: string[];
}) {
  const location = recordLocation(record, addressFields);
  return (
    <article className={`wt-civic-record ${record.severity === 'critical' ? 'is-critical' : ''}`}>
      <div className="wt-civic-record-topline">
        <span className="wt-civic-kind">{record.kind.replace('_', ' ')}</span>
        <span className={`wt-civic-status status-${record.status}`}>{STATUS_LABELS[record.status]}</span>
      </div>
      <h3><Link to={`/civic/records/${record._id}`}>{record.title}</Link></h3>
      {record.summary && <p>{record.summary}</p>}
      <div className="wt-civic-record-meta">
        {location && <span><i className="fa fa-map-marker" aria-hidden="true"></i> {location}</span>}
        {record.stage && <span><i className="fa fa-random" aria-hidden="true"></i> {record.stage.replace('_', ' ')}</span>}
        {record.severity !== 'info' && <span className={`severity-${record.severity}`}><i className="fa fa-exclamation-circle" aria-hidden="true"></i> {record.severity}</span>}
      </div>
      {typeof record.project?.progressPercent === 'number' && (
        <div className="wt-civic-progress" aria-label={`${record.project.progressPercent}% project progress`}>
          <span style={{ width: `${record.project.progressPercent}%` }}></span>
        </div>
      )}
      {selectable && (
        <button type="button" className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-default'}`} onClick={() => onSelect?.(record)}>
          <i className={`fa fa-${selected ? 'check-square-o' : 'square-o'}`} aria-hidden="true"></i> {selected ? 'Selected' : 'Compare'}
        </button>
      )}
    </article>
  );
}

const CivicWorkspacePage: React.FC = () => {
  const { section: sectionSlug } = useParams<{ section?: string }>();
  const { tenant, jurisdictions, hasRole } = useCivicTenant();
  const sections = useMemo(() => civicSectionsForTenant(tenant), [tenant]);
  const section = getCivicSection(tenant, sectionSlug);
  const { isAuthenticated } = useAuth();
  const [overview, setOverview] = useState<CivicOverview | null>(null);
  const [records, setRecords] = useState<CivicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [region, setRegion] = useState('');
  const [jurisdictionId, setJurisdictionId] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<CivicRecord[]>([]);
  const [comparedCandidates, setComparedCandidates] = useState<CivicRecord[]>([]);
  const sectionsNavRef = useRef<HTMLElement | null>(null);

  const kinds = useMemo(() => section?.kinds.join(','), [section]);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewResult, recordsResult] = await Promise.all([
        civicApi.overview(),
        civicApi.list({ kind: kinds, q: query || undefined, status: status || undefined, region: region || undefined, jurisdictionId: jurisdictionId || undefined }),
      ]);
      setOverview(overviewResult);
      setRecords(recordsResult.records || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load civic records.');
    } finally {
      setLoading(false);
    }
  }, [jurisdictionId, kinds, query, region, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  useEffect(() => {
    setSelectedCandidates([]);
    setComparedCandidates([]);
  }, [sectionSlug]);

  useEffect(() => {
    const activeItem = sectionsNavRef.current?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (activeItem?.scrollIntoView) {
      activeItem.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
    }
  }, [section?.slug]);

  const toggleCandidate = (candidate: CivicRecord) => {
    setSelectedCandidates((current) => current.some((item) => item._id === candidate._id)
      ? current.filter((item) => item._id !== candidate._id)
      : current.length < 6 ? [...current, candidate] : current);
  };

  const compare = async () => {
    if (selectedCandidates.length < 2) return;
    const result = await civicApi.compareCandidates(selectedCandidates.map((candidate) => candidate._id));
    setComparedCandidates(result.candidates || []);
  };

  const title = section?.title || tenant.title;
  const description = section?.description || tenant.slogan || 'A public accountability workspace connecting people, institutions, evidence, actions, and outcomes.';
  const regionLabel = tenant.geography.levels.find((level) => level.key === 'region')?.label || tenant.geography.levels[1]?.label || 'Region';

  return (
    <div className="wt-civic-page">
      <PageMeta title={title} description={description} />
      <header className="wt-civic-hero">
        <div className="wt-civic-hero-grid" aria-hidden="true"></div>
        <div className="wt-civic-hero-copy">
          <span className="wt-civic-kicker">{section?.eyebrow || 'Accountability needs a memory'}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {overview && (
          <div className="wt-civic-pulse">
            <strong>{Object.values(overview.counts || {}).reduce((sum, count) => sum + Number(count || 0), 0)}</strong>
            <span>public accountability records</span>
          </div>
        )}
      </header>

      <div className="wt-civic-sections-shell">
        <span className="sr-only" id="civic-sections-help">Scroll horizontally to view more sections.</span>
        <nav
          ref={sectionsNavRef}
          className="wt-civic-sections"
          aria-label={`${tenant.title} civic sections`}
          aria-describedby="civic-sections-help"
          tabIndex={0}
        >
          <Link className={!section ? 'active' : ''} aria-current={!section ? 'page' : undefined} to="/civic"><i className="fa fa-dashboard" aria-hidden="true"></i> Overview</Link>
          {sections.map((item) => {
            const isActive = section?.slug === item.slug;
            return (
              <Link className={isActive ? 'active' : ''} aria-current={isActive ? 'page' : undefined} key={item.slug} to={`/civic/${item.slug}`}>
                <i className={`fa fa-${item.icon}`} aria-hidden="true"></i> {item.title}
              </Link>
            );
          })}
          {hasRole('admin') && <Link to="/admin/civic-operations"><i className="fa fa-cog" aria-hidden="true"></i> Manage tenant</Link>}
        </nav>
      </div>

      {!section && overview?.urgent?.length ? (
        <section className="wt-civic-urgent">
          <div className="wt-civic-section-heading"><div><span className="wt-civic-kicker">Needs attention</span><h2>Unresolved high-impact incidents</h2></div><Link to="/civic/incidents">View incident tracker</Link></div>
          <div className="wt-civic-record-grid">{overview.urgent.map((record) => <CivicRecordCard record={record} addressFields={tenant.geography.addressFields} key={record._id} />)}</div>
        </section>
      ) : null}

      <section className="wt-civic-directory">
        <div className="wt-civic-section-heading">
          <div><span className="wt-civic-kicker">Search the public record</span><h2>{section ? section.title : 'Recent civic activity'}</h2></div>
          <span>{records.length} visible record{records.length === 1 ? '' : 's'}</span>
        </div>
        <div className="wt-civic-filters">
          <label><span>Search</span><input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, office, project, incident..." /></label>
          <label><span>Status</span><select className="form-control" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{overview?.statuses?.map((value) => <option value={value} key={value}>{STATUS_LABELS[value]}</option>)}</select></label>
          {jurisdictions.length > 0 ? (
            <label><span>Jurisdiction</span><select className="form-control" value={jurisdictionId} onChange={(event) => setJurisdictionId(event.target.value)}><option value="">All jurisdictions</option>{jurisdictions.map((jurisdiction) => <option value={jurisdiction._id} key={jurisdiction._id}>{jurisdiction.name}</option>)}</select></label>
          ) : (
            <label><span>{regionLabel}</span><input className="form-control" value={region} onChange={(event) => setRegion(event.target.value)} placeholder={`Filter by ${regionLabel.toLowerCase()}`} /></label>
          )}
        </div>
        {loading ? <LoadingSpinner message="Loading civic records..." /> : error ? <div className="alert alert-danger">{error}</div> : records.length ? (
          <div className="wt-civic-record-grid">
            {records.map((record) => <CivicRecordCard key={record._id} record={record} addressFields={tenant.geography.addressFields} selectable={section?.slug === 'elections' && record.kind === 'candidate'} selected={selectedCandidates.some((item) => item._id === record._id)} onSelect={toggleCandidate} />)}
          </div>
        ) : <div className="wt-civic-empty"><i className="fa fa-map-o" aria-hidden="true"></i><h3>No records match this view yet</h3><p>Use the contribution form to place the first verifiable civic record here.</p></div>}
      </section>

      {section?.slug === 'elections' && selectedCandidates.length > 0 && (
        <section className="wt-civic-compare">
          <div className="wt-civic-section-heading"><div><span className="wt-civic-kicker">Vote Wisely</span><h2>Candidate comparison</h2></div><button className="btn btn-primary" type="button" disabled={selectedCandidates.length < 2} onClick={() => void compare()}>Compare selected ({selectedCandidates.length})</button></div>
          {comparedCandidates.length > 0 && <div className="wt-civic-comparison-grid">{comparedCandidates.map((candidate) => <div key={candidate._id}><h3>{candidate.title}</h3><strong>{candidate.election?.position || 'Position not specified'}</strong><p>{candidate.summary || 'No summary provided.'}</p><h4>Platform</h4><p>{candidate.election?.platform || 'No platform evidence recorded.'}</p><Link to={`/civic/records/${candidate._id}`}>Review complete evidence record</Link></div>)}</div>}
        </section>
      )}

      {section && hasRole('contributor', 'admin') && <CivicRecordForm tenant={tenant} jurisdictions={jurisdictions} kinds={section.createKinds} onCreated={(record) => setRecords((current) => [record, ...current])} />}
      {isAuthenticated && section && !hasRole('contributor', 'admin') && <div className="wt-civic-signin"><strong>Read-only tenant access.</strong> Ask a tenant administrator for contributor access to submit records.</div>}
      {!isAuthenticated && section && <div className="wt-civic-signin"><strong>Have verifiable information?</strong> <Link to={`/login?returnUrl=${encodeURIComponent(`/civic/${section.slug}`)}`}>Sign in to submit it for screening.</Link></div>}
    </div>
  );
};

export default CivicWorkspacePage;
