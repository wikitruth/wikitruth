import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../../../components/common/PageMeta';
import moderationApi, { type ModerationEntry, type ModerationStatusOption } from '../../../services/api/moderation';
import { useAuth } from '../../../context/AuthContext';

const TOPIC_OBJECT_TYPE = 1;
const ARGUMENT_OBJECT_TYPE = 2;
const PAGE_LIMIT = 20;

type DraftState = Record<string, { status: number; reasoning: string }>;

function resolveObjectType(entry: ModerationEntry): number {
  if (typeof entry.objectType === 'number') {
    return entry.objectType;
  }
  return entry.objectName === 'topic' ? TOPIC_OBJECT_TYPE : ARGUMENT_OBJECT_TYPE;
}

function rowKey(entry: ModerationEntry): string {
  return `${resolveObjectType(entry)}:${entry._id || ''}`;
}

function entryDetailsPath(entry: ModerationEntry): string {
  return `/admin/verdicts/${encodeURIComponent(String(entry._id || ''))}?type=${encodeURIComponent(
    String(entry.objectName || 'argument'),
  )}`;
}

const VerdictsPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [entries, setEntries] = useState<ModerationEntry[]>([]);
  const [statuses, setStatuses] = useState<ModerationStatusOption[]>([]);
  const [drafts, setDrafts] = useState<DraftState>({});
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [objectTypeFilter, setObjectTypeFilter] = useState<number | ''>('');
  const [verdictFilter, setVerdictFilter] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [bulkStatus, setBulkStatus] = useState<number | ''>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [acknowledgeOverride, setAcknowledgeOverride] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canManageVerdicts = Boolean(user?.roles?.admin);
  const canReviewVerdicts = Boolean(user?.roles?.reviewer || user?.roles?.admin);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const selectedEntries = useMemo(() => {
    return entries.filter((entry) => selectedRows[rowKey(entry)]);
  }, [entries, selectedRows]);

  const selectedCount = selectedEntries.length;
  const allRowsSelected = entries.length > 0 && selectedCount === entries.length;

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    if (!canReviewVerdicts) {
      setError('Reviewer privileges are required');
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await moderationApi.listVerdicts({
          objectType: typeof objectTypeFilter === 'number' ? objectTypeFilter : undefined,
          status: typeof verdictFilter === 'number' ? verdictFilter : undefined,
          q: submittedQuery.trim() || undefined,
          page,
          limit: PAGE_LIMIT,
        });
        if (!mounted) {
          return;
        }
        const nextEntries = Array.isArray(response.entries) ? response.entries : [];
        setEntries(nextEntries);
        setStatuses(Array.isArray(response.verdictStatuses) ? response.verdictStatuses : []);
        setTotal(Number(response.total || 0));
        setSelectedRows({});
        setDrafts((prev) => {
          const next: DraftState = { ...prev };
          nextEntries.forEach((entry) => {
            const key = rowKey(entry);
            if (!next[key]) {
              next[key] = {
                status: typeof entry.verdict?.status === 'number' ? entry.verdict.status : 0,
                reasoning: String(entry.verdict?.reasoning || entry.verdictReasoning || ''),
              };
            }
          });
          return next;
        });
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load verdict queue');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [canReviewVerdicts, isAuthLoading, objectTypeFilter, verdictFilter, page, submittedQuery]);

  const updateDraft = (entry: ModerationEntry, changes: Partial<{ status: number; reasoning: string }>) => {
    const key = rowKey(entry);
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        status:
          typeof changes.status === 'number'
            ? changes.status
            : prev[key]?.status ?? (typeof entry.verdict?.status === 'number' ? entry.verdict.status : 0),
        reasoning:
          typeof changes.reasoning === 'string'
            ? changes.reasoning
            : prev[key]?.reasoning ?? String(entry.verdict?.reasoning || entry.verdictReasoning || ''),
      },
    }));
  };

  const applyUpdates = async (
    updates: Array<{
      id: string;
      type: number;
      status: number;
      reasoning?: string;
      overrideReason: string;
      acknowledgeOverride: true;
    }>,
    successMessage: string,
  ) => {
    try {
      setIsApplying(true);
      setError(null);
      setMessage(null);
      const response = await moderationApi.bulkUpdateVerdicts(updates);
      const failures = response.results.filter((result) => !result.success);
      if (failures.length > 0) {
        setError(`Some updates failed (${failures.length}/${response.results.length}).`);
      } else {
        setMessage(successMessage);
      }

      setEntries((prev) =>
        prev.map((entry) => {
          const update = updates.find((item) => item.id === entry._id && item.type === resolveObjectType(entry));
          if (!update) {
            return entry;
          }
          return {
            ...entry,
            verdict: {
              ...(entry.verdict || {}),
              status: update.status,
              reasoning: update.reasoning || entry.verdict?.reasoning || null,
            },
            verdictReasoning: update.reasoning || entry.verdictReasoning || null,
          };
        }),
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update verdicts');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveRow = async (entry: ModerationEntry) => {
    if (!entry._id) {
      return;
    }
    const key = rowKey(entry);
    const draft = drafts[key];
    if (!acknowledgeOverride || overrideReason.trim().length < 10) {
      setError('A reason of at least 10 characters and explicit final-say acknowledgement are required.');
      return;
    }
    await applyUpdates(
      [
        {
          id: String(entry._id),
          type: resolveObjectType(entry),
          status: typeof draft?.status === 'number' ? draft.status : 0,
          reasoning: String(draft?.reasoning || '').trim() || undefined,
          overrideReason: overrideReason.trim(),
          acknowledgeOverride: true,
        },
      ],
      'Verdict updated.',
    );
  };

  const handleBulkApply = async () => {
    if (typeof bulkStatus !== 'number' || selectedEntries.length === 0) {
      setError('Select at least one row and a verdict status for bulk update.');
      return;
    }
    if (!acknowledgeOverride || overrideReason.trim().length < 10) {
      setError('A reason of at least 10 characters and explicit final-say acknowledgement are required.');
      return;
    }
    const updates = selectedEntries
      .filter((entry) => entry._id)
      .map((entry) => {
        const key = rowKey(entry);
        const draft = drafts[key];
        return {
          id: String(entry._id),
          type: resolveObjectType(entry),
          status: bulkStatus,
          reasoning: String(draft?.reasoning || '').trim() || undefined,
          overrideReason: overrideReason.trim(),
          acknowledgeOverride: true as const,
        };
      });
    await applyUpdates(updates, `Applied bulk verdict update to ${updates.length} entr${updates.length === 1 ? 'y' : 'ies'}.`);
    setSelectedRows({});
    setAcknowledgeOverride(false);
  };

  return (
    <div className="container">
      <PageMeta title="Verdict Queue" description="Review and update verdict status for topics and arguments." />
      <h2>Verdict Queue</h2>
      <p className="text-muted">Review channel consensus, or use the exceptional administrator final-say path with an audited reason.</p>

      <div className="panel panel-default">
        <div className="panel-body">
          <form
            className="row"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSubmittedQuery(searchQuery.trim());
            }}
          >
            <div className="col-sm-3">
              <label htmlFor="verdict-type-filter">Entity type</label>
              <select
                id="verdict-type-filter"
                className="form-control"
                value={String(objectTypeFilter)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setPage(1);
                  setObjectTypeFilter(raw ? Number(raw) : '');
                }}
              >
                <option value="">All</option>
                <option value={String(TOPIC_OBJECT_TYPE)}>Topics</option>
                <option value={String(ARGUMENT_OBJECT_TYPE)}>Arguments</option>
              </select>
            </div>
            <div className="col-sm-3">
              <label htmlFor="verdict-status-filter">Current verdict</label>
              <select
                id="verdict-status-filter"
                className="form-control"
                value={String(verdictFilter)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setPage(1);
                  setVerdictFilter(raw ? Number(raw) : '');
                }}
              >
                <option value="">All</option>
                {statuses.map((status) => (
                  <option key={status.code} value={String(status.code)}>
                    {status.text}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-4">
              <label htmlFor="verdict-search-filter">Search title</label>
              <input
                id="verdict-search-filter"
                className="form-control"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search entries..."
              />
            </div>
            <div className="col-sm-2" style={{ marginTop: 25 }}>
              <button type="submit" className="btn btn-primary btn-block">
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      {canManageVerdicts ? <div className="panel panel-default">
        <div className="panel-heading">
          <strong>Administrator Final Say</strong>
        </div>
        <div className="panel-body">
          <div className="row">
            <div className="col-sm-6">
              <p className="text-muted" style={{ marginTop: 6, marginBottom: 0 }}>
                Selected: {selectedCount} / {entries.length}
              </p>
            </div>
            <div className="col-sm-3">
              <select
                aria-label="Bulk verdict status"
                className="form-control"
                value={String(bulkStatus)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setBulkStatus(raw ? Number(raw) : '');
                }}
              >
                <option value="">Select verdict</option>
                {statuses.map((status) => (
                  <option key={status.code} value={String(status.code)}>
                    {status.text}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-3">
              <button
                type="button"
                className="btn btn-warning btn-block"
                disabled={isApplying || selectedCount === 0 || typeof bulkStatus !== 'number' || !acknowledgeOverride || overrideReason.trim().length < 10}
                onClick={() => void handleBulkApply()}
              >
                {isApplying ? 'Applying...' : 'Apply to Selected'}
              </button>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label htmlFor="bulk-override-reason">Required final-say reason</label>
            <textarea
              id="bulk-override-reason"
              className="form-control"
              rows={2}
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Explain why an administrator decision is necessary instead of the normal consensus path"
            />
          </div>
          <div className="checkbox">
            <label>
              <input
                type="checkbox"
                checked={acknowledgeOverride}
                onChange={(event) => setAcknowledgeOverride(event.target.checked)}
              />{' '}
              I acknowledge these changes are administrator final-say decisions and will be distinguishable from consensus.
            </label>
          </div>
        </div>
      </div> : null}

      {isLoading ? <p className="text-muted">Loading verdict queue...</p> : null}

      {!isLoading && entries.length === 0 ? (
        <div className="alert alert-info">No entries found for the current filters.</div>
      ) : null}

      {!isLoading && entries.length > 0 ? (
        <div className="panel panel-default">
          <div className="table-responsive">
            <table className="table table-striped table-condensed">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    {canManageVerdicts ? <input
                      type="checkbox"
                      aria-label="Select all rows"
                      checked={allRowsSelected}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        if (!checked) {
                          setSelectedRows({});
                          return;
                        }
                        const next: Record<string, boolean> = {};
                        entries.forEach((entry) => {
                          next[rowKey(entry)] = true;
                        });
                        setSelectedRows(next);
                      }}
                    /> : null}
                  </th>
                  <th>Entry</th>
                  <th style={{ width: 110 }}>Type</th>
                  <th style={{ width: 220 }}>Verdict</th>
                  <th>Reasoning</th>
                  <th style={{ width: 200 }}>Votes</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const key = rowKey(entry);
                  const draft = drafts[key] || {
                    status: typeof entry.verdict?.status === 'number' ? entry.verdict.status : 0,
                    reasoning: String(entry.verdict?.reasoning || entry.verdictReasoning || ''),
                  };
                  return (
                    <tr key={key}>
                      <td>
                        {canManageVerdicts ? <input
                          type="checkbox"
                          aria-label={`Select ${entry.title || entry._id || 'entry'}`}
                          checked={Boolean(selectedRows[key])}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setSelectedRows((prev) => ({ ...prev, [key]: checked }));
                          }}
                        /> : null}
                      </td>
                      <td>
                        <strong>{entry.title || '(Untitled)'}</strong>
                      </td>
                      <td>
                        <span className="label label-default">{entry.objectName || 'argument'}</span>
                      </td>
                      <td>
                        <select
                          className="form-control input-sm"
                          aria-label={`Verdict for ${entry.title || entry._id || 'entry'}`}
                          value={String(draft.status)}
                          disabled={!canManageVerdicts}
                          onChange={(event) => updateDraft(entry, { status: Number(event.target.value) })}
                        >
                          {statuses.map((status) => (
                            <option key={status.code} value={String(status.code)}>
                              {status.text}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="form-control input-sm"
                          aria-label={`Reasoning for ${entry.title || entry._id || 'entry'}`}
                          value={draft.reasoning}
                          disabled={!canManageVerdicts}
                          onChange={(event) => updateDraft(entry, { reasoning: event.target.value })}
                          placeholder="Optional reasoning"
                        />
                      </td>
                      <td>
                        <div>
                          <span className={`label ${entry.voteSummary?.channels?.factual.reached ? 'label-success' : 'label-default'}`}>
                            F {entry.voteSummary?.channels?.factual.eligibleVotes || 0}/{entry.voteSummary?.channels?.factual.threshold || 2}
                          </span>{' '}
                          <span className={`label ${entry.voteSummary?.channels?.ethical.reached ? 'label-success' : 'label-default'}`}>
                            E {entry.voteSummary?.channels?.ethical.eligibleVotes || 0}/{entry.voteSummary?.channels?.ethical.threshold || 2}
                          </span>
                        </div>
                      </td>
                      <td>
                        {canManageVerdicts ? <button
                          type="button"
                          className="btn btn-xs btn-warning"
                          disabled={isApplying || !acknowledgeOverride || overrideReason.trim().length < 10}
                          onClick={() => void handleSaveRow(entry)}
                        >
                          Final Say
                        </button> : null}{canManageVerdicts ? ' ' : null}
                        <Link className="btn btn-xs btn-info" to={entryDetailsPath(entry)}>
                          Review Channels
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!isLoading && total > PAGE_LIMIT ? (
        <div className="text-center" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-default btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </button>{' '}
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>{' '}
          <button
            type="button"
            className="btn btn-default btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default VerdictsPage;
