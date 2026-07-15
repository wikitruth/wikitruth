import type React from 'react';
import { createGeoPatternDataUrl } from '../../utils/geoPattern';

export const FALLBACK_FEATURE_SECTION_TITLES = [
  'Truth & Reality',
  'Religion & Worldviews',
  'Morality & Ethics',
];

export function buildFeatureHeaderStyle(title: string): React.CSSProperties {
  const seed = String(title || 'feature');
  try {
    return {
      backgroundImage: createGeoPatternDataUrl(seed),
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  } catch (_error) {
    return {};
  }
}
