import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';
import type { User } from '../../types';

const ReviewersPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result = await apiService.getReviewers();
    return (result.reviewers || []) as unknown as User[];
  }, []);

  return (
    <MemberDirectoryPage
      title="Reviewers"
      tab="reviewers"
      fetchMembers={fetchMembers}
    />
  );
};

export default ReviewersPage;
