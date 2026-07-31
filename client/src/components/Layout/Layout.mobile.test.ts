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
    expect(css).toMatch(/@media \(max-width: 479px\)[\s\S]*?\.navbar-brand-label \.hidden-xxs\s*{[^}]*display:\s*none\s*!important/s);
  });

  it('allows long profile names to wrap instead of overflowing mobile screens', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../styles/global.css'),
      'utf8'
    );

    expect(css).toMatch(/\.page-header\.wt-header\.wt-profile-header\s*{[^}]*overflow-wrap:\s*anywhere[^}]*word-break:\s*break-word/s);
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

  it('constrains fixed-width route containers to the main content column', () => {
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, 'Layout.tsx'),
      'utf8'
    );
    const globalCss = fs.readFileSync(
      path.resolve(__dirname, '../../styles/global.css'),
      'utf8'
    );

    expect(layoutSource).toContain('wt-main-column');
    expect(globalCss).toMatch(/\.wt-main-column\s*>\s*\.container\s*{[^}]*width:\s*auto/s);
  });

  it('uses a flex shell to keep the footer at the bottom of short pages', () => {
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, 'Layout.tsx'),
      'utf8'
    );
    const globalCss = fs.readFileSync(
      path.resolve(__dirname, '../../styles/global.css'),
      'utf8'
    );

    expect(layoutSource).toContain('className="wt-app-shell"');
    expect(layoutSource).toContain('<main className="wt-app-main">');
    expect(globalCss).toMatch(/\.wt-app-shell\s*{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*min-height:/s);
    expect(globalCss).toMatch(/\.wt-app-main\s*{[^}]*flex:\s*1 0 auto/s);
  });
});
