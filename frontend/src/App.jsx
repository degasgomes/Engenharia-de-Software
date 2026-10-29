import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useSessao } from './sessao.jsx'
import Entrar from './pages/Entrar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ListaPedidos from './pages/ListaPedidos.jsx'
import SubmeterPedido from './pages/SubmeterPedido.jsx'
import DetalhePedido from './pages/DetalhePedido.jsx'
import Priorizacao from './pages/Priorizacao.jsx'
import EmBreve from './pages/EmBreve.jsx'

const NOMES_PERFIL = { CLIENTE: 'Cliente', GESTOR_PRODUTO: 'Gestor de Produto' }

// Os ecrãs dos wireframes que dependem de módulos dos Sprints 4 e 5.
const FUTUROS = [
  { caminho: '/backlog', titulo: 'Backlog e Sprint', sprint: 4 },
  { caminho: '/roadmap', titulo: 'Roadmap', sprint: 4 },
  { caminho: '/user-stories', titulo: 'User Stories', sprint: 4 },
  { caminho: '/equipas', titulo: 'Equipas', sprint: 5 },
  { caminho: '/notificacoes', titulo: 'Notificações', sprint: 4 },
]

function MenuLateral() {
  const { utilizador } = useSessao()
  return (
    <aside className="lateral">
      <NavLink to="/" className="marca">FeatureFlow</NavLink>
      <nav>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/pedidos">Pedidos</NavLink>
        <NavLink to="/priorizacao">Priorização</NavLink>
        {FUTUROS.map((f) => (
          <NavLink key={f.caminho} to={f.caminho} className="futuro">{f.titulo}</NavLink>
        ))}
      </nav>
      <div className="perfil">
        <strong>{utilizador.nome}</strong>
        <span>{NOMES_PERFIL[utilizador.perfil] ?? utilizador.perfil}</span>
      </div>
    </aside>
  )
}

export default function App() {
  const { utilizador, aCarregar } = useSessao()

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
        {FUTUROS.map((f) => (
          <Route key={f.caminho} path={f.caminho} element={<EmBreve titulo={f.titulo} sprint={f.sprint} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
