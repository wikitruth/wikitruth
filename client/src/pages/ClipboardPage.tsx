import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

interface ClipboardItem {
  _id: string;
  title: string;
  type: string;
  entryId: string;
  friendlyUrl?: string;
  addedAt: string;
}

const STORAGE_KEY = 'wt_clipboard';

function loadClipboard(): ClipboardItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ClipboardItem[]) : [];
  } catch {
    return [];
  }
}

function saveClipboard(items: ClipboardItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Add a content entry to the clipboard (called from other pages). */
export function addToClipboard(item: Omit<ClipboardItem, 'addedAt'>): void {
  const items = loadClipboard().filter((i) => i._id !== item._id);
  items.unshift({ ...item, addedAt: new Date().toISOString() });
  saveClipboard(items.slice(0, 100)); // cap at 100
}

/** Remove an item from the clipboard. */
export function removeFromClipboard(id: string): void {
  saveClipboard(loadClipboard().filter((i) => i._id !== id));
}

function entryUrl(item: ClipboardItem): string {
  const base = `/${item.type}s/entry`;
  return item.friendlyUrl ? `${base}/${item.friendlyUrl}/${item.entryId}` : `${base}/${item.entryId}`;
}

function supportsOutlineLink(item: ClipboardItem): boolean {
  return item.type === 'topic' || item.type === 'argument';
}

const ClipboardPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchMode, setBatchMode] = useState<'copy' | 'move' | 'link'>('copy');
  const [targetParentId, setTargetParentId] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [batchResult, setBatchResult] = useState<{ type: 'success' | 'warning' | 'danger'; message: string } | null>(null);

  useEffect(() => {
    setItems(loadClipboard());
    setLoaded(true);
  }, []);

  useEffect(() => {
    setSelectedIds((previous) => previous.filter((id) => items.some((item) => item._id === id)));
  }, [items]);

  const selectableItems = useMemo(() => items.filter((item) => supportsOutlineLink(item)), [items]);
  const selectedCount = selectedIds.length;
  const allSelected = selectedCount > 0 && selectedCount === items.length;

  const handleRemove = (id: string) => {
    removeFromClipboard(id);
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  const handleClear = () => {
    saveClipboard([]);
    setItems([]);
    setSelectedIds([]);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((current) => current !== id) : [...previous, id]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(items.map((item) => item._id));
  };

  const applyBatchAction = async () => {
    if (!selectedIds.length) {
      setBatchResult({ type: 'warning', message: 'Select at least one clipboard item first.' });
      return;
    }
    if (!targetParentId.trim()) {
      setBatchResult({ type: 'warning', message: 'Target parent id is required for copy/move/link actions.' });
      return;
    }
    if (!user) {
      setBatchResult({ type: 'danger', message: 'Sign in is required for batch copy/move/link actions.' });
      return;
    }

    setBatchResult(null);
    setIsApplying(true);
    let linked = 0;
    let conflicts = 0;
    let unsupported = 0;
    let failed = 0;
    let permissionDenied = 0;

    const movedIds = new Set<string>();
    const selectedItems = items.filter((item) => selectedIds.includes(item._id));

    for (const item of selectedItems) {
      if (!supportsOutlineLink(item)) {
        unsupported += 1;
        continue;
      }

      try {
        const response = await apiService.createOutlineLink({
          parentId: targetParentId.trim(),
          targetId: item.entryId,
          relationship: 'child',
        }) as { created?: boolean; conflict?: string };

        if (response?.created === false || response?.conflict === 'already_linked') {
          conflicts += 1;
        } else {
          linked += 1;
        }

        if (batchMode === 'move') {
          movedIds.add(item._id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown clipboard action error';
        if (/401|403|auth|sign in|forbidden/i.test(message)) {
          permissionDenied += 1;
        } else {
          failed += 1;
        }
      }
    }

    if (batchMode === 'move' && movedIds.size > 0) {
      const nextItems = items.filter((item) => !movedIds.has(item._id));
      saveClipboard(nextItems);
      setItems(nextItems);
      setSelectedIds((prev) => prev.filter((id) => !movedIds.has(id)));
    }

    const actionLabel = batchMode === 'copy' ? 'copied' : batchMode === 'move' ? 'moved' : 'linked';
    const summary = `${linked} ${actionLabel}, ${conflicts} conflict(s), ${unsupported} unsupported, ${failed} failed, ${permissionDenied} permission denied.`;

    setBatchResult({
      type: failed > 0 || permissionDenied > 0 ? 'warning' : 'success',
      message: summary,
    });
    addToast(failed > 0 || permissionDenied > 0 ? 'warning' : 'success', summary);
    setIsApplying(false);
  };

  if (!loaded) return <LoadingSpinner message="Loading clipboard..." />;

  return (
    <div>
      <PageMeta title="Clipboard" description="Your saved content clipboard" />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Clipboard', active: true }]} />
      <PageHeader title="Clipboard" subtitle="Items you've saved for quick access" icon="clipboard" iconColor="text-info" />

      {items.length === 0 ? (
        <Alert type="info">
          Your clipboard is empty. Use the &quot;Copy to Clipboard&quot; action on any content entry to add it here.
        </Alert>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <Button variant="danger" size="sm" icon="trash" onClick={handleClear}>
              Clear All
            </Button>
          </div>
          <div className="panel panel-default">
            <div className="panel-heading">
              <strong>Batch Copy / Move / Link</strong>
            </div>
            <div className="panel-body">
              <div className="row">
                <div className="col-sm-3">
                  <label htmlFor="clipboard-mode">Action</label>
                  <select
                    id="clipboard-mode"
                    className="form-control"
                    value={batchMode}
                    onChange={(event) => setBatchMode(event.target.value === 'move' ? 'move' : event.target.value === 'link' ? 'link' : 'copy')}
                  >
                    <option value="copy">Copy (link and keep)</option>
                    <option value="move">Move (link and remove)</option>
                    <option value="link">Link only</option>
                  </select>
                </div>
                <div className="col-sm-6">
                  <label htmlFor="clipboard-target-parent">Target parent id</label>
                  <input
                    id="clipboard-target-parent"
                    className="form-control"
                    value={targetParentId}
                    onChange={(event) => setTargetParentId(event.target.value)}
                    placeholder="Topic or argument id"
                  />
                </div>
                <div className="col-sm-3">
                  <label>&nbsp;</label>
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => void applyBatchAction()}
                    disabled={isApplying || selectedCount === 0}
                  >
                    {isApplying ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              </div>
              <p className="text-muted" style={{ marginTop: 10, marginBottom: 0 }}>
                Selected: {selectedCount}. Link-capable entries: {selectableItems.length}. Topics and facts are link-capable.
              </p>
              {batchResult ? (
                <div className={`alert alert-${batchResult.type}`} style={{ marginTop: 12, marginBottom: 0 }}>
                  {batchResult.message}
                </div>
              ) : null}
            </div>
          </div>
          <div className="panel panel-default">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th style={{ width: 42 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all clipboard items"
                    />
                  </th>
                  <th>Title</th>
                  <th>Type</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item._id)}
                        onChange={() => toggleSelection(item._id)}
                        aria-label={`Select ${item.title}`}
                      />
                    </td>
                    <td>
                      <Link to={entryUrl(item)}>{item.title}</Link>
                    </td>
                    <td>
                      <span className="label label-default">{item.type}</span>
                      {!supportsOutlineLink(item) ? (
                        <span className="label label-warning" style={{ marginLeft: 8 }}>
                          no link target
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-xs btn-danger"
                        title="Remove"
                        onClick={() => handleRemove(item._id)}
                      >
                        <i className="fa fa-times" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ClipboardPage;
