import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import PageMeta from '../components/common/PageMeta';

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

const ClipboardPage: React.FC = () => {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(loadClipboard());
    setLoaded(true);
  }, []);

  const handleRemove = (id: string) => {
    removeFromClipboard(id);
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  const handleClear = () => {
    saveClipboard([]);
    setItems([]);
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
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <Link to={entryUrl(item)}>{item.title}</Link>
                    </td>
                    <td>
                      <span className="label label-default">{item.type}</span>
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
