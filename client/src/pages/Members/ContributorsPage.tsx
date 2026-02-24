import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';
import type { User } from '../../types';
import type { LegacyResponse } from '../../types/legacy';

const ContributorsPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result = (await apiService.getMembers()) as LegacyResponse;
    return (result.contributors || []) as unknown as User[];
  }, []);

  return (
    <MemberDirectoryPage
      title="Contributors"
      subtitle="Community members with public profiles"
      fetchMembers={fetchMembers}
    />
  );
};

export default ContributorsPage;
