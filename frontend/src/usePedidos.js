import { useCallback, useEffect, useState } from 'react'
import * as api from './api.js'

// Carrega a lista de pedidos e mantém-na atualizada depois de votos ou avaliações.
export function usePedidos() {
  const [pedidos, setPedidos] = useState(null)
  const [erro, setErro] = useState(null)
  const [aVotar, setAVotar] = useState(null)

  useEffect(() => {
    api.listarPedidos().then(setPedidos).catch(setErro)
  }, [])

  const substituir = useCallback((atualizado) => {
    setPedidos((lista) => lista?.map((p) => (p.id === atualizado.id ? atualizado : p)))
  }, [])

  const votar = useCallback(
    async (pedido) => {
      setAVotar(pedido.id)
      try {
        substituir(await api.votar(pedido.id))
      } catch (err) {
        setErro(err)
      } finally {
        setAVotar(null)
      }
    },
    [substituir],
  )

  return { pedidos, erro, aVotar, votar, substituir }
}
