import React, { useCallback } from 'react';
import MemberDirectoryPage from './common/MemberDirectoryPage';
import apiService from '../../services/api';
import type { User } from '../../types';
import type { LegacyResponse } from '../../types/legacy';

const AdministratorsPage: React.FC = () => {
  const fetchMembers = useCallback(async () => {
    const result = (await apiService.getAdministrators()) as LegacyResponse;
    return (result.administrators || []) as unknown as User[];
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
