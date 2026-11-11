import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import * as api from './api.js'
import { useSessao } from './sessao.jsx'
import Entrar from './pages/Entrar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ListaPedidos from './pages/ListaPedidos.jsx'
import SubmeterPedido from './pages/SubmeterPedido.jsx'
import DetalhePedido from './pages/DetalhePedido.jsx'
import Priorizacao from './pages/Priorizacao.jsx'
import UserStories from './pages/UserStories.jsx'
import BacklogSprint from './pages/BacklogSprint.jsx'
import Roadmap from './pages/Roadmap.jsx'
import Equipas from './pages/Equipas.jsx'
import Notificacoes from './pages/Notificacoes.jsx'

const NOMES_PERFIL = {
  CLIENTE: 'Cliente',
  GESTOR_PRODUTO: 'Gestor de Produto',
  GESTOR_PROJETO: 'Gestor de Projeto',
  PROGRAMADOR: 'Programador',
}

function MenuLateral() {
  const { utilizador, eInterno } = useSessao()
  const { pathname } = useLocation()
  const [porLer, setPorLer] = useState(0)

  // Atualiza o contador ao mudar de ecrã (por exemplo depois de ler as notificações).
  useEffect(() => {
    api.listarNotificacoes().then((lista) => setPorLer(lista.filter((n) => !n.lida).length)).catch(() => {})
  }, [pathname])

  return (
    <aside className="lateral">
      <NavLink to="/" className="marca">FeatureFlow</NavLink>
      <nav>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/pedidos">Pedidos</NavLink>
        <NavLink to="/priorizacao">Priorização</NavLink>
        {eInterno && <NavLink to="/user-stories">User Stories</NavLink>}
        {eInterno && <NavLink to="/backlog">Backlog e Sprint</NavLink>}
        <NavLink to="/roadmap">Roadmap</NavLink>
        {eInterno && <NavLink to="/equipas">Equipas</NavLink>}
        <NavLink to="/notificacoes">
          Notificações{porLer > 0 && <span className="contador" aria-label={`${porLer} por ler`}>{porLer}</span>}
        </NavLink>
      </nav>
      <div className="perfil">
        <strong>{utilizador.nome}</strong>
        <span>{NOMES_PERFIL[utilizador.perfil] ?? utilizador.perfil}</span>
      </div>
    </aside>
  )
}

export default function App() {
  const { utilizador, aCarregar, eInterno } = useSessao()

  if (aCarregar) return <p className="info centrado">A carregar…</p>
  if (!utilizador) {
    return (
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    )
  }

  return (
    <div className="app">
      <MenuLateral />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pedidos" element={<ListaPedidos />} />
        <Route path="/pedidos/novo" element={<SubmeterPedido />} />
        <Route path="/pedidos/:id" element={<DetalhePedido />} />
        <Route path="/priorizacao" element={<Priorizacao />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/notificacoes" element={<Notificacoes />} />
        {eInterno && <Route path="/user-stories" element={<UserStories />} />}
        {eInterno && <Route path="/backlog" element={<BacklogSprint />} />}
        {eInterno && <Route path="/equipas" element={<Equipas />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
