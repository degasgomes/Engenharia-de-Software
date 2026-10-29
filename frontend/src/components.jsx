import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSessao } from './sessao.jsx'
import { iniciais } from './formatos.js'

const CLASSE_ESTADO = {
  SUBMETIDO: 'azul',
  EM_TRIAGEM: 'amarelo',
  APROVADO: 'verde',
  REJEITADO: 'vermelho',
}

export function Avatar({ nome }) {
  return <span className="avatar" title={nome}>{iniciais(nome)}</span>
}

export function Estado({ pedido }) {
  return (
    <span className={`pill pill-${CLASSE_ESTADO[pedido.estado] ?? 'cinza'}`}>
      {pedido.estado_display}
    </span>
  )
}

export function BotaoVoto({ pedido, aoVotar, ocupado }) {
  return (
    <button
      className={pedido.votado ? 'voto votado' : 'voto'}
      onClick={() => aoVotar(pedido)}
      disabled={ocupado}
      aria-pressed={pedido.votado}
      title={pedido.votado ? 'Retirar voto' : 'Votar'}
    >
      ▲ {pedido.total_votos}
    </button>
  )
}

export function Erro({ erro }) {
  return erro ? <p className="erro" role="alert">{erro.message}</p> : null
}

export function Pagina({ titulo, children }) {
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const { utilizador, sair } = useSessao()

  function pesquisar(e) {
    e.preventDefault()
    const q = new FormData(e.target).get('q').trim()
    navegar(q ? `/pedidos?q=${encodeURIComponent(q)}` : '/pedidos')
  }

  return (
    <div className="pagina">
      <header className="topo">
        <h1>{titulo}</h1>
        <form className="pesquisa" onSubmit={pesquisar} role="search">
          <input name="q" placeholder="Pesquisar…" defaultValue={params.get('q') ?? ''} aria-label="Pesquisar pedidos" />
        </form>
        <button className="primario" onClick={() => navegar('/pedidos/novo')}>+ Novo pedido</button>
        <div className="conta">
          <Avatar nome={utilizador.nome} />
          <button className="ligacao" onClick={sair}>Sair</button>
        </div>
      </header>
      <div className="conteudo">{children}</div>
    </div>
  )
}
