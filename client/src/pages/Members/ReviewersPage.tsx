import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';

const ReviewersPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result: any = await apiService.getReviewers();
    return result.reviewers || [];
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
