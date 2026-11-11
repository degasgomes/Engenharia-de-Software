import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api.js'
import { usePedidos } from '../usePedidos.js'
import { Erro, Estado, Pagina } from '../components.jsx'
import { codigoPedido, dataCurta } from '../formatos.js'

// Um pedido passa de Submetido a Em Triagem logo na submissão, por isso Submetido não tem barra.
const ESTADOS = [
  ['EM_TRIAGEM', 'Em triagem'],
  ['APROVADO', 'Aprovado'],
  ['REJEITADO', 'Rejeitado'],
  ['PLANEADO', 'Planeado'],
  ['EM_DESENVOLVIMENTO', 'Em desenv.'],
  ['LANCADO', 'Lançado'],
]

function Indicador({ titulo, valor, nota }) {
  return (
    <section className="cartao indicador">
      <span className="suave">{titulo}</span>
      <strong>{valor}</strong>
      <small>{nota}</small>
    </section>
  )
}

export default function Dashboard() {
  const { pedidos, erro } = usePedidos()
  const [releases, setReleases] = useState([])

  useEffect(() => {
    api.obterRoadmap().then(setReleases).catch(() => {})
  }, [])

  if (!pedidos) return <Pagina titulo="Dashboard">{erro ? <Erro erro={erro} /> : <p className="info">A carregar…</p>}</Pagina>

  const contar = (estado) => pedidos.filter((p) => p.estado === estado).length
  const semanaPassada = Date.now() - 7 * 86400 * 1000
  const novos = pedidos.filter((p) => new Date(p.data_submissao) > semanaPassada).length
  const porEstado = ESTADOS.map(([estado, nome]) => ({ nome, total: contar(estado) }))
  const maximo = Math.max(1, ...porEstado.map((e) => e.total))
  // Um pedido rejeitado já não está em jogo, por mais votos que tenha.
  const maisVotados = pedidos
    .filter((p) => p.estado !== 'REJEITADO')
    .sort((a, b) => b.total_votos - a.total_votos).slice(0, 4)
  const maxVotos = Math.max(1, ...maisVotados.map((p) => p.total_votos))
  const recentes = [...pedidos]
    .sort((a, b) => new Date(b.data_submissao) - new Date(a.data_submissao))
    .slice(0, 4)
  const totalVotos = pedidos.reduce((soma, p) => soma + p.total_votos, 0)

  return (
    <Pagina titulo="Dashboard">
      <div className="grelha-4">
        <Indicador titulo="Pedidos submetidos" valor={pedidos.length} nota={`+${novos} nos últimos 7 dias`} />
        <Indicador titulo="Aprovados / Rejeitados" valor={`${contar('APROVADO')} / ${contar('REJEITADO')}`} nota="decisões do Gestor de Produto" />
        <Indicador titulo="Votos" valor={totalVotos} nota="em todos os pedidos" />
        <Indicador titulo="Por avaliar" valor={contar('SUBMETIDO') + contar('EM_TRIAGEM')} nota="à espera de decisão" />
      </div>

      <div className="grelha-2-1">
        <section className="cartao">
          <h2>Pedidos por estado</h2>
          <div className="barras">
            {porEstado.map((e) => (
              <div key={e.nome} className="barra">
                <span className="valor">{e.total}</span>
                <div style={{ height: `${(e.total / maximo) * 100}%` }} />
                <small>{e.nome}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="cartao">
          <h2>Mais votados</h2>
          {maisVotados.map((p) => (
            <div key={p.id} className="progresso">
              <Link to={`/pedidos/${p.id}`} className="suave">{p.titulo}</Link>
              <div className="trilho"><div className="suave-preenchido" style={{ width: `${(p.total_votos / maxVotos) * 100}%` }} /></div>
            </div>
          ))}
        </section>
      </div>

      {releases.length > 0 && (
        <section className="cartao">
          <div className="cabecalho-cartao">
            <h2>Progresso do roadmap</h2>
            <Link to="/roadmap" className="ligacao-suave">Ver roadmap →</Link>
          </div>
          {releases.map((r) => (
            <div key={r.id} className="progresso">
              <div className="linha-progresso">
                <strong>{r.nome}</strong>
                <span className="suave">
                  {r.pedidos.length} {r.pedidos.length === 1 ? 'pedido' : 'pedidos'} ·{' '}
                  {r.publicada ? `publicada a ${dataCurta(r.data_publicacao)}` : `prevista para ${dataCurta(r.data_prevista)}`}
                </span>
                <span>{r.progresso}%</span>
              </div>
              <div
                className="trilho"
                role="progressbar"
                aria-label={`Progresso da ${r.nome}`}
                aria-valuenow={r.progresso}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div style={{ width: `${r.progresso}%` }} />
              </div>
            </div>
          ))}
          <p className="suave nota-curta">Percentagem de User Stories concluídas nos pedidos de cada release.</p>
        </section>
      )}

      <section className="cartao">
        <div className="cabecalho-cartao">
          <h2>Pedidos recentes</h2>
          <Link to="/pedidos" className="ligacao-suave">Ver todos →</Link>
        </div>
        {recentes.map((p) => (
          <Link key={p.id} to={`/pedidos/${p.id}`} className="linha-recente">
            <span className="suave codigo">{codigoPedido(p.id)}</span>
            <span className="titulo-recente">{p.titulo}</span>
            <Estado pedido={p} />
            <span className="votos">▲ {p.total_votos}</span>
          </Link>
        ))}
        {recentes.length === 0 && <p className="info">Ainda não há pedidos.</p>}
      </section>
    </Pagina>
  )
}
