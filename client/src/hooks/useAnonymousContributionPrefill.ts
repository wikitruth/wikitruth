import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../services/api';
import type { AnonymousContribution, AnonymousEntryType } from '../types/api';

export default function useAnonymousContributionPrefill(expectedType: AnonymousEntryType) {
  const [searchParams] = useSearchParams();
  const submissionId = String(searchParams.get('anonymousSubmission') || '').trim();
  const [submission, setSubmission] = useState<AnonymousContribution | null>(null);
  const [loading, setLoading] = useState(Boolean(submissionId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!submissionId) {
      setLoading(false);
      return () => { mounted = false; };
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiService.getAnonymousContribution(submissionId);
        if (!mounted) return;
        if (!result.submission || result.submission.entryType !== expectedType) {
          throw new Error(`This anonymous submission is not a ${expectedType}.`);
        }
        if (result.submission.status !== 'accepted') {
          throw new Error('Only accepted anonymous submissions can be adopted.');
        }
        setSubmission(result.submission);
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load anonymous submission.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [expectedType, submissionId]);

  return { submissionId, submission, loading, error };
}
