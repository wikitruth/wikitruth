import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';

const ScreenersPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result: any = await apiService.getScreeners();
    return result.screeners || [];
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
