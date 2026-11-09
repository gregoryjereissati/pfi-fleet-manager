import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { mensagemDeErro } from '@/lib/erros'
import { formatDate } from '@/lib/utils'
import { LoadingState } from '@/components/ledger/Ui'

/** Uma entrada do histórico, como a API a devolve. */
interface Alteracao {
  id: string
  action: 'CREATE' | 'UPDATE' | 'CANCEL' | 'UNCANCEL' | 'DELETE' | 'LINK' | 'UNLINK'
  changes: Record<string, { de: unknown; para: unknown }> | null
  reason: string | null
  actorName: string
  createdAt: string
}

type Entidade = 'expenses' | 'maintenances'

interface HistoryDialogProps {
  entidade: Entidade
  id: string
  /** Rótulo do lançamento no cabeçalho, para saber de qual se trata. */
  titulo: string
  /** Placa a partir do identificador do veículo, quando a tela a conhece. */
  rotularVeiculo?: (id: string) => string | undefined
  onClose: () => void
}

const TOM_DA_ACAO: Record<Alteracao['action'], string> = {
  CREATE: 'text-emerald-400',
  UPDATE: 'text-sky-400',
  CANCEL: 'text-orange-400',
  UNCANCEL: 'text-emerald-400',
  DELETE: 'text-rose-400',
  LINK: 'text-emerald-400',
  UNLINK: 'text-orange-400',
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}(T|$)/

/**
 * Histórico de alterações de um lançamento: quem fez o quê, quando e por quê.
 *
 * O registro é gravado pela API a cada criação, correção, cancelamento e
 * reativação, com o nome do autor copiado no momento da ação. Esta janela só o
 * apresenta — o recorte de quem pode ver é o mesmo do lançamento.
 */
export function HistoryDialog({
  entidade,
  id,
  titulo,
  rotularVeiculo,
  onClose,
}: HistoryDialogProps) {
  const { t } = useTranslation()
  const getToken = useToken()
  const [alteracoes, setAlteracoes] = useState<Alteracao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      try {
        const token = await getToken()
        const dados = await apiFetch<Alteracao[]>(`/${entidade}/${id}/history`, token)
        if (!cancelado) setAlteracoes(dados)
      } catch (err) {
        if (!cancelado) setErro(mensagemDeErro(err, t))
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [entidade, id, getToken, t])

  useEffect(() => {
    function aoTeclar(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [onClose])

  function valor(campo: string, bruto: unknown): string {
    if (bruto === null || bruto === undefined || bruto === '') return '—'
    const texto = String(bruto)
    if (campo === 'vehicleId') return rotularVeiculo?.(texto) ?? t('history.otherVehicle')
    if (campo === 'amount') {
      const numero = Number(texto)
      return Number.isFinite(numero)
        ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : texto
    }
    if (campo === 'status') {
      return entidade === 'maintenances'
        ? t(`maintenances.statuses.${texto}`)
        : t(`history.entryStatus.${texto}`)
    }
    if (campo === 'type') {
      return t(
        entidade === 'maintenances' ? `maintenances.types.${texto}` : `expenses.types.${texto}`,
      )
    }
    if (DATA_ISO.test(texto)) return formatDate(texto.slice(0, 10))
    return texto
  }

  function quando(instante: string): string {
    const data = new Date(instante)
    return `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('history.title')}
        className="lg-in flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-lg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/5 px-7 py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              {t('history.title')}
            </h2>
            <p className="lg-muted mt-1 truncate text-sm">{titulo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg-icon-btn shrink-0"
            aria-label={t('actions.close')}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-5">
          {carregando ? (
            <LoadingState label={t('common.loading')} />
          ) : erro ? (
            <p className="lg-alert lg-alert-error">{erro}</p>
          ) : alteracoes.length === 0 ? (
            <p className="text-sm text-neutral-400">{t('history.empty')}</p>
          ) : (
            <ol className="space-y-5">
              {alteracoes.map((alteracao) => {
                const campos = Object.entries(alteracao.changes ?? {})
                return (
                  <li key={alteracao.id} className="border-l border-white/10 pl-4">
                    <p className="text-sm">
                      <span className={`font-semibold ${TOM_DA_ACAO[alteracao.action]}`}>
                        {t(`history.actions.${alteracao.action}`)}
                      </span>
                      <span className="text-neutral-400">
                        {' '}
                        {t('history.by', { name: alteracao.actorName })} ·{' '}
                        {quando(alteracao.createdAt)}
                      </span>
                    </p>
                    {alteracao.reason && (
                      <p className="mt-1 text-sm text-neutral-300">
                        {t('history.reason')}: {alteracao.reason}
                      </p>
                    )}
                    {campos.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {campos.map(([campo, mudanca]) => (
                          <li key={campo} className="text-sm text-neutral-400">
                            <span className="text-neutral-300">
                              {t(`history.fields.${campo}`, { defaultValue: campo })}
                            </span>
                            {': '}
                            {alteracao.action === 'CREATE'
                              ? valor(campo, mudanca?.para)
                              : `${valor(campo, mudanca?.de)} → ${valor(campo, mudanca?.para)}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
