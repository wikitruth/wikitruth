import React from 'react';

interface FormErrorProps {
  message?: string;
}

const FormError: React.FC<FormErrorProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  return <p className="help-block text-danger">{message}</p>;
};

export default FormError;
