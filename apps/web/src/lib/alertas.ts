import type { Alerts } from '@/hooks/useAlerts'
import { formatDate, hojeCivil } from '@/lib/utils'

export type Traduzir = (key: string, options?: Record<string, unknown>) => string

/**
 * Diferença em dias de calendário entre uma data civil e hoje.
 *
 * Ambas as pontas viram meia-noite UTC do dia civil correspondente, de modo
 * que o resultado não dependa da hora em que a tela foi aberta nem do fuso de
 * quem a abriu.
 */
export function diasAte(dataCivil: string): number {
  const emUtc = (dia: string) => Date.parse(`${dia}T00:00:00Z`)
  return Math.round((emUtc(dataCivil) - emUtc(hojeCivil())) / (1000 * 60 * 60 * 24))
}

/** Rótulo de prazo de um vencimento: vencido há N dias, vence hoje, vence em N dias. */
export function prazoDeVencimento(dataCivil: string, t: Traduzir): string {
  const dias = diasAte(dataCivil)
  if (dias < 0) return t('alerts.daysOverdue', { count: Math.abs(dias) })
  if (dias === 0) return t('alerts.dueToday')
  return t('alerts.daysRemaining', { count: dias })
}

/** Rótulo de prazo de uma manutenção: atrasada há N dias, hoje, em N dias. */
export function prazoDeManutencao(dataCivil: string, t: Traduzir): string {
  const dias = diasAte(dataCivil)
  if (dias < 0) return t('alerts.maintenanceLate', { count: Math.abs(dias) })
  if (dias === 0) return t('alerts.maintenanceToday')
  return t('alerts.maintenanceIn', { count: dias })
}

/** Um alerta de qualquer frente, no formato de uma linha de lista. */
export interface ItemDeAlerta {
  chave: string
  titulo: string
  prazo: string
  urgente: boolean
  /** Data civil do prazo, para ordenar. */
  data: string
  destino: string
}

/**
 * As três frentes numa lista só, da mais urgente para a menos urgente:
 * primeiro o que já venceu ou atrasou, depois pela data mais próxima.
 */
export function alertasEmOrdem(alertas: Alerts, t: Traduzir): ItemDeAlerta[] {
  const itens: ItemDeAlerta[] = [
    ...alertas.documents.map((documento) => ({
      chave: `doc-${documento.id}`,
      titulo: `${documento.vehiclePlate ?? documento.driverName ?? '-'} - ${t(`documents.types.${documento.type}`)}`,
      prazo: `${formatDate(documento.expiryDate)} - ${prazoDeVencimento(documento.expiryDate, t)}`,
      urgente: documento.status === 'EXPIRED',
      data: documento.expiryDate,
      destino: '/documents',
    })),
    ...alertas.maintenances.map((manutencao) => {
      const dia = manutencao.scheduledDate.slice(0, 10)
      return {
        chave: `man-${manutencao.id}`,
        titulo: `${manutencao.vehicle.plate} - ${manutencao.description}`,
        prazo: `${formatDate(dia)} - ${prazoDeManutencao(dia, t)}`,
        urgente: manutencao.status === 'OVERDUE',
        data: dia,
        destino: '/maintenances',
      }
    }),
    ...alertas.licenses.map((habilitacao) => ({
      chave: `cnh-${habilitacao.driverId}`,
      titulo: `${habilitacao.driverName} - CNH`,
      prazo: `${formatDate(habilitacao.cnhExpiry)} - ${prazoDeVencimento(habilitacao.cnhExpiry, t)}`,
      urgente: habilitacao.status === 'EXPIRED',
      data: habilitacao.cnhExpiry,
      destino: `/drivers/${habilitacao.driverId}`,
    })),
  ]

  return itens.sort((a, b) =>
    a.urgente !== b.urgente ? (a.urgente ? -1 : 1) : a.data.localeCompare(b.data),
  )
}
