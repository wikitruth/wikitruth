function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextValue(state: number): number {
  let value = state || 0x6d2b79f5;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

export function createGeoPatternDataUrl(seedValue: string): string {
  const seed = String(seedValue || 'wikitruth');
  let state = hashSeed(seed);
  const hue = state % 360;
  const saturation = 32 + ((state >>> 8) % 24);
  const lightness = 26 + ((state >>> 16) % 12);
  const cells: string[] = [];
  const columns = 6;
  const rows = 3;
  const cellWidth = 48;
  const cellHeight = 48;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      state = nextValue(state);
      const useLightFill = (state & 1) === 1;
      const opacity = (5 + ((state >>> 4) % 13)) / 100;
      cells.push(
        `<rect x="${column * cellWidth}" y="${row * cellHeight}" width="${cellWidth}" height="${cellHeight}" fill="${useLightFill ? '#fff' : '#000'}" fill-opacity="${opacity.toFixed(2)}"/>`
      );
    }
  }

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="288" height="144" viewBox="0 0 288 144">',
    `<rect width="288" height="144" fill="hsl(${hue} ${saturation}% ${lightness}%)"/>`,
    ...cells,
    '<path d="M0 144L144 0M96 144L240 0M192 144L288 48" stroke="#fff" stroke-opacity="0.04" stroke-width="2"/>',
    '</svg>',
  ].join('');

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
