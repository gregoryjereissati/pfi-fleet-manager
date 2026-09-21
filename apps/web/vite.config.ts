import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Separa apenas as bibliotecas que o **caminho de entrada** já usa:
         * roteador, cliente do Supabase e i18n. São as que a tela de login
         * precisa de qualquer forma; dividi-las não muda o que é baixado,
         * apenas o distribui em arquivos que o navegador busca em paralelo e
         * invalida separadamente entre versões.
         *
         * O Recharts **não** entra aqui de propósito. Declarar um pacote para
         * ele faz o Vite pré-carregá-lo no `index.html`, e o gráfico voltaria
         * a ser baixado no login — exatamente o que a divisão por rota evita.
         * Sem regra, ele fica dentro do pacote do painel, que só é buscado
         * quando o painel é aberto.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('i18next')) return 'i18n'
          if (id.includes('react-router')) return 'router'
          return undefined
        },
      },
    },
  },
})
