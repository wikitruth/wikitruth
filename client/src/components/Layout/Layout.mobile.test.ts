import fs from 'fs';
import path from 'path';

describe('mobile off-canvas layout', () => {
  it('removes the closed sidebar from layout so it cannot widen the document', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../styles/layout-mobile.css'),
      'utf8'
    );

    expect(css).toMatch(/\.row-offcanvas:not\(\.active\) \.sidebar-offcanvas\s*{[^}]*display:\s*none/s);
  });
});
