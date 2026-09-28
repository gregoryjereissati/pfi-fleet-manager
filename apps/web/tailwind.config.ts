import type { Config } from 'tailwindcss'

/**
 * Tokens do design system Ledger
 * (assets/developer-monetizati-design-system/.../design-system-fm2.html).
 *
 * Um preto de página, uma escada de superfícies quase pretas separadas por
 * linhas brancas de 5–10% e um único destaque: esmeralda. Os nomes antigos
 * (`gold`, `fleet-*`) apontam para os novos valores, para que nada fique com a
 * identidade anterior por esquecimento.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
      },
      transitionTimingFunction: {
        // Curva do botão de alternância do design system (knob e gaveta).
        spring: 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      colors: {
        lg: {
          canvas: '#000000',
          card: '#0A0B0E',
          app: '#0c0d10',
          inner: '#121317',
          hover: '#16171b',
          track: '#14181F',
          tooltip: '#1a1b20',
          elevated: '#1c1d24',
        },
        gold: '#34d399',
        'gold-hover': '#6ee7b7',
        'fleet-black': '#000000',
        'fleet-darker': '#0c0d10',
        'fleet-card': '#121317',
        'fleet-input': '#121317',
        'fleet-hover': '#16171b',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
