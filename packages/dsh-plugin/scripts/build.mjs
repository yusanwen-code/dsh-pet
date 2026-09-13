import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import { validatePetManifest } from '@dsh-pet/protocol'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outdir = resolve(root, 'lib')
const defaultPackRoot = resolve(root, '../../pets/deepseek')
const requestedPackRoot = process.env.DSH_PET_PACK
  ? resolve(root, '../..', process.env.DSH_PET_PACK)
  : defaultPackRoot

async function readManifest(packRoot) {
  return JSON.parse(await readFile(resolve(packRoot, 'pet.json'), 'utf8'))
}

const fallbackResult = validatePetManifest(await readManifest(defaultPackRoot))
if (!fallbackResult.ok) throw new Error(`Bundled fallback pet is invalid: ${fallbackResult.errors.join('; ')}`)

let selectedResult
let validationErrors = []
try {
  selectedResult = validatePetManifest(await readManifest(requestedPackRoot))
  if (!selectedResult.ok) validationErrors = selectedResult.errors
} catch (error) {
  validationErrors = [`cannot read pet pack: ${error instanceof Error ? error.message : String(error)}`]
}

const activeManifest = selectedResult?.ok ? selectedResult.value : fallbackResult.value
const activePackRoot = selectedResult?.ok ? requestedPackRoot : defaultPackRoot
const states = ['idle', 'thinking', 'tool', 'success', 'error']
const petPackModule = {
  name: 'dsh-pet-pack',
  setup(builder) {
    builder.onResolve({ filter: /^dsh-pet:pack$/ }, () => ({ path: 'pack', namespace: 'dsh-pet-pack' }))
    builder.onLoad({ filter: /^pack$/, namespace: 'dsh-pet-pack' }, () => ({
      loader: 'js',
      resolveDir: activePackRoot,
      contents: `${states.map((state) => `import ${state}Asset from ${JSON.stringify(resolve(activePackRoot, activeManifest.assets[state].src))};`).join('\n')}
export const manifestInput = ${JSON.stringify(activeManifest)};
export const fallbackManifest = ${JSON.stringify(fallbackResult.value)};
export const validationErrors = ${JSON.stringify(validationErrors)};
export const assetUrls = { ${states.map((state) => `${state}: ${state}Asset`).join(', ')} };`,
    }))
  },
}

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
  plugins: [petPackModule],
  external: ['react', 'react/jsx-runtime'],
})

const body = client.outputFiles[0]?.text
if (!body) throw new Error('Client bundle did not produce JavaScript output')

const wrapped = `window.__ModuleLoader__.load({\n  id: "@dsh-pet/plugin",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n${body}\n    return module.exports;\n  }\n});\n`

await writeFile(resolve(outdir, 'client.js'), wrapped)
