import React, { useState } from 'react';
import civicApi from '../../services/api/civic';
import type { CivicExtensionValue, CivicJurisdiction, CivicRecord, CivicRecordInput, CivicRecordKind, CivicSeverity, CivicTenant } from '../../types/civic';
import { CivicExtensionFormFields, extensionFieldsForKind } from './CivicExtensionFields';

interface CivicRecordFormProps {
  kinds: CivicRecordKind[];
  parentId?: string;
  tenant: CivicTenant;
  jurisdictions: CivicJurisdiction[];
  record?: CivicRecord;
  onCreated?: (record: CivicRecord) => void;
  onUpdated?: (record: CivicRecord) => void;
  onCancel?: () => void;
}

const KIND_LABELS: Record<CivicRecordKind, string> = {
  institution: 'Institution',
  office: 'Office',
  person: 'Person',
  project: 'Project',
  observation: 'Citizen observation',
  incident: 'Incident',
  action: 'Action',
  election: 'Election',
  candidate: 'Candidate',
  history: 'Historical outcome',
};

const CivicRecordForm: React.FC<CivicRecordFormProps> = ({ kinds, parentId, tenant, jurisdictions, record, onCreated, onUpdated, onCancel }) => {
  const editing = Boolean(record);
  const [kind, setKind] = useState<CivicRecordKind>(record?.kind || kinds[0]);
  const [title, setTitle] = useState(record?.title || '');
  const [summary, setSummary] = useState(record?.summary || '');
  const [description, setDescription] = useState(record?.description || '');
  const [severity, setSeverity] = useState<CivicSeverity>(record?.severity || 'info');
  const [location, setLocation] = useState<Record<string, string>>(() => Object.fromEntries(
    tenant.geography.addressFields.map((field) => [field, String((record?.location as Record<string, unknown> | undefined)?.[field] || '')]),
  ));
  const [extensions, setExtensions] = useState<Record<string, CivicExtensionValue | undefined>>(record?.extensions || {});
  const [budget, setBudget] = useState(record?.project?.budget == null ? '' : String(record.project.budget));
  const [progress, setProgress] = useState(record?.project?.progressPercent == null ? '' : String(record.project.progressPercent));
  const [position, setPosition] = useState(record?.election?.position || '');
  const [electionDate, setElectionDate] = useState(record?.election?.electionDate ? String(record.election.electionDate).slice(0, 10) : '');
  const [sourceUrl, setSourceUrl] = useState(record?.observation?.sourceUrl || '');
  const [jurisdictionId, setJurisdictionId] = useState(record?.jurisdictionId || '');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const activeExtensions = Object.fromEntries(
      extensionFieldsForKind(tenant, kind)
        .filter((field) => editing || (extensions[field.key] !== undefined && extensions[field.key] !== ''))
        .map((field) => [field.key, extensions[field.key] as CivicExtensionValue]),
    );
    const activeLocation = Object.fromEntries(
      tenant.geography.addressFields.filter((field) => editing || location[field]).map((field) => [field, location[field]]),
    );
    const payload: CivicRecordInput = {
      kind,
      title,
      summary,
      description,
      severity,
      parentId: record?.parentId || parentId,
      jurisdictionId: editing ? jurisdictionId : jurisdictionId || undefined,
      location: { countryCode: tenant.countryCode, ...activeLocation },
      extensions: activeExtensions,
      project: kind === 'project' ? {
        budget: budget ? Number(budget) : null,
        currency: tenant.localization.currency,
        progressPercent: progress ? Number(progress) : null,
      } : undefined,
      election: kind === 'election' || kind === 'candidate' ? {
        position,
        electionDate: electionDate || null,
      } : undefined,
      observation: kind === 'observation' ? { sourceUrl, escalationStatus: 'submitted' } : undefined,
    };
    try {
      if (record) {
        const updatePayload: Partial<CivicRecordInput> = { ...payload };
        delete updatePayload.kind;
        const response = await civicApi.update(record._id, updatePayload);
        onUpdated?.(response.record);
        setMessage('Civic record details updated.');
      } else {
        const response = await civicApi.create(payload);
        onCreated?.(response.record);
        setTitle('');
        setSummary('');
        setDescription('');
        setMessage('Submitted for screening.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit this civic record.');
    } finally {
      setSubmitting(false);
    }
  };

  const locationLabel = (field: string) => tenant.geography.levels.find((level) => level.key === field)?.label
    || field.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

  return (
    <form className="wt-civic-form" onSubmit={submit}>
      <div className="wt-civic-form-heading">
        <div>
          <span className="wt-civic-kicker">{editing ? 'Maintain the record' : 'Contribute a record'}</span>
          <h3>{editing ? 'Edit civic record details' : 'Put a civic fact on the record'}</h3>
        </div>
        <span className="label label-warning">Screened before publication</span>
      </div>
      <div className="row">
        <div className="col-sm-4 form-group">
          <label htmlFor="civic-kind">Record type</label>
          <select id="civic-kind" className="form-control" disabled={editing} value={kind} onChange={(event) => setKind(event.target.value as CivicRecordKind)}>
            {kinds.map((value) => <option value={value} key={value}>{KIND_LABELS[value]}</option>)}
          </select>
        </div>
        <div className="col-sm-8 form-group">
          <label htmlFor="civic-title">Title</label>
          <input id="civic-title" className="form-control" required minLength={3} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="civic-summary">At-a-glance summary</label>
        <input id="civic-summary" className="form-control" maxLength={500} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="What should a citizen understand in five seconds?" />
      </div>
      <div className="form-group">
        <label htmlFor="civic-description">Details and evidence context</label>
        <textarea id="civic-description" className="form-control" rows={4} maxLength={30000} value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      {(kind === 'incident' || kind === 'observation') && (
        <div className="row">
          <div className="col-sm-4 form-group">
            <label htmlFor="civic-severity">Severity</label>
            <select id="civic-severity" className="form-control" value={severity} onChange={(event) => setSeverity(event.target.value as CivicSeverity)}>
              {['info', 'low', 'medium', 'high', 'critical'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          {kind === 'observation' && <div className="col-sm-8 form-group"><label htmlFor="civic-source">Evidence URL</label><input id="civic-source" type="url" className="form-control" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></div>}
        </div>
      )}
      <fieldset><legend>Location</legend><div className="row">{tenant.geography.addressFields.map((field) => <div className="col-sm-6 form-group" key={field}><label htmlFor={`civic-location-${field}`}>{locationLabel(field)}</label><input id={`civic-location-${field}`} className="form-control" maxLength={300} value={location[field] || ''} onChange={(event) => setLocation((current) => ({ ...current, [field]: event.target.value }))} /></div>)}</div></fieldset>
      {jurisdictions.length > 0 && <div className="form-group"><label htmlFor="civic-jurisdiction">Official jurisdiction</label><select id="civic-jurisdiction" className="form-control" value={jurisdictionId} onChange={(event) => setJurisdictionId(event.target.value)}><option value="">Not specified</option>{jurisdictions.map((jurisdiction) => <option key={jurisdiction._id} value={jurisdiction._id}>{jurisdiction.name}</option>)}</select></div>}
      {kind === 'project' && (
        <div className="row">
          <div className="col-sm-6 form-group"><label htmlFor="civic-budget">Budget ({tenant.localization.currency})</label><input id="civic-budget" type="number" min="0" className="form-control" value={budget} onChange={(event) => setBudget(event.target.value)} /></div>
          <div className="col-sm-6 form-group"><label htmlFor="civic-progress">Progress (%)</label><input id="civic-progress" type="number" min="0" max="100" className="form-control" value={progress} onChange={(event) => setProgress(event.target.value)} /></div>
        </div>
      )}
      {(kind === 'election' || kind === 'candidate') && (
        <div className="row">
          <div className="col-sm-7 form-group"><label htmlFor="civic-position">Position</label><input id="civic-position" className="form-control" value={position} onChange={(event) => setPosition(event.target.value)} /></div>
          <div className="col-sm-5 form-group"><label htmlFor="civic-election-date">Election date</label><input id="civic-election-date" type="date" className="form-control" value={electionDate} onChange={(event) => setElectionDate(event.target.value)} /></div>
        </div>
      )}
      <CivicExtensionFormFields tenant={tenant} kind={kind} values={extensions} onChange={(key, value) => setExtensions((current) => ({ ...current, [key]: value }))} />
      {message && <p className="help-block" role="status">{message}</p>}
      <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : editing ? 'Save record details' : 'Submit civic record'}</button>
      {editing && onCancel && <button className="btn btn-link" type="button" onClick={onCancel}>Cancel</button>}
    </form>
  );
};

export default CivicRecordForm;
