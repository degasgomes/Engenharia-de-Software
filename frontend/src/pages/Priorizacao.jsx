import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessao } from '../sessao.jsx'
import { usePedidos } from '../usePedidos.js'
import Estimativa from '../Estimativa.jsx'
import { Erro, Estado, Pagina } from '../components.jsx'
import { codigoPedido, score } from '../formatos.js'

// Diagrama de Estados 1: o Gestor só decide depois da triagem.
const EM_AVALIACAO = ['EM_TRIAGEM']

// Posição de 1–5 dentro da matriz, com margem para os pontos não ficarem na borda.
const posicao = (valor) => `${8 + ((valor - 1) / 4) * 84}%`

export default function Priorizacao() {
  const { eGestor } = useSessao()
  const { pedidos, erro, substituir } = usePedidos()
  const [selecionadoId, setSelecionadoId] = useState(null)

  if (!pedidos) return <Pagina titulo="Priorização">{erro ? <Erro erro={erro} /> : <p className="info">A carregar…</p>}</Pagina>

  const avaliados = pedidos
    .filter((p) => score(p) !== null && p.estado !== 'REJEITADO')
    .sort((a, b) => score(b) - score(a) || b.total_votos - a.total_votos)
  const porEstimar = pedidos.filter((p) => EM_AVALIACAO.includes(p.estado) && score(p) === null)
  const selecionado =
    pedidos.find((p) => p.id === selecionadoId) ??
    (eGestor ? (porEstimar[0] ?? avaliados.find((p) => EM_AVALIACAO.includes(p.estado))) : null)

  return (
    <Pagina titulo="Priorização">
      <div className="grelha-1-1">
        <section className="cartao">
          <h2>Matriz impacto / esforço</h2>
          <div className="matriz-moldura">
            <span className="eixo-y">Impacto</span>
            <div className="matriz">
              <span className="quadrante q1">Ganhos rápidos</span>
              <span className="quadrante q2">Grandes apostas</span>
              <span className="quadrante q3">Preencher</span>
              <span className="quadrante q4">Evitar</span>
              {avaliados.map((p) => (
                <button
                  key={p.id}
                  className={`ponto ${p.id === selecionado?.id ? 'selecionado' : ''} ${p.estado === 'APROVADO' ? 'aprovado' : ''}`}
                  style={{ left: posicao(p.esforco), bottom: posicao(p.impacto) }}
                  onClick={() => setSelecionadoId(p.id)}
                  title={`${p.titulo} — impacto ${p.impacto}, esforço ${p.esforco}`}
                >
                  <span>{codigoPedido(p.id)}</span>
                </button>
              ))}
            </div>
            <div className="eixo-x"><span>Baixo</span><span>Esforço</span><span>Alto</span></div>
          </div>
        </section>

        <section className="cartao">
          <h2>Ranking de pedidos</h2>
          {avaliados.length === 0 && <p className="info">Ainda não há pedidos com estimativa.</p>}
          <ol className="ranking">
            {avaliados.map((p, i) => (
              <li key={p.id} className={p.id === selecionado?.id ? 'selecionado' : ''}>
                <button className="item-ranking" onClick={() => setSelecionadoId(p.id)}>
                  <span className="posicao">{i + 1}</span>
                  <span className="resumo">
                    <strong>{p.titulo}</strong>
                    <small className="suave">{codigoPedido(p.id)}</small>
                  </span>
                  <span className="suave">▲ {p.total_votos}</span>
                  <span className="pill pill-azul">Score {score(p)}</span>
                </button>
              </li>
            ))}
          </ol>
          {porEstimar.length > 0 && (
            <>
              <h3>Por estimar ({porEstimar.length})</h3>
              <ul className="por-estimar">
                {porEstimar.map((p) => (
                  <li key={p.id}>
                    <button className="ligacao" onClick={() => setSelecionadoId(p.id)}>
                      {codigoPedido(p.id)} · {p.titulo}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {selecionado && (
        <div className="selecao">
          <div className="cabecalho-cartao">
            <span>
              <strong>{selecionado.titulo}</strong> <Estado pedido={selecionado} />
            </span>
            <Link to={`/pedidos/${selecionado.id}`}>Ver pedido →</Link>
          </div>
          {eGestor && EM_AVALIACAO.includes(selecionado.estado) ? (
            <Estimativa key={selecionado.id} pedido={selecionado} aoGuardar={substituir} />
          ) : (
            <p className="info">
              {eGestor ? 'Este pedido já foi decidido.' : 'Só o Gestor de Produto pode alterar a estimativa.'}
            </p>
          )}
        </div>
      )}
    </Pagina>
  )
}
