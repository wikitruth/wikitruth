import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';
import type { User } from '../../types';

const AdministratorsPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result = await apiService.getAdministrators();
    return (result.administrators || []) as unknown as User[];
  }, []);

  return (
    <MemberDirectoryPage
      title="Administrators"
      tab="administrators"
      fetchMembers={fetchMembers}
    />
  );
};

export default AdministratorsPage;
