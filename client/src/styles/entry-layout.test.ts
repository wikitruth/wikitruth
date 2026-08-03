import fs from 'fs';
import path from 'path';

describe('shared entry-page layout styles', () => {
  const globalCss = fs.readFileSync(path.resolve(__dirname, 'global.css'), 'utf8');
  const entryCss = fs.readFileSync(path.resolve(__dirname, 'entry.css'), 'utf8');

  it('wraps mobile breadcrumbs instead of creating a horizontal scroll trap', () => {
    expect(globalCss).toMatch(/\.breadcrumb\.wt-bc\s*{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap[^}]*overflow-x:\s*visible[^}]*white-space:\s*normal/s);
    expect(globalCss).toMatch(/\.breadcrumb\.wt-bc\s*>\s*li\s*{[^}]*overflow-wrap:\s*anywhere[^}]*white-space:\s*normal/s);
  });

  it('keeps primary entry actions in one flex row', () => {
    expect(entryCss).toMatch(/\.wt-entry-options-container\.wt-entry-action-bar\s*{[^}]*display:\s*flex[^}]*flex-wrap:\s*nowrap[^}]*overflow-x:\s*auto/s);
    expect(entryCss).toMatch(/\.wt-entry-action-bar\s*>\s*\.entry-options\s*{[^}]*float:\s*none\s*!important[^}]*flex:\s*0 0 auto/s);
  });

  it('makes the entry tab rail full bleed on mobile without changing its desktop card', () => {
    expect(entryCss).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.nav\.nav-tabs\.wt-tabs\.wt-entry-tabs\s*{[^}]*margin-right:\s*-15px[^}]*margin-left:\s*-15px[^}]*border-radius:\s*0/s);
  });
});
