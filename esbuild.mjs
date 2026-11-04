import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const extensionOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  sourcesContent: false,
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(extensionOptions);
  await ctx.watch();
  console.log('watching…');
} else {
  await esbuild.build(extensionOptions);
}
