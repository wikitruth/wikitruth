import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import useAuth from '../../hooks/useAuth';
import PageMeta from '../../components/common/PageMeta';

const LogoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const runLogout = async () => {
      try {
        await logout();
      } finally {
        navigate('/login', { replace: true });
      }
    };

    void runLogout();
  }, [logout, navigate]);

  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '60px' }}>
      <PageMeta title="Logout" />
      <p>Signing you out...</p>
    </div>
  );
};

export default LogoutPage;
