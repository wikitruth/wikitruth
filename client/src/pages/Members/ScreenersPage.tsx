import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';
import type { User } from '../../types';
import type { LegacyResponse } from '../../types/legacy';

const ScreenersPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result = (await apiService.getScreeners()) as LegacyResponse;
    return (result.screeners || []) as unknown as User[];
  }, []);

  return (
    <MemberDirectoryPage
      title="Screeners"
      subtitle="Members who review and screen submissions"
      fetchMembers={fetchMembers}
    />
  );
};

export default ScreenersPage;
