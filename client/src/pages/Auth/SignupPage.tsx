import React from 'react';
import { Link } from 'react-router-dom';
import SocialLoginButtons from '../../components/Auth/SocialLoginButtons';

const SignupPage: React.FC = () => {
  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '60px' }}>
      <h2>Create your Wikitruth account</h2>
      <p className="text-muted">Registration form migration scaffold.</p>
      <SocialLoginButtons />
      <hr />
      <p>
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
};

export default SignupPage;
