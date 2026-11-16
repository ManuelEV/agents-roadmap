import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeShiki from '@shikijs/rehype'
import { transformerNotationDiff, transformerNotationHighlight } from '@shikijs/transformers'
import type { ShikiTransformer } from 'shiki'

/** Lee `title="..."` del meta del bloque y expone lenguaje/título como data-attributes. */
const metaTransformer: ShikiTransformer = {
  name: 'meta-title',
  pre(node) {
    const raw = (this.options.meta as { __raw?: string } | undefined)?.__raw ?? ''
    const title = raw.match(/title="([^"]+)"/)?.[1]
    if (title) node.properties['data-title'] = title
    node.properties['data-lang'] = this.options.lang
  },
}

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeShiki,
            {
              themes: { light: 'github-light', dark: 'github-dark-dimmed' },
              defaultColor: false,
              addLanguageClass: true,
              transformers: [metaTransformer, transformerNotationHighlight(), transformerNotationDiff()],
            },
          ],
        ],
      }),
    },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
  ],
  server: { port: 5200 },
  // three.js queda solo en el chunk diferido de la vista 3D: no se descarga si nadie la activa.
  build: { chunkSizeWarningLimit: 1300 },
})
