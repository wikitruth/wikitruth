import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';

const AdministratorsPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result: any = await apiService.getAdministrators();
    return result.administrators || [];
  }, []);

  return (
    <MemberDirectoryPage
      title="Administrators"
      subtitle="Platform administrators"
      fetchMembers={fetchMembers}
    />
  );
};

export default AdministratorsPage;
