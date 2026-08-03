import React from 'react';
import { useContentVisibility } from '../../context/ContentVisibilityContext';
import { CONTENT_VISIBILITY_OPTIONS } from '../../utils/contentVisibility';

interface HeaderContentVisibilityChoicesProps {
  onSelected: () => void;
}

const HeaderContentVisibilityChoices: React.FC<HeaderContentVisibilityChoicesProps> = ({ onSelected }) => {
  const {
    preference,
    saving,
    setPreference,
  } = useContentVisibility();

  return (
    <>
      <li className="dropdown-header">Content visibility</li>
      {CONTENT_VISIBILITY_OPTIONS.map((option) => (
        <li key={option.value}>
          <button
            type="button"
            className="btn btn-link wt-user-menu-choice"
            disabled={saving}
            onClick={() => {
              void setPreference(option.value)
                .then(onSelected)
                .catch((error) => console.error('Failed to save content visibility:', error));
            }}
          >
            <i className={`fa ${preference === option.value ? 'fa-check-circle' : 'fa-circle-o'}`} aria-hidden="true"></i>
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        </li>
      ))}
    </>
  );
};

export default HeaderContentVisibilityChoices;
