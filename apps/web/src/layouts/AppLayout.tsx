import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { pathname } = useLocation()
  // Em telas estreitas a barra lateral vira gaveta, aberta pelo botão do cabeçalho.
  const [menuAberto, setMenuAberto] = useState(false)

  // A entrada com desfoque acontece só na primeira tela depois de entrar no
  // sistema. Repetida a cada clique no menu, ela atrasava a troca de aba e
  // parecia carregamento. Ajustar o estado durante a renderização evita que a
  // tela nova chegue a começar a animação antes de ser desligada.
  const [rotaInicial] = useState(pathname)
  const [navegou, setNavegou] = useState(false)
  if (!navegou && pathname !== rotaInicial) setNavegou(true)

  useEffect(() => {
    setMenuAberto(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={menuAberto} onClose={() => setMenuAberto(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onOpenMenu={() => setMenuAberto(true)} />
        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {/* A chave pela rota monta cada tela do zero; a entrada animada fica
              só para a primeira. */}
          <div
            key={pathname}
            className={cn('mx-auto w-full max-w-[1400px]', navegou ? 'lg-sem-entrada' : 'lg-in')}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
