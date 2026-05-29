import * as esbuild from 'esbuild';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'dist'), { recursive: true });

const css = spawnSync(
  'npx',
  ['tailwindcss', '-i', './src/index.css', '-o', './dist/app.css', '--minify'],
  { cwd: root, shell: true, stdio: 'inherit' }
);
if (css.status !== 0) process.exit(1);

await esbuild.build({
  entryPoints: [join(root, 'src/main.jsx')],
  bundle: true,
  outfile: join(root, 'dist/app.js'),
  loader: { '.jsx': 'jsx' },
  format: 'esm',
  jsx: 'automatic',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
});

console.log('Build selesai → dist/app.js + dist/app.css');
