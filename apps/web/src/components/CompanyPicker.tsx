import { useTranslation } from 'react-i18next'
import { Building2 } from 'lucide-react'
import { useCompanies } from '@/hooks/useCompanies'
import { definirEmpresaAtiva } from '@/lib/empresa-ativa'
import { signOut } from '@/lib/supabase'

/**
 * Escolha da empresa, apresentada ao super administrador antes de qualquer
 * outra tela.
 *
 * Ele não pertence a empresa alguma: enquanto não escolher uma, o servidor
 * recusa tudo o que é operacional com COMPANY_NOT_SELECTED. Esta tela existe
 * para tornar isso uma etapa do fluxo, e não um erro.
 *
 * Empresas inativas aparecem, marcadas e sem ação: escondê-las faria parecer
 * que sumiram, quando o que houve foi uma suspensão reversível.
 */
export function CompanyPicker() {
  const { t } = useTranslation()
  const { companies, loading, error } = useCompanies()

  function escolher(empresaId: string) {
    definirEmpresaAtiva(empresaId)
    // Recarrega para que todo estado em memória nasça já dentro da empresa
    // escolhida, sem sobra da anterior.
    window.location.replace('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fleet-black">
        <span className="text-sm text-white/40">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fleet-black px-6 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center text-white/30">
            <Building2 size={32} />
          </div>
          <h1 className="text-xl font-semibold text-white">{t('companyPicker.title')}</h1>
          <p className="text-sm text-white/40">{t('companyPicker.subtitle')}</p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {companies.length === 0 && !error && (
          <p className="rounded-lg border border-white/[0.08] px-4 py-6 text-center text-sm text-white/40">
            {t('companyPicker.empty')}
          </p>
        )}

        <ul className="space-y-2">
          {companies.map((empresa) => {
            const inativa = empresa.status === 'INACTIVE'

            return (
              <li key={empresa.id}>
                <button
                  type="button"
                  disabled={inativa}
                  onClick={() => escolher(empresa.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                    inativa
                      ? 'cursor-not-allowed border-white/[0.06] opacity-40'
                      : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-medium text-white">{empresa.name}</span>
                    <span className="block text-xs text-white/40">
                      {t('companyPicker.summary', {
                        vehicles: empresa.vehicles,
                        drivers: empresa.drivers,
                      })}
                      {empresa.pendingUsers > 0 &&
                        ` · ${t('companyPicker.pending', { count: empresa.pendingUsers })}`}
                    </span>
                  </span>
                  {inativa && (
                    <span className="rounded border border-white/[0.1] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
                      {t('companies.inactive')}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <button
          onClick={() => void signOut().then(() => window.location.replace('/'))}
          className="w-full text-xs text-white/30 transition-colors hover:text-white/60"
        >
          {t('pending.logout')}
        </button>
      </div>
    </div>
  )
}
