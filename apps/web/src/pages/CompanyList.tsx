import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCompanies } from '@/hooks/useCompanies'
import { definirEmpresaAtiva, empresaAtiva } from '@/lib/empresa-ativa'

const inputClass =
  'w-full rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-gold/50'

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

  if (loading) return <p className="text-sm text-white/40">{t('common.loading')}</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('companies.title')}</h1>
        <p className="text-sm text-white/40">{t('companies.subtitle')}</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <form
        onSubmit={criar}
        className="space-y-3 rounded-lg border border-white/[0.07] bg-fleet-card p-4"
      >
        <h2 className="text-sm font-semibold text-white/80">{t('companies.new')}</h2>

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

        <p className="text-xs text-white/30">{t('companies.joinCodeHint')}</p>

        {erroForm && <p className="text-sm text-red-400">{erroForm}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="rounded-md bg-gold/90 px-4 py-2 text-sm font-semibold text-fleet-black transition-colors hover:bg-gold disabled:opacity-40"
        >
          {salvando ? t('common.saving') : t('companies.create')}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-fleet-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-fleet-darker">
              <tr className="border-b border-white/[0.07] text-left text-white/40">
                <th className="px-4 py-3 font-medium">{t('companies.columns.name')}</th>
                <th className="px-4 py-3 font-medium">{t('companies.columns.joinCode')}</th>
                <th className="px-4 py-3 font-medium">{t('companies.columns.people')}</th>
                <th className="px-4 py-3 font-medium">{t('companies.columns.fleet')}</th>
                <th className="px-4 py-3 font-medium">{t('companies.columns.status')}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {companies.map((empresa) => {
                const inativa = empresa.status === 'INACTIVE'

                return (
                  <tr key={empresa.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 text-white">
                      {empresa.name}
                      {empresa.id === ativa && (
                        <span className="ml-2 rounded bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gold">
                          {t('companies.current')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/60">
                      {empresa.joinCode}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {empresa.activeUsers}
                      {empresa.pendingUsers > 0 && (
                        <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                          {t('companies.pendingBadge', { count: empresa.pendingUsers })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {t('companies.fleetSummary', {
                        vehicles: empresa.vehicles,
                        drivers: empresa.drivers,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          inativa ? 'bg-white/5 text-white/40' : 'bg-green-500/10 text-green-400'
                        }`}
                      >
                        {inativa ? t('companies.inactive') : t('companies.active')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!inativa && empresa.id !== ativa && (
                          <button
                            onClick={() => entrar(empresa.id)}
                            className="rounded border border-white/[0.1] px-2 py-1 text-xs text-white/60 transition-colors hover:text-white"
                          >
                            {t('companies.enter')}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            void setStatus(empresa.id, inativa ? 'ACTIVE' : 'INACTIVE')
                          }
                          className="rounded border border-white/[0.1] px-2 py-1 text-xs text-white/40 transition-colors hover:text-white/70"
                        >
                          {inativa ? t('companies.activate') : t('companies.deactivate')}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-white/30">{t('companies.deactivateHint')}</p>
    </div>
  )
}
