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

  it('keeps Explore content tabs labeled and horizontally scrollable on mobile', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../styles/global.css'),
      'utf8'
    );

    expect(css).toMatch(/\.wt-explore-page \.nav\.nav-tabs\.wt-tabs\s*{[^}]*display:\s*flex/s);
    expect(css).toMatch(/\.wt-explore-page \.nav\.nav-tabs\.wt-tabs\s*{[^}]*overflow-x:\s*auto/s);
    expect(css).toMatch(/\.wt-explore-page \.nav\.nav-tabs\.wt-tabs\s*>\s*li\s*{[^}]*width:\s*auto/s);
    expect(css).toMatch(/\.wt-explore-page \.nav\.nav-tabs\.wt-tabs\s*>\s*li\s*>\s*a[\s\S]*?white-space:\s*nowrap/s);
  });

  it('keeps Explore anchors and every entry row clear of the fixed mobile header and gutters', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../styles/global.css'),
      'utf8'
    );
    const themeCss = fs.readFileSync(
      path.resolve(__dirname, '../../styles/theme.css'),
      'utf8'
    );

    expect(css).toMatch(/\.wt-explore-page #browse\s*{[^}]*scroll-margin-top:\s*70px/s);
    expect(css).toMatch(/\.list-group-item\.wt-entry-row,[\s\S]*?grid-template-columns:\s*var\(--wt-entry-row-icon-column\) minmax\(0, 1fr\)/s);
    expect(css).toMatch(/\.list-group-item\.wt-entry-row,[\s\S]*?padding-block:\s*var\(--wt-entry-row-padding-block\)[\s\S]*?padding-inline:\s*var\(--wt-entry-row-padding-inline-start\) var\(--wt-entry-row-padding-inline-end\)/s);
    expect(css).toMatch(/\.list-group-item\.wt-entry-row\s*>\s*\.wt-entry-row-icon\s*{[^}]*position:\s*static[^}]*justify-content:\s*center/s);
    expect(css).toMatch(/\.list-group-item\.wt-entry-row\s*>\s*\.wt-entry-row-main,[\s\S]*?{[^}]*float:\s*none[^}]*margin-left:\s*0/s);
    expect(themeCss).toMatch(/--wt-entry-row-padding-inline-start:\s*0px/);
    expect(themeCss).toMatch(/--wt-entry-row-padding-inline-end:\s*14px/);
    expect(themeCss).toMatch(/--wt-entry-row-column-gap:\s*10px/);
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
