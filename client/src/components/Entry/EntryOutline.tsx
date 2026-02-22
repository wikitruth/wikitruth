import React from 'react';

interface EntryOutlineProps {
  items: string[];
}

const EntryOutline: React.FC<EntryOutlineProps> = ({ items }) => {
  return (
    <ol className="wt-entry-outline">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
};

export default EntryOutline;
