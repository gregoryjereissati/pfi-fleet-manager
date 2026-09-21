import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Reconhece uma data civil: dia do calendário, sem hora e sem fuso. */
const DATA_CIVIL = /^\d{4}-\d{2}-\d{2}$/

/**
 * Data de negócio no formato brasileiro.
 *
 * Vencimentos chegam da API como data civil (`YYYY-MM-DD`) e são formatados
 * diretamente, sem passar por `Date`. Convertê-los interpretaria o texto como
 * meia-noite **UTC**, e em qualquer fuso a oeste de Greenwich — o Brasil
 * inteiro — a tela exibiria o dia anterior ao gravado.
 *
 * Os demais valores marcam um instante no tempo e continuam sendo convertidos
 * para o fuso de quem lê, que é o comportamento correto para eles.
 */
export function formatDate(value: string | Date): string {
  if (typeof value === 'string' && DATA_CIVIL.test(value)) {
    const [ano, mes, dia] = value.split('-')
    return `${dia}/${mes}/${ano}`
  }

  return new Date(value).toLocaleDateString('pt-BR')
}

/**
 * Data civil de hoje, no fuso de quem está usando o sistema.
 *
 * Usada para comparar vencimentos: a contagem de dias que a pessoa espera ver
 * é a do calendário dela, não a de UTC.
 */
export function hojeCivil(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

/**
 * CPF com pontuação.
 *
 * Aceita nulo: a ficha de motorista vinculada a uma conta não guarda CPF
 * próprio — ele vem do usuário — e fichas anteriores à integração podem estar
 * incompletas.
 */
export function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return '—'
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
