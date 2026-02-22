import React from 'react';

interface ScreeningSelectorProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const ScreeningSelector: React.FC<ScreeningSelectorProps> = ({ value, options, onChange }) => {
  return (
    <select className="form-control" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};

export default ScreeningSelector;
