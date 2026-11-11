import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api.js'
import { useSessao } from '../sessao.jsx'
import { useDados } from '../useDados.js'
import { Erro, Estado, Pagina } from '../components.jsx'
import { calcularGantt } from '../gantt.js'
import { codigoPedido, dataCurta } from '../formatos.js'

function Gantt({ releases }) {
  const gantt = calcularGantt(releases)
  if (!gantt) return null
  return (
    <section className="cartao">
      <h2>Roadmap</h2>
      <div className="gantt" role="img" aria-label="Roadmap das releases ao longo do tempo">
        <div className="gantt-linha gantt-meses">
          <span className="gantt-nome" />
          <div className="gantt-trilho">
            {gantt.meses.map((m) => (
              <span key={m.nome} className="gantt-mes" style={{ left: `${m.esquerda}%`, width: `${m.largura}%` }}>{m.nome}</span>
            ))}
          </div>
        </div>
        {gantt.linhas.map((l) => (
          <div key={l.release.id} className="gantt-linha">
            <span className="gantt-nome">{l.release.nome}</span>
            <div className="gantt-trilho">
              <div className="gantt-hoje" style={{ left: `${gantt.hoje}%` }} title="Hoje" />
              <div
                className={l.release.publicada ? 'gantt-barra publicada' : 'gantt-barra'}
                style={{ left: `${l.esquerda}%`, width: `${l.largura}%` }}
                title={`${l.release.nome}: até ${dataCurta(l.release.data_prevista)}`}
              >
                {l.release.pedidos.length} {l.release.pedidos.length === 1 ? 'pedido' : 'pedidos'}
              </div>
              {l.milestones.map((m) => (
                <span key={m.id} className="gantt-milestone" style={{ left: `${m.esquerda}%` }} title={`${m.nome} · ${dataCurta(m.data)}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="suave legenda">
        <span className="gantt-barra amostra" /> por publicar
        <span className="gantt-barra publicada amostra" /> publicada
        <span className="gantt-milestone amostra" /> milestone
        <span className="gantt-hoje amostra" /> hoje
      </p>
    </section>
  )
}

function Release({ release, aprovados, executar, ocupado, podePlanear }) {
  const [pedido, setPedido] = useState('')
  const [milestone, setMilestone] = useState({ nome: '', data: '' })
  const [aConfirmar, setAConfirmar] = useState(false)
  const gerir = podePlanear && !release.publicada

  return (
    <section className="cartao">
      <div className="cabecalho-cartao">
        <h2>
          {release.nome}{' '}
          <span className={release.publicada ? 'pill pill-verde' : 'pill pill-azul'}>{release.publicada ? 'Publicada' : 'Por publicar'}</span>
        </h2>
        <span className="suave">
          {release.publicada ? `Publicada a ${dataCurta(release.data_publicacao)}` : `Prevista para ${dataCurta(release.data_prevista)}`}
        </span>
      </div>

      <h3>Pedidos</h3>
      {release.pedidos.length === 0 && <p className="info">Ainda não há pedidos nesta release.</p>}
      {release.pedidos.map((p) => (
        <Link key={p.id} to={`/pedidos/${p.id}`} className="linha-recente linha-release">
          <span className="suave codigo">{codigoPedido(p.id)}</span>
          <span className="titulo-recente">{p.titulo}</span>
          <Estado pedido={p} />
        </Link>
      ))}

      <h3>Milestones</h3>
      {release.milestones.length === 0 && <p className="info">Sem milestones.</p>}
      <ul className="milestones">
        {release.milestones.map((m) => <li key={m.id}><span className="gantt-milestone amostra" /> {m.nome} <span className="suave">· {dataCurta(m.data)}</span></li>)}
      </ul>

      {gerir && (
        <>
          <form
            className="linha-formulario"
            onSubmit={async (e) => {
              e.preventDefault()
              if (await executar(() => api.associarPedido(release.id, pedido))) setPedido('')
            }}
          >
            <select value={pedido} onChange={(e) => setPedido(e.target.value)} required aria-label={`Pedido aprovado para a ${release.nome}`}>
              <option value="">Associar um pedido aprovado…</option>
              {aprovados.map((p) => <option key={p.id} value={p.id}>{codigoPedido(p.id)} {p.titulo}</option>)}
            </select>
            <button type="submit" className="secundario" disabled={ocupado || !pedido}>Associar</button>
          </form>
          <form
            className="linha-formulario"
            onSubmit={async (e) => {
              e.preventDefault()
              if (await executar(() => api.criarMilestone(release.id, milestone))) setMilestone({ nome: '', data: '' })
            }}
          >
            <input placeholder="Nome do milestone" aria-label={`Nome do milestone da ${release.nome}`} value={milestone.nome} onChange={(e) => setMilestone({ ...milestone, nome: e.target.value })} required />
            <input type="date" aria-label={`Data do milestone da ${release.nome}`} value={milestone.data} onChange={(e) => setMilestone({ ...milestone, data: e.target.value })} required />
            <button type="submit" className="secundario" disabled={ocupado}>+ Milestone</button>
          </form>
          <div className="acoes">
            {aConfirmar ? (
              <>
                <span className="suave">Os pedidos passam a Lançado e os clientes são avisados. Não dá para desfazer.</span>
                <button onClick={() => setAConfirmar(false)}>Cancelar</button>
                <button className="primario" disabled={ocupado} onClick={() => executar(() => api.publicarRelease(release.id))}>Confirmar publicação</button>
              </>
            ) : <button className="primario" onClick={() => setAConfirmar(true)}>Publicar release</button>}
          </div>
        </>
      )}
    </section>
  )
}

export default function Roadmap() {
  const { podePlanear } = useSessao()
  const { dados, erro, ocupado, executar } = useDados(async () => {
    const [releases, pedidos] = await Promise.all([api.obterRoadmap(), api.listarPedidos()])
    return { releases, pedidos }
  })
  const [nova, setNova] = useState({ nome: '', data_prevista: '' })

  if (!dados) return <Pagina titulo="Roadmap">{erro ? <Erro erro={erro} /> : <p className="info">A carregar…</p>}</Pagina>
  const aprovados = dados.pedidos.filter((p) => p.estado === 'APROVADO')

  return (
    <Pagina titulo="Roadmap">
      <Gantt releases={dados.releases} />
      <Erro erro={erro} />
      {dados.releases.length === 0 && <p className="info">Ainda não há releases planeadas.</p>}
      {podePlanear && (
        <form
          className="linha-formulario margem"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await executar(() => api.criarRelease(nova))) setNova({ nome: '', data_prevista: '' })
          }}
        >
          <input placeholder="Nome da release (ex.: v1.3)" aria-label="Nome da release" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} required />
          <input type="date" aria-label="Data prevista" value={nova.data_prevista} onChange={(e) => setNova({ ...nova, data_prevista: e.target.value })} required />
          <button type="submit" className="secundario" disabled={ocupado}>+ Nova release</button>
        </form>
      )}
      {dados.releases.map((r) => (
        <Release key={r.id} release={r} aprovados={aprovados} executar={executar} ocupado={ocupado} podePlanear={podePlanear} />
      ))}
    </Pagina>
  )
}
