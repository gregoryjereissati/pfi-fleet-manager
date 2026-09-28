/**
 * Fundos do design system Ledger. Só CSS: nenhum script, canvas ou WebGL.
 *
 * - `hero`: preto de página com o "card glow field" (orbe esmeralda no alto à
 *   esquerda, roxo embaixo à direita) e o "contact glow" (brilho radial no
 *   canto superior direito e degradê esmeralda subindo da base). Usado nas
 *   telas de entrada.
 * - `app`: o canvas do painel (#0c0d10) com os dois orbes de brilho —
 *   esmeralda no alto à direita e azul embaixo à esquerda.
 */
export function LedgerBackdrop({ variant }: { variant: 'hero' | 'app' }) {
  if (variant === 'app') {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-lg-app">
        <div className="absolute right-0 top-0 h-[600px] w-[800px] -translate-y-1/4 translate-x-1/3 rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/3 translate-y-1/4 rounded-full bg-blue-500/5 blur-[120px]" />
      </div>
    )
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      <div className="absolute -left-[10%] -top-[20%] h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute -bottom-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_40%)]" />
      <div className="absolute bottom-0 left-0 h-[300px] w-full bg-gradient-to-t from-emerald-950/20 to-transparent" />
    </div>
  )
}
