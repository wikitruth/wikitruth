import React, { useMemo } from 'react';
import { createGeoPatternDataUrl } from '../../utils/geoPattern';

type DeterministicAvatarProps = {
  seed: string;
  label?: string;
  size?: number;
  className?: string;
};

const DeterministicAvatar: React.FC<DeterministicAvatarProps> = ({
  seed,
  label,
  size = 48,
  className = '',
}) => {
  const safeSeed = String(seed || label || 'wikitruth-user');
  const initial =
    String(label || seed || '?')
      .trim()
      .slice(0, 1)
      .toUpperCase() || '?';
  const backgroundImage = useMemo(() => createGeoPatternDataUrl(safeSeed), [safeSeed]);

  return (
    <span
      className={`wt-deterministic-avatar ${className}`.trim()}
      style={{ width: size, height: size, backgroundImage }}
      data-avatar-seed={safeSeed}
      role="img"
      aria-label={label ? `${label} avatar` : 'User avatar'}
      title={label}
    >
      {initial}
    </span>
  );
};

export default DeterministicAvatar;
