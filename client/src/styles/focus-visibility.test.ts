import fs from 'fs';
import path from 'path';

describe('keyboard focus visibility', () => {
  it('ships a high-contrast focus-visible rule and no shell-level suppression', () => {
    const globalCss = fs.readFileSync(path.resolve(__dirname, 'global.css'), 'utf8');
    const shell = fs.readFileSync(path.resolve(process.cwd(), 'public/react-app.html'), 'utf8');
    expect(globalCss).toMatch(/a:focus-visible[\s\S]*outline:\s*3px solid #0b6b9c/);
    expect(globalCss).toMatch(/outline-offset:\s*2px/);
    expect(shell).not.toMatch(/focus-visible[\s\S]*outline:\s*none/);
  });
});
