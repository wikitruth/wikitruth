import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';

const ContributorsPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result: any = await apiService.getMembers();
    return result.contributors || [];
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
