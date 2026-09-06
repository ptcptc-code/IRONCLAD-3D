import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ['src/scene.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  outfile: 'scene.bundle.js',
  logLevel: 'info'
});
const [html, baseStyles, sceneStyles, sceneScript, application] = await Promise.all(
  ['index.html', 'styles.css', 'scene.css', 'scene.bundle.js', 'app.js'].map(filename => readFile(path.join(root, filename), 'utf8'))
);
const safeScript = source => source.replace(/<\/script/gi, '<\\/script');
const standalone = html
  .replace('<link rel="stylesheet" href="styles.css" />', () => '<style>' + baseStyles + '</style>')
  .replace('<link rel="stylesheet" href="scene.css" />', () => '<style>' + sceneStyles + '</style>')
  .replace('<script src="scene.bundle.js" defer></script>', '')
  .replace('<script src="app.js" defer></script>', '')
  .replace('</body>', () => '<script>' + safeScript(sceneScript) + '</script><script>' + safeScript(application) + '</script></body>');
await writeFile(path.join(root, 'IRONCLAD-3D.html'), standalone);
console.log('Standalone offline page: IRONCLAD-3D.html');

