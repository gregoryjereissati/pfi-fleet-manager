import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'

export function AppLayout() {
  const { pathname } = useLocation()
  // Em telas estreitas a barra lateral vira gaveta, aberta pelo botão do cabeçalho.
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    setMenuAberto(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={menuAberto} onClose={() => setMenuAberto(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onOpenMenu={() => setMenuAberto(true)} />
        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {/* A chave pela rota faz cada tela entrar com o desfoque do design
              system, em vez de trocar de conteúdo sem transição. */}
          <div key={pathname} className="lg-in mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
