import React, { useMemo } from 'react';
import GeoPattern from 'geopattern';

interface GeoPatternBackgroundProps {
  seed: string;
  height?: number;
  className?: string;
  children?: React.ReactNode;
}

const GeoPatternBackground: React.FC<GeoPatternBackgroundProps> = ({
  seed,
  height = 120,
  className = '',
  children,
}) => {
  const style = useMemo(() => {
    let dataUrl = '';
    try {
      const pattern = GeoPattern.generate(seed);
      dataUrl = pattern.toDataUrl();
    } catch (_error) {
      dataUrl = '';
    }

    const fallbackUrl = "url('/img/green-bg-pattern.svg')";
    return {
      backgroundImage: dataUrl ? `${dataUrl}, ${fallbackUrl}` : fallbackUrl,
      backgroundSize: 'cover',
      height: `${height}px`,
    };
  }, [seed, height]);

  return (
    <div className={`wt-geo-pattern ${className}`.trim()} style={style}>
      {children}
    </div>
  );
};

export default GeoPatternBackground;
