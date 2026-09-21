import { useEffect, useState } from 'react'

/**
 * Aguarda uma pausa na digitação antes de deixar o valor passar adiante.
 *
 * Digitar uma placa disparava uma requisição por tecla. A pausa é curta o
 * bastante para não parecer travamento, e o valor imediato continua no campo —
 * quem digita não percebe atraso no que vê.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
