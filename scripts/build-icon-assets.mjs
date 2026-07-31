import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import less from 'less';

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, 'public', 'dist');

const assets = [
  ['bootstrap/dist/fonts/glyphicons-halflings-regular.eot', 'fonts/glyphicons-halflings-regular.eot'],
  ['bootstrap/dist/fonts/glyphicons-halflings-regular.svg', 'fonts/glyphicons-halflings-regular.svg'],
  ['bootstrap/dist/fonts/glyphicons-halflings-regular.ttf', 'fonts/glyphicons-halflings-regular.ttf'],
  ['bootstrap/dist/fonts/glyphicons-halflings-regular.woff', 'fonts/glyphicons-halflings-regular.woff'],
  ['bootstrap/dist/fonts/glyphicons-halflings-regular.woff2', 'fonts/glyphicons-halflings-regular.woff2'],
  ['bootstrap/LICENSE', 'vendor-licenses/bootstrap-LICENSE.txt'],
  ['font-awesome/fonts/fontawesome-webfont.eot', 'fonts/fontawesome-webfont.eot'],
  ['font-awesome/fonts/fontawesome-webfont.svg', 'fonts/fontawesome-webfont.svg'],
  ['font-awesome/fonts/fontawesome-webfont.ttf', 'fonts/fontawesome-webfont.ttf'],
  ['font-awesome/fonts/fontawesome-webfont.woff', 'fonts/fontawesome-webfont.woff'],
  ['font-awesome/fonts/fontawesome-webfont.woff2', 'fonts/fontawesome-webfont.woff2'],
  ['font-awesome/README.md', 'vendor-licenses/font-awesome-README.md'],
  ['bootstrap-pincode-input/LICENSE', 'vendor-licenses/bootstrap-pincode-input-LICENSE.txt'],
];

for (const [sourceRelative, targetRelative] of assets) {
  const source = path.join(projectRoot, 'node_modules', sourceRelative);
  const target = path.join(outputRoot, targetRelative);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
}

const legacyLessRoot = path.join(projectRoot, 'legacy', 'static', 'less');
const legacyLayoutsRoot = path.join(projectRoot, 'legacy', 'static', 'layouts');
const bootstrapLessRoot = path.join(projectRoot, 'node_modules', 'bootstrap', 'less');
const fontAwesomeLessRoot = path.join(projectRoot, 'node_modules', 'font-awesome', 'less');
const toLessPath = (value) => value.split(path.sep).join('/');

function modernizeLegacyImports(source) {
  return source
    .replaceAll('../components/bootstrap/less/', `${toLessPath(bootstrapLessRoot)}/`)
    .replaceAll('../components/font-awesome/less/', `${toLessPath(fontAwesomeLessRoot)}/`);
}

async function compileLess(sources, targetRelative) {
  const source = modernizeLegacyImports(sources.join('\n'));
  const result = await less.render(source, {
    compress: true,
    filename: path.join(legacyLessRoot, 'modern-build.less'),
    paths: [legacyLessRoot, legacyLayoutsRoot],
  });
  const target = path.join(outputRoot, targetRelative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, result.css, 'utf8');
}

const appLess = await readFile(path.join(legacyLessRoot, 'app.less'), 'utf8');
await compileLess([appLess], 'css/app.min.css');

const coreSources = await Promise.all([
  readFile(path.join(legacyLessRoot, 'bootstrap-build.less'), 'utf8'),
  readFile(path.join(legacyLessRoot, 'font-awesome-build.less'), 'utf8'),
  readFile(path.join(projectRoot, 'node_modules', 'bootstrap-pincode-input', 'css', 'bootstrap-pincode-input.css'), 'utf8'),
  readFile(path.join(legacyLayoutsRoot, 'core.less'), 'utf8'),
]);
coreSources.push('@fa-font-path: "/dist/fonts";');
await compileLess(coreSources, 'css/core.min.css');

console.log(`Emitted ${assets.length + 2} legacy-compatible styles, fonts, and license assets.`);
