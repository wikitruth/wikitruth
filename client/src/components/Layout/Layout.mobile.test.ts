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

  it('keeps mobile content aligned below a single-row fixed header', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../styles/global.css'),
      'utf8'
    );

    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?body\s*{[^}]*padding-top:\s*50px/s);
    expect(css).toMatch(/\.navbar-brand-label \.hidden-xxs\s*{[^}]*display:\s*none\s*!important/s);
  });

  it('keeps all Explore content tabs on one mobile row', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../styles/global.css'),
      'utf8'
    );

    expect(css).toMatch(/\.wt-explore-tabs\s*{[^}]*display:\s*flex/s);
    expect(css).toMatch(/\.wt-explore-tabs\s*>\s*li\s*{[^}]*width:\s*12\.5%/s);
    expect(css).toMatch(/\.wt-explore-tabs\s*>\s*li\s*>\s*a\s*{[^}]*margin-right:\s*0/s);
  });
});
