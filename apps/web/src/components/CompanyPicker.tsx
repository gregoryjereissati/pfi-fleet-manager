import { useTranslation } from 'react-i18next'
import { ArrowRight, Building2 } from 'lucide-react'
import { useCompanies } from '@/hooks/useCompanies'
import { definirEmpresaAtiva } from '@/lib/empresa-ativa'
import { signOut } from '@/lib/supabase'
import { BrandMark, LoadingState } from '@/components/ledger/Ui'

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
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label={t('common.loading')} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg space-y-8">
        <div className="lg-in space-y-6">
          <BrandMark size={28} />
          <div>
            <p className="lg-eyebrow mb-4">{t('nav.companies')}</p>
            <h1 className="text-4xl font-light leading-[1.1] tracking-tight text-white">
              {t('companyPicker.title')}
            </h1>
            <p className="lg-muted mt-3 text-base">{t('companyPicker.subtitle')}</p>
          </div>
        </div>

        {error && <p className="lg-alert lg-alert-error">{error}</p>}

        {companies.length === 0 && !error && (
          <p className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-8 text-center text-sm text-neutral-500">
            {t('companyPicker.empty')}
          </p>
        )}

        <ul className="space-y-3">
          {companies.map((empresa, indice) => {
            const inativa = empresa.status === 'INACTIVE'

            return (
              <li
                key={empresa.id}
                className="lg-reveal"
                style={{ ['--lg-delay' as string]: `${0.1 + indice * 0.05}s` }}
              >
                <button
                  type="button"
                  disabled={inativa}
                  onClick={() => escolher(empresa.id)}
                  className={`lg-flashlight group flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/10 bg-lg-card px-5 py-4 text-left transition-colors ${
                    inativa ? 'cursor-not-allowed opacity-40' : 'hover:border-white/20'
                  }`}
                >
                  <span className="relative z-10 flex min-w-0 items-center gap-4">
                    <span className="lg-icon-tile">
                      <Building2 size={18} strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold tracking-tight text-white">
                        {empresa.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {t('companyPicker.summary', {
                          vehicles: empresa.vehicles,
                          drivers: empresa.drivers,
                        })}
                        {empresa.pendingUsers > 0 && (
                          <span className="text-yellow-400">
                            {` · ${t('companyPicker.pending', { count: empresa.pendingUsers })}`}
                          </span>
                        )}
                      </span>
                    </span>
                  </span>
                  {inativa ? (
                    <span className="lg-tag lg-tag-muted relative z-10">{t('companies.inactive')}</span>
                  ) : (
                    <ArrowRight
                      size={18}
                      strokeWidth={1.5}
                      className="relative z-10 shrink-0 text-emerald-400 transition-transform group-hover:translate-x-0.5"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <button
          onClick={() => void signOut().then(() => window.location.replace('/'))}
          className="w-full text-sm text-neutral-500 transition-colors hover:text-white"
        >
          {t('pending.logout')}
        </button>
      </div>
    </div>
  )
}
