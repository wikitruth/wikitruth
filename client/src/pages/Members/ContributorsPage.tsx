import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';
import type { User } from '../../types';

const ContributorsPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result = await apiService.getMembers();
    return (result.contributors || []) as unknown as User[];
  }, []);

  return (
    <MemberDirectoryPage
      title="Contributors"
      subtitle="Community members with public profiles"
      tab="contributors"
      fetchMembers={fetchMembers}
    />
  );
};

export default ContributorsPage;
