import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCompanies } from '@/hooks/useCompanies'
import { definirEmpresaAtiva, empresaAtiva } from '@/lib/empresa-ativa'
import { LoadingState, PageHeader } from '@/components/ledger/Ui'
import { RowActions } from '@/components/ledger/RowActions'

const inputClass = 'lg-input w-full'

/**
 * Empresas da plataforma.
 *
 * É a única tela do sistema que enxerga mais de uma empresa, e por isso é a
 * única alcançável apenas pelo super administrador. Mesmo aqui, o que aparece
 * são contagens: nenhum dado operacional de uma empresa é exposto fora dela.
 */
export function CompanyList() {
  const { t } = useTranslation()
  const { companies, loading, error, create, setStatus } = useCompanies()

  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  const ativa = empresaAtiva()

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    setErroForm(null)

    try {
      await create({ name: nome, joinCode: codigo, cnpj: cnpj || null })
      setNome('')
      setCodigo('')
      setCnpj('')
    } catch (err) {
      setErroForm((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  function entrar(id: string) {
    definirEmpresaAtiva(id)
    window.location.replace('/dashboard')
  }

  if (loading) return <LoadingState label={t('common.loading')} />

  return (
    <div className="space-y-6">
      <PageHeader title={t('companies.title')} subtitle={t('companies.subtitle')} />

      {error && <p className="lg-alert lg-alert-error">{error}</p>}

      <form onSubmit={criar} className="lg-inner lg-reveal space-y-4 p-6">
        <h2 className="text-base font-semibold tracking-tight text-white">{t('companies.new')}</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className={inputClass}
            placeholder={t('companies.columns.name')}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            minLength={2}
          />
          <input
            className={inputClass}
            placeholder={t('companies.columns.joinCode')}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            required
            minLength={4}
            pattern="[A-Za-z0-9\-]+"
            title={t('companies.joinCodeHint')}
          />
          <input
            className={inputClass}
            placeholder={t('companies.columns.cnpj')}
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
          />
        </div>

        <p className="text-xs text-neutral-500">{t('companies.joinCodeHint')}</p>

        {erroForm && <p className="text-sm text-rose-400">{erroForm}</p>}

        <button type="submit" disabled={salvando} className="lg-btn-accent">
          {salvando ? t('common.saving') : t('companies.create')}
        </button>
      </form>

      <div className="lg-inner lg-reveal overflow-hidden">
        <div className="overflow-x-auto">
          <table className="lg-table min-w-full">
            <thead>
              <tr>
                <th>{t('companies.columns.name')}</th>
                <th>{t('companies.columns.joinCode')}</th>
                <th>{t('companies.columns.people')}</th>
                <th>{t('companies.columns.fleet')}</th>
                <th>{t('companies.columns.status')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {companies.map((empresa) => {
                const inativa = empresa.status === 'INACTIVE'

                return (
                  <tr key={empresa.id}>
                    <td className="font-medium text-white">
                      {empresa.name}
                      {empresa.id === ativa && (
                        <span className="lg-tag lg-tag-accent ml-2">
                          {t('companies.current')}
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-xs text-neutral-400">{empresa.joinCode}</td>
                    <td className="tabular-nums">
                      {empresa.activeUsers}
                      {empresa.pendingUsers > 0 && (
                        <span className="lg-tag lg-tag-warn ml-2">
                          {t('companies.pendingBadge', { count: empresa.pendingUsers })}
                        </span>
                      )}
                    </td>
                    <td>
                      {t('companies.fleetSummary', {
                        vehicles: empresa.vehicles,
                        drivers: empresa.drivers,
                      })}
                    </td>
                    <td>
                      <span className={`lg-tag ${inativa ? 'lg-tag-muted' : 'lg-tag-ok'}`}>
                        {inativa ? t('companies.inactive') : t('companies.active')}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {!inativa && empresa.id !== ativa && (
                          <button
                            onClick={() => entrar(empresa.id)}
                            className="lg-btn-ghost px-3 py-1 text-xs"
                          >
                            {t('companies.enter')}
                          </button>
                        )}
                        <RowActions
                          actions={[
                            {
                              label: inativa ? t('companies.activate') : t('companies.deactivate'),
                              onSelect: () =>
                                void setStatus(empresa.id, inativa ? 'ACTIVE' : 'INACTIVE'),
                              tone: inativa ? 'ok' : 'warn',
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-neutral-500">{t('companies.deactivateHint')}</p>
    </div>
  )
}
