import React from 'react';

interface ArgumentLinkEditProps {
  value: string;
  onChange: (value: string) => void;
}

const ArgumentLinkEdit: React.FC<ArgumentLinkEditProps> = ({ value, onChange }) => {
  return (
    <textarea
      className="form-control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
    />
  );
};

export default ArgumentLinkEdit;
