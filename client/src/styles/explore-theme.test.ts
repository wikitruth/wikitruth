import fs from 'fs';
import path from 'path';

describe('Explore theme styles', () => {
  it('uses theme tokens for legacy category, tabs, and list surfaces', () => {
    const css = fs.readFileSync(path.resolve(__dirname, 'global.css'), 'utf8');

    expect(css).toMatch(
      /\.wt-explore-page \.media\.wt-category \.media-body > div a\s*{[^}]*color:\s*var\(--wt-text-muted\)/s
    );
    expect(css).toMatch(
      /\.wt-explore-page \.media\.wt-category \.media-body > div a\.wt-category-all-link\s*{[^}]*color:\s*var\(--wt-brand-primary\)/s
    );
    expect(css).toMatch(
      /\.wt-explore-page \.nav\.nav-tabs\.wt-tabs\s*{[^}]*background-color:\s*var\(--wt-surface-muted\)/s
    );
    expect(css).toMatch(
      /\.wt-explore-results \.list-group\.wt-list \.highlight\s*{[^}]*color:\s*var\(--wt-text\)/s
    );
  });

  it('gives selected filters an explicit dark-theme state', () => {
    const css = fs.readFileSync(path.resolve(__dirname, 'theme.css'), 'utf8');

    expect(css).toMatch(
      /\[data-theme='dark'\] \.wt-explore-page \.btn-default\.active[\s\S]*?background-color:\s*#465463/s
    );
  });

  it('keeps editorial entry rows flat instead of turning them into dark-mode cards', () => {
    const css = fs.readFileSync(path.resolve(__dirname, 'global.css'), 'utf8');

    expect(css).toMatch(
      /\.list-group-item\.wt-entry-row,[\s\S]*?background-color:\s*transparent/s
    );
    expect(css).not.toMatch(
      /\.wt-explore-results \.list-group\.wt-list \.wt-entry-row\s*{[^}]*background-color:/s
    );
  });
});
