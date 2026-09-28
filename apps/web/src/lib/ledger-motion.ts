/**
 * Comportamentos globais do design system Ledger, instalados uma vez na
 * inicialização:
 *
 * - **Entrada ao rolar** (`animate-on-scroll` do design system): todo
 *   `.lg-reveal` começa com a animação pausada e ganha `.animate` quando 20%
 *   dele entra na tela. Toca uma vez só.
 * - **Lanterna**: todo `.lg-flashlight` recebe `--x/--y` com a posição do
 *   cursor, e o CSS desenha a borda esmeralda e o brilho que o seguem.
 *
 * Um único ouvinte e um único observador cobrem as telas que o React monta
 * depois, sem exigir código em cada página.
 */

const animados = new WeakSet<Element>()

export function installLedgerMotion() {
  if (typeof window === 'undefined') return

  document.addEventListener(
    'pointermove',
    (event) => {
      const alvo = event.target as Element | null
      const card = alvo?.closest?.('.lg-flashlight') as HTMLElement | null
      if (!card) return
      const rect = card.getBoundingClientRect()
      card.style.setProperty('--x', `${event.clientX - rect.left}px`)
      card.style.setProperty('--y', `${event.clientY - rect.top}px`)
    },
    { passive: true },
  )

  function animar(el: Element) {
    animados.add(el)
    el.classList.add('animate')
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue
        // 20% visível, como no design system — ou, para um bloco mais alto que
        // cinco telas, que nunca chegaria a 20%, um terço da tela já ocupado.
        const visivel =
          entrada.intersectionRatio >= 0.2 ||
          entrada.intersectionRect.height >= window.innerHeight / 3
        if (!visivel) continue
        observador.unobserve(entrada.target)
        animar(entrada.target)
      }
    },
    { threshold: [0, 0.05, 0.1, 0.2], rootMargin: '0px 0px -10% 0px' },
  )

  function acompanhar(el: Element) {
    if (animados.has(el)) {
      // O React reescreveu o className e levou o `.animate` junto: devolve.
      if (!el.classList.contains('animate')) el.classList.add('animate')
      return
    }
    observador.observe(el)
  }

  function varrer(raiz: Element | Document) {
    if (raiz instanceof Element && raiz.classList.contains('lg-reveal')) acompanhar(raiz)
    raiz.querySelectorAll('.lg-reveal').forEach(acompanhar)
  }

  varrer(document)

  new MutationObserver((mudancas) => {
    for (const mudanca of mudancas) {
      if (mudanca.type === 'attributes') {
        const el = mudanca.target as Element
        if (el.classList.contains('lg-reveal')) acompanhar(el)
        continue
      }
      mudanca.addedNodes.forEach((no) => {
        if (no instanceof Element) varrer(no)
      })
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  })
}
