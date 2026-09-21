import { useMemo } from 'react'
import { useSessionData } from '@/lib/session-data'

/**
 * Veículos para seletores e filtros.
 *
 * É a mesma lista em toda a aplicação, buscada uma vez. O recorte é do
 * servidor: gerente e administrador recebem a frota da empresa; o motorista
 * recebe apenas os veículos a que está vinculado — os mesmos em que a API
 * aceita um lançamento dele.
 *
 * `invalidate` existe porque cache que não invalida é pior que requisição
 * repetida: cadastrar um veículo precisa refletir no seletor sem recarregar
 * a página.
 */
export function useVehicleOptions() {
  const { vehicles, vehiclesLoading, invalidateVehicles } = useSessionData()

  // Os seletores sempre exibiram por placa; a ordenação é feita uma vez.
  const sorted = useMemo(
    () => [...vehicles].sort((a, b) => a.plate.localeCompare(b.plate)),
    [vehicles],
  )

  return { vehicles: sorted, loading: vehiclesLoading, invalidate: invalidateVehicles }
}
