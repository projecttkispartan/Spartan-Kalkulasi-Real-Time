import * as esbuild from 'esbuild';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, readFileSync } from 'fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cssOut = join(root, 'dist/app.css');
mkdirSync(join(root, 'dist'), { recursive: true });

function buildCss() {
  const result = spawnSync(
    'npx',
    ['tailwindcss', '-i', './src/index.css', '-o', './dist/app.css'],
    { cwd: root, shell: true, encoding: 'utf-8' }
  );
  if (result.status !== 0) {
    console.error('Tailwind CSS build failed:', result.stderr || result.stdout);
    process.exit(1);
  }
  const css = readFileSync(cssOut, 'utf-8');
  if (css.includes('@tailwind') || css.includes('@apply')) {
    console.error('ERROR: dist/app.css tidak ter-compile. Tailwind gagal memproses CSS.');
    process.exit(1);
  }
  console.log(`CSS OK (${Math.round(css.length / 1024)} KB)`);
}

buildCss();

const tailwind = spawn(
  'npx',
  ['tailwindcss', '-i', './src/index.css', '-o', './dist/app.css', '--watch'],
  { cwd: root, shell: true, stdio: 'inherit' }
);

const ctx = await esbuild.context({
  entryPoints: [join(root, 'src/main.jsx')],
  bundle: true,
  outfile: join(root, 'dist/app.js'),
  loader: { '.jsx': 'jsx' },
  sourcemap: true,
  format: 'esm',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"' },
});

await ctx.watch();

const { hosts, port } = await ctx.serve({ servedir: root, port: 5173 });

console.log(`\n  Manufaktur BOM dev server`);
console.log(`  Local:   http://localhost:${port}`);
console.log(`  Network: http://${hosts[0]}:${port}\n`);

process.on('SIGINT', () => {
  tailwind.kill();
  process.exit(0);
});
