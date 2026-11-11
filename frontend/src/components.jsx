import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSessao } from './sessao.jsx'
import { iniciais } from './formatos.js'
import { guardarTema, lerTema, outroTema } from './tema.js'

const CLASSE_ESTADO = {
  SUBMETIDO: 'azul',
  EM_TRIAGEM: 'amarelo',
  APROVADO: 'verde',
  REJEITADO: 'vermelho',
  PLANEADO: 'azul',
  EM_DESENVOLVIMENTO: 'amarelo',
  LANCADO: 'verde',
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
      disabled={ocupado || !pedido.aceita_votos}
      aria-pressed={pedido.votado}
      title={
        !pedido.aceita_votos
          ? 'Este pedido já não aceita alterações de votos'
          : pedido.votado ? 'Retirar voto' : 'Votar'
      }
    >
      ▲ {pedido.total_votos}
    </button>
  )
}

export function Erro({ erro }) {
  return erro ? <p className="erro" role="alert">{erro.message}</p> : null
}

export function BotaoTema() {
  const [tema, setTema] = useState(lerTema)
  const seguinte = outroTema(tema)
  return (
    <button
      className="botao-tema"
      onClick={() => {
        guardarTema(seguinte)
        setTema(seguinte)
      }}
      aria-label={`Mudar para o modo ${seguinte}`}
      title={`Mudar para o modo ${seguinte}`}
    >
      {tema === 'escuro' ? '☀️' : '🌙'}
    </button>
  )
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
          <BotaoTema />
          <Avatar nome={utilizador.nome} />
          <button className="ligacao" onClick={sair}>Sair</button>
        </div>
      </header>
      <div className="conteudo">{children}</div>
    </div>
  )
}

const CLASSE_ESTADO_STORY = { A_FAZER: 'cinza', EM_PROGRESSO: 'amarelo', EM_REVISAO: 'azul', CONCLUIDO: 'verde' }

export function EstadoStory({ story }) {
  return <span className={`pill pill-${CLASSE_ESTADO_STORY[story.estado]}`}>{story.estado_display}</span>
}

// Definition of Ready: a story só entra num Sprint com pelo menos um critério de aceitação.
export function Pronta({ story }) {
  return story.pronta
    ? <span className="chip chip-verde" title="Cumpre a Definition of Ready">✓ Pronta</span>
    : <span className="chip chip-aviso" title="Falta pelo menos um critério de aceitação">Sem critérios</span>
}
