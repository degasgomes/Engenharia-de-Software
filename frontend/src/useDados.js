import { useCallback, useEffect, useState } from 'react'

// Carrega dados da API e dá uma função `executar` que corre uma ação, mostra o erro
// (por exemplo o 422 da Definition of Ready) e volta a carregar.
export function useDados(carregar) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const recarregar = useCallback(
    () => carregar().then(setDados).catch(setErro),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const executar = useCallback(
    async (acao) => {
      setErro(null)
      setOcupado(true)
      try {
        await acao()
        await recarregar()
        return true
      } catch (err) {
        setErro(err)
        return false
      } finally {
        setOcupado(false)
      }
    },
    [recarregar],
  )

  return { dados, erro, ocupado, executar, recarregar }
}
