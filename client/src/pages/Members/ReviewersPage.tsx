import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';
import type { User } from '../../types';
import type { LegacyResponse } from '../../types/legacy';

const ReviewersPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result = (await apiService.getReviewers()) as LegacyResponse;
    return (result.reviewers || []) as unknown as User[];
  }, []);

  return (
    <MemberDirectoryPage
      title="Reviewers"
      subtitle="Members with reviewer privileges"
      fetchMembers={fetchMembers}
    />
  );
};

export default ReviewersPage;
