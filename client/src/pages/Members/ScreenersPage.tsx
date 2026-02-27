import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';
import type { User } from '../../types';

const ScreenersPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result = await apiService.getScreeners();
    return (result.screeners || []) as unknown as User[];
  }, []);

  return (
    <MemberDirectoryPage
      title="Screeners"
      tab="screeners"
      fetchMembers={fetchMembers}
    />
  );
};

export default ScreenersPage;
