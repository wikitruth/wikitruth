import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';

import Alert from '../../components/common/Alert';
import Breadcrumb from '../../components/common/Breadcrumb';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';
import PageMeta from '../../components/common/PageMeta';
import { useAuth } from '../../context/AuthContext';
import authApi, { type OnboardingTrack } from '../../services/api/auth';

const ACKNOWLEDGEMENT_LABELS: Record<string, string> = {
  search_before_creating: 'I will search the intended scope before creating a new entry.',
  separate_fact_and_ethics: 'I will keep factual claims separate from ethical judgements.',
  record_source_provenance: 'I will record provenance and limitations for evidence I add.',
  use_change_requests_for_protected_content: 'I will use change requests instead of overwriting protected content.',
  apply_source_quality_rubric: 'I will apply the five-dimension source-quality rubric.',
  keep_verdict_channels_independent: 'I will decide factual and ethical verdicts independently.',
  record_reasoned_privileged_decisions: 'I will provide reasons for every privileged decision.',
  escalate_conflicts_and_integrity_failures: 'I will escalate conflicts, exceptions, and integrity failures.',
};

const OnboardingPage: React.FC = () => {
  const { updateUser } = useAuth();
  const [tracks, setTracks] = useState<OnboardingTrack[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    authApi.onboarding()
      .then((result) => setTracks(result.tracks || []))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load onboarding'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (track: string, item: string) => {
    setSelected((current) => {
      const values = new Set(current[track] || []);
      if (values.has(item)) values.delete(item); else values.add(item);
      return { ...current, [track]: Array.from(values) };
    });
  };

  const complete = async (track: OnboardingTrack) => {
    try {
      setSaving(track.key);
      setError(null);
      setMessage(null);
      const result = await authApi.completeOnboarding(track.key, selected[track.key] || []);
      setTracks(result.tracks || []);
      updateUser(result.user);
      setMessage(`${track.title} completed. Your available roles have been refreshed.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to complete onboarding');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading onboarding..." />;
  }

  return (
    <div className="container">
      <PageMeta title="Role Onboarding" description="Complete contributor and reviewer responsibilities" />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Account', url: '/account' }, { title: 'Onboarding', active: true }]} />
      <PageHeader title="Role Onboarding" subtitle="Acknowledge the operating policies before using elevated capabilities." icon="graduation-cap" iconColor="text-primary" />
      {error ? <Alert type="danger" dismissible onDismiss={() => setError(null)}>{error}</Alert> : null}
      {message ? <Alert type="success" dismissible onDismiss={() => setMessage(null)}>{message}</Alert> : null}

      {tracks.map((track) => {
        const selectedItems = selected[track.key] || [];
        const ready = track.acknowledgements.every((item) => selectedItems.includes(item));
        return (
          <section className={`panel ${track.completed ? 'panel-success' : 'panel-default'}`} key={track.key}>
            <div className="panel-heading">
              <strong>{track.title}</strong>
              <span className="pull-right">{track.completed ? 'Completed' : `Policy ${track.policyVersion}`}</span>
            </div>
            <div className="panel-body">
              {!track.eligible ? (
                <p className="text-muted">This track becomes available after an administrator assigns the reviewer role.</p>
              ) : track.completed ? (
                <p>This track is complete{track.completedDate ? ` as of ${new Date(track.completedDate).toLocaleString()}` : ''}.</p>
              ) : (
                <>
                  <p>Review the <Link to="/policies">operating policies</Link>, then confirm every responsibility:</p>
                  {track.acknowledgements.map((item) => (
                    <div className="checkbox" key={item}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item)}
                          onChange={() => toggle(track.key, item)}
                        />{' '}
                        {ACKNOWLEDGEMENT_LABELS[item] || item}
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!ready || saving === track.key}
                    onClick={() => void complete(track)}
                  >
                    {saving === track.key ? 'Recording...' : `Complete ${track.title}`}
                  </button>
                </>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default OnboardingPage;
