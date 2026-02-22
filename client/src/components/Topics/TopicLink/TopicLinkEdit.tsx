import React from 'react';

interface TopicLinkEditProps {
  value: string;
  onChange: (value: string) => void;
}

const TopicLinkEdit: React.FC<TopicLinkEditProps> = ({ value, onChange }) => {
  return (
    <input
      type="text"
      className="form-control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

export default TopicLinkEdit;
