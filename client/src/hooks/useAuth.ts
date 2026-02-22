import { useAuth as useAuthContext } from '../context/AuthContext';

const useAuth = () => {
  return useAuthContext();
};

export default useAuth;
