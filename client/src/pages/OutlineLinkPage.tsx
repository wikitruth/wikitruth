import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';

type OutlineSearchItem = {
  _id: string;
  title: string;
  objectName: 'topic' | 'argument' | 'artifact';
  friendlyUrl?: string;
};

type TopicTreeNode = {
  _id: string;
  title: string;
  objectName: 'topic';
  friendlyUrl?: string;
  children?: TopicTreeNode[];
};

type GraphRelationship = 'child' | 'support' | 'oppose' | 'related' | 'evidence' | 'source' | 'dependency' | 'supports' | 'refutes' | 'qualifies' | 'background';

const RELATIONSHIPS: Array<{ value: GraphRelationship; label: string }> = [
  { value: 'child', label: 'Child: belongs under the parent' },
  { value: 'support', label: 'Support: provides a supporting claim' },
  { value: 'oppose', label: 'Oppose: provides a counterclaim' },
  { value: 'related', label: 'Related: useful contextual connection' },
  { value: 'evidence', label: 'Evidence: artifact substantiates the parent' },
  { value: 'source', label: 'Source: artifact is a source for the parent' },
  { value: 'supports', label: 'Supports: artifact supports the claim' },
  { value: 'refutes', label: 'Refutes: artifact contradicts the claim' },
  { value: 'qualifies', label: 'Qualifies: artifact narrows or conditions the claim' },
  { value: 'background', label: 'Background: artifact provides context only' },
  { value: 'dependency', label: 'Dependency: parent depends on the target' },
];

const OutlineLinkPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentId = searchParams.get('parentId') || '';
  const parentTitle = searchParams.get('parentTitle') || '';
  const [targetId, setTargetId] = useState('');
  const [relationship, setRelationship] = useState<GraphRelationship>('child');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<OutlineSearchItem[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<OutlineSearchItem | null>(null);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeRoots, setTreeRoots] = useState<TopicTreeNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locatorType, setLocatorType] = useState('page');
  const [locator, setLocator] = useState('');
  const [citationQuote, setCitationQuote] = useState('');
  const [citationNote, setCitationNote] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadTree = async () => {
      try {
        setTreeLoading(true);
        const result = await apiService.getOutlineTree(parentId || undefined, 2);
        if (!mounted) {
          return;
        }
        if (result.tree) {
          setTreeRoots([result.tree as TopicTreeNode]);
        } else {
          setTreeRoots((result.trees as TopicTreeNode[]) || []);
        }
      } catch (_error) {
        if (mounted) {
          setTreeRoots([]);
        }
      } finally {
        if (mounted) {
          setTreeLoading(false);
        }
      }
    };
    void loadTree();
    return () => {
      mounted = false;
    };
  }, [parentId]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const result = await apiService.searchOutlineTargets(searchTerm.trim(), {
          types: 'topic,argument,artifact',
          limit: 25,
        });
        if (!cancelled) {
          setSearchResults((result.results || []) as OutlineSearchItem[]);
        }
      } catch (_error) {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchTerm]);

  const selectedTargetId = useMemo(() => selectedTarget?._id || targetId.trim(), [selectedTarget, targetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentId || !selectedTargetId) {
      setError('Both parent and target entry IDs are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiService.createOutlineLink({
        parentId,
        targetId: selectedTargetId,
        relationship,
        citation: ['evidence', 'source', 'supports', 'refutes', 'qualifies', 'background'].includes(relationship)
          ? { locatorType, locator: locator.trim(), quote: citationQuote.trim(), note: citationNote.trim() }
          : undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTree = (nodes: TopicTreeNode[], level: number = 0): React.ReactNode => {
    if (!nodes.length) {
      return null;
    }
    return (
      <ul className="list-unstyled wt-outline-tree" style={{ marginLeft: level === 0 ? 0 : 16 }}>
        {nodes.map((node) => (
          <li key={node._id} style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="btn btn-link btn-xs wt-outline-tree-button"
              style={{ padding: 0, textAlign: 'left' }}
              onClick={() => {
                const asTarget: OutlineSearchItem = {
                  _id: node._id,
                  title: node.title,
                  objectName: 'topic',
                  friendlyUrl: node.friendlyUrl,
                };
                setSelectedTarget(asTarget);
                setTargetId(node._id);
              }}
            >
              <i className="fa fa-folder-open text-success" /> {node.title}
            </button>
            {renderTree(node.children || [], level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <PageMeta title="Link Outline Entry" description="Link an existing entry into an outline" />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Link to Outline', active: true }]} />
      <PageHeader
        title="Link to Outline"
        subtitle={parentTitle ? `Under: ${parentTitle}` : 'Link an existing entry'}
        icon="link"
        iconColor="text-primary"
      />

      {success && <Alert type="success">Link created successfully. Redirecting...</Alert>}
      {error && (
        <Alert type="danger" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="row">
        <div className="col-md-6">
          <div className="panel panel-default">
            <div className="panel-heading">
              <strong>Find Link Target</strong>
            </div>
            <div className="panel-body">
              <Input
                name="searchTarget"
                label="Search Topics, Arguments, or Artifacts"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type at least 2 characters..."
              />

              {searchLoading ? <p className="text-muted">Searching...</p> : null}
              {!searchLoading && searchTerm.trim().length >= 2 && searchResults.length === 0 ? (
                <p className="text-muted">No results found.</p>
              ) : null}

              {searchResults.length > 0 && (
                <div className="list-group" style={{ marginBottom: 0 }}>
                  {searchResults.map((result) => (
                    <button
                      key={`${result.objectName}-${result._id}`}
                      type="button"
                      className={`list-group-item${selectedTarget?._id === result._id ? ' active' : ''}`}
                      onClick={() => {
                        setSelectedTarget(result);
                        setTargetId(result._id);
                      }}
                    >
                      <span className="label label-default" style={{ marginRight: 8 }}>
                        {result.objectName}
                      </span>
                      {result.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="panel panel-default">
            <div className="panel-heading">
              <strong>Topic Hierarchy</strong>
            </div>
            <div className="panel-body">
              {treeLoading ? (
                <p className="text-muted">Loading hierarchy...</p>
              ) : treeRoots.length > 0 ? (
                renderTree(treeRoots)
              ) : (
                <p className="text-muted">No hierarchy available.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSubmit}>
            <Input name="parentId" label="Parent Entry ID" value={parentId} onChange={() => {}} disabled />
            <Input
              name="targetId"
              label="Target Entry ID"
              value={targetId}
              onChange={(e) => {
                setTargetId(e.target.value);
                setSelectedTarget(null);
              }}
              placeholder="Enter or pick the ID of the entry to link"
              required
            />
            <div className="form-group">
              <label htmlFor="outline-relationship">Relationship</label>
              <select
                id="outline-relationship"
                className="form-control"
                value={relationship}
                onChange={(event) => setRelationship(event.target.value as GraphRelationship)}
              >
                {RELATIONSHIPS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p className="help-block">Evidence relationships require an artifact target; support and oppose require an argument.</p>
            </div>
            {['evidence', 'source', 'supports', 'refutes', 'qualifies', 'background'].includes(relationship) ? (
              <fieldset>
                <legend style={{ fontSize: 16 }}>Citation locator</legend>
                <div className="row">
                  <div className="col-sm-4 form-group">
                    <label htmlFor="citation-locator-type">Locator type</label>
                    <select id="citation-locator-type" className="form-control" value={locatorType} onChange={(event) => setLocatorType(event.target.value)}>
                      <option value="page">Page</option><option value="section">Section</option><option value="timestamp">Timestamp</option>
                      <option value="paragraph">Paragraph</option><option value="dataset_row">Dataset row</option><option value="quote">Quote</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-sm-8 form-group">
                    <label htmlFor="citation-locator">Exact location</label>
                    <input id="citation-locator" className="form-control" maxLength={500} value={locator} onChange={(event) => setLocator(event.target.value)} placeholder="Page 14, section 2.1, 00:03:20, or row identifier" />
                  </div>
                </div>
                <div className="form-group"><label htmlFor="citation-quote">Short excerpt</label><textarea id="citation-quote" className="form-control" maxLength={500} rows={2} value={citationQuote} onChange={(event) => setCitationQuote(event.target.value)} /></div>
                <div className="form-group"><label htmlFor="citation-note">How this evidence relates</label><textarea id="citation-note" className="form-control" maxLength={1000} rows={2} value={citationNote} onChange={(event) => setCitationNote(event.target.value)} /></div>
              </fieldset>
            ) : null}
            {selectedTarget ? (
              <p className="text-muted">
                Selected target: <strong>{selectedTarget.title}</strong> ({selectedTarget.objectName})
              </p>
            ) : null}
            <div className="form-group" style={{ marginTop: 24 }}>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                icon={submitting ? 'spinner fa-spin' : 'link'}
              >
                {submitting ? 'Linking...' : 'Create Link'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={() => navigate(-1)} icon="times">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OutlineLinkPage;
