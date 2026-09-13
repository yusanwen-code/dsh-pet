import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outdir = resolve(root, 'lib')

await mkdir(outdir, { recursive: true })

await build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(outdir, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external: ['@deepseek-ai/cordis', '@deepseek-ai/dsh-session-projection'],
})

const client = await build({
  entryPoints: [resolve(root, 'src/client.tsx')],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  write: false,
  loader: { '.svg': 'dataurl', '.css': 'text' },
  external: ['react', 'react/jsx-runtime'],
})

const body = client.outputFiles[0]?.text
if (!body) throw new Error('Client bundle did not produce JavaScript output')

const wrapped = `window.__ModuleLoader__.load({\n  id: "@dsh-pet/plugin",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n${body}\n    return module.exports;\n  }\n});\n`

await writeFile(resolve(outdir, 'client.js'), wrapped)
