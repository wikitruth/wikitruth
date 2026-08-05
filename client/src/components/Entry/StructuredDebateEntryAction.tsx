import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
  getStructuredDebateForEntry,
  type StructuredDebate,
} from '../../services/api/structuredDebates';

interface StructuredDebateEntryActionProps {
  objectName: string;
  entryId: string;
  title: string;
}

const StructuredDebateEntryAction: React.FC<StructuredDebateEntryActionProps> = ({ objectName, entryId, title }) => {
  const { user } = useAuth();
  const [debate, setDebate] = useState<StructuredDebate | null>(null);
  const [checked, setChecked] = useState(false);
  const canCreate = Boolean(user?.roles?.reviewer || user?.roles?.admin);

  useEffect(() => {
    let active = true;
    setChecked(false);
    if (!entryId) return () => { active = false; };
    void getStructuredDebateForEntry(objectName, entryId)
      .then((value) => { if (active) setDebate(value); })
      .catch(() => { if (active) setDebate(null); })
      .finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [entryId, objectName]);

  const createPath = useMemo(() => {
    const search = new URLSearchParams({
      entryObjectName: objectName,
      entryId,
      proposition: title,
    });
    return `/structured-debates/new?${search.toString()}`;
  }, [entryId, objectName, title]);

  if (!checked) return null;
  if (!debate && !canCreate) return null;

  return (
    <div className="pull-left entry-options">
      <Link className="text-muted no-underline" to={debate ? `/structured-debates/${encodeURIComponent(debate.id)}` : createPath}>
        <i className="fa fa-columns" aria-hidden="true"></i>{' '}
        <span>{debate ? 'Structured Debate' : 'Start Debate'}</span>
      </Link>
    </div>
  );
};

export default StructuredDebateEntryAction;
