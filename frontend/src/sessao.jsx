import { createContext, useContext, useEffect, useState } from 'react'
import * as api from './api.js'

const SessaoContext = createContext(null)

export function SessaoProvider({ children }) {
  const [utilizador, setUtilizador] = useState(null)
  const [aCarregar, setACarregar] = useState(Boolean(api.lerTokens()))

  useEffect(() => {
    if (!api.lerTokens()) return
    api
      .utilizadorAtual()
      .then(setUtilizador)
      .catch(() => api.sair())
      .finally(() => setACarregar(false))
  }, [])

  const valor = {
    utilizador,
    aCarregar,
    eGestor: utilizador?.perfil === 'GESTOR_PRODUTO',
    // Planeamento (Sprints, Equipas, Releases): Gestor de Produto ou de Projeto.
    podePlanear: ['GESTOR_PRODUTO', 'GESTOR_PROJETO'].includes(utilizador?.perfil),
    // Os Clientes não veem o backlog nem as equipas.
    eInterno: Boolean(utilizador) && utilizador.perfil !== 'CLIENTE',
    entrar: async (email, password) => setUtilizador(await api.entrar(email, password)),
    registar: async (dados) => setUtilizador(await api.registar(dados)),
    sair: () => {
      api.sair()
      setUtilizador(null)
    },
  }
  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSessao = () => useContext(SessaoContext)
