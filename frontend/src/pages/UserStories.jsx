import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api.js'
import { useSessao } from '../sessao.jsx'
import { useDados } from '../useDados.js'
import { Erro, EstadoStory, Pagina, Pronta } from '../components.jsx'
import { codigoPedido, codigoStory } from '../formatos.js'

const COLUNAS = [
  ['A_FAZER', 'A Fazer'],
  ['EM_PROGRESSO', 'Em Progresso'],
  ['EM_REVISAO', 'Em Revisão'],
  ['CONCLUIDO', 'Concluído'],
]
// Diagrama de Estados 2: para onde cada coluna pode avançar e recuar.
const SEGUINTE = { A_FAZER: 'EM_PROGRESSO', EM_PROGRESSO: 'EM_REVISAO', EM_REVISAO: 'CONCLUIDO' }
const ANTERIOR = { EM_PROGRESSO: 'A_FAZER', EM_REVISAO: 'EM_PROGRESSO' }
const CRITERIO_VAZIO = { dado: '', quando: '', entao: '' }

function Editor({ story, executar, ocupado }) {
  const [descricao, setDescricao] = useState(story.descricao)
  const [pontos, setPontos] = useState(story.story_points ?? '')
  const [criterio, setCriterio] = useState(CRITERIO_VAZIO)
  const campo = (nome) => ({
    value: criterio[nome],
    onChange: (e) => setCriterio({ ...criterio, [nome]: e.target.value }),
    required: true,
  })

  return (
    <div className="editor-story">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          executar(() => api.editarUserStory(story.id, { descricao, story_points: pontos === '' ? null : Number(pontos) }))
        }}
      >
        <label>
          Descrição
          <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
        </label>
        <div className="acoes">
          <label className="em-linha">
            Story Points
            <input type="number" min="0" max="100" value={pontos} onChange={(e) => setPontos(e.target.value)} className="curto" />
          </label>
          <button type="button" className="perigo" disabled={ocupado} onClick={() => executar(() => api.apagarUserStory(story.id))}>
            Descartar
          </button>
          <button type="submit" className="primario" disabled={ocupado}>Guardar</button>
        </div>
      </form>

      <h3>Critérios de aceitação</h3>
      {story.criterios.length === 0 && <p className="info">Ainda não há critérios. Sem critérios, a story não entra num Sprint.</p>}
      <ul className="criterios">
        {story.criterios.map((c) => (
          <li key={c.id}>
            <span><b>Dado</b> {c.dado}, <b>quando</b> {c.quando}, <b>então</b> {c.entao}</span>
            <button className="ligacao" disabled={ocupado} onClick={() => executar(() => api.retirarCriterio(story.id, c.id))} aria-label="Retirar critério">✕</button>
          </li>
        ))}
      </ul>
      <form
        className="linha-formulario"
        onSubmit={async (e) => {
          e.preventDefault()
          if (await executar(() => api.acrescentarCriterio(story.id, criterio))) setCriterio(CRITERIO_VAZIO)
        }}
      >
        <input placeholder="Dado…" aria-label="Dado" {...campo('dado')} />
        <input placeholder="Quando…" aria-label="Quando" {...campo('quando')} />
        <input placeholder="Então…" aria-label="Então" {...campo('entao')} />
        <button type="submit" className="secundario" disabled={ocupado}>+ Critério</button>
      </form>
    </div>
  )
}

function Backlog({ stories, executar, ocupado, podePlanear }) {
  const [aberta, setAberta] = useState(null)
  if (stories.length === 0) return <p className="info">O Product Backlog está vazio. Gere uma User Story a partir de um pedido aprovado.</p>
  return (
    <ul className="lista">
      {stories.map((s, i) => (
        <li key={s.id} className="cartao story">
          <div className="linha-story">
            {podePlanear && (
              <div className="ordem">
                <button disabled={ocupado || i === 0} onClick={() => executar(() => api.moverNoBacklog(s.id, 'cima'))} aria-label="Subir no backlog">▲</button>
                <button disabled={ocupado || i === stories.length - 1} onClick={() => executar(() => api.moverNoBacklog(s.id, 'baixo'))} aria-label="Descer no backlog">▼</button>
              </div>
            )}
            <div className="resumo">
              <span className="suave codigo">
                {codigoStory(s.id)}
                {s.pedido && <> · <Link to={`/pedidos/${s.pedido}`}>{codigoPedido(s.pedido)} {s.pedido_titulo}</Link></>}
                {s.gerada_por_ia && <> · <span className="chip chip-ia">Esboço da IA</span></>}
              </span>
              <p className="descricao-story">{s.descricao}</p>
              <div className="etiquetas">
                <Pronta story={s} />
                <span className="chip">{s.story_points ?? '?'} SP</span>
                <span className="chip">{s.sprint_numero ? `Sprint ${s.sprint_numero}` : 'Product Backlog'}</span>
                {s.responsavel_nome && <span className="chip">{s.responsavel_nome}</span>}
              </div>
            </div>
            <EstadoStory story={s} />
            {podePlanear && (
              <button className="secundario" onClick={() => setAberta(aberta === s.id ? null : s.id)} aria-expanded={aberta === s.id}>
                {aberta === s.id ? 'Fechar' : 'Editar'}
              </button>
            )}
          </div>
          {aberta === s.id && <Editor key={s.id} story={s} executar={executar} ocupado={ocupado} />}
        </li>
      ))}
    </ul>
  )
}

// Um pedido só passa a Em Desenvolvimento (e o cliente só é avisado) se já estiver numa Release.
const EM_CURSO = ['EM_PROGRESSO', 'EM_REVISAO']
const semRelease = (s) => EM_CURSO.includes(s.estado) && s.pedido_estado === 'APROVADO'

function Quadro({ stories, executar, ocupado }) {
  const porPlanear = stories.filter(semRelease)
  return (
    <>
    {porPlanear.length > 0 && (
      <p className="aviso" role="note">
        {porPlanear.length === 1 ? 'Há 1 story em curso' : `Há ${porPlanear.length} stories em curso`} de pedidos que
        ainda não estão numa Release. Enquanto o pedido não for planeado, não passa a Em Desenvolvimento e o
        cliente não é avisado. <Link to="/roadmap">Planear no Roadmap →</Link>
      </p>
    )}
    <div className="quadro">
      {COLUNAS.map(([estado, nome]) => {
        const daColuna = stories.filter((s) => s.estado === estado)
        return (
          <section key={estado} className="coluna" aria-label={nome}>
            <h2>{nome} <span className="suave">({daColuna.length})</span></h2>
            {daColuna.map((s) => (
              <article key={s.id} className="cartao cartao-quadro">
                <span className="suave codigo">{codigoStory(s.id)}{s.sprint_numero ? ` · Sprint ${s.sprint_numero}` : ''}</span>
                <p>{s.descricao}</p>
                {semRelease(s) && <span className="chip chip-aviso">Pedido sem release</span>}
                <div className="acoes entre">
                  <button disabled={ocupado || !ANTERIOR[estado]} onClick={() => executar(() => api.mudarEstadoStory(s.id, ANTERIOR[estado]))} aria-label={`Recuar ${codigoStory(s.id)}`}>←</button>
                  <small className="suave">{s.responsavel_nome ?? 'Sem responsável'}</small>
                  <button disabled={ocupado || !SEGUINTE[estado]} onClick={() => executar(() => api.mudarEstadoStory(s.id, SEGUINTE[estado]))} aria-label={`Avançar ${codigoStory(s.id)}`}>→</button>
                </div>
              </article>
            ))}
          </section>
        )
      })}
    </div>
    </>
  )
}

export default function UserStories() {
  const { eGestor, podePlanear } = useSessao()
  const { dados, erro, ocupado, executar } = useDados(async () => {
    const [stories, pedidos] = await Promise.all([api.listarUserStories(), api.listarPedidos()])
    return { stories, pedidos }
  })
  const [separador, setSeparador] = useState('backlog')
  const [pedidoId, setPedidoId] = useState('')
  const [nova, setNova] = useState('')
  const [aviso, setAviso] = useState(null)

  if (!dados) return <Pagina titulo="User Stories">{erro ? <Erro erro={erro} /> : <p className="info">A carregar…</p>}</Pagina>

  const aprovados = dados.pedidos.filter((p) => ['APROVADO', 'PLANEADO', 'EM_DESENVOLVIMENTO'].includes(p.estado))

  async function gerar(e) {
    e.preventDefault()
    setAviso(null)
    let story
    const correu = await executar(async () => { story = await api.gerarUserStory(pedidoId) })
    if (!correu) return
    setAviso(
      story.gerada_por_ia
        ? `A IA escreveu o esboço ${codigoStory(story.id)}. Reveja-o e edite-o ou descarte-o.`
        : `A IA não respondeu. A story ${codigoStory(story.id)} foi criada com a descrição original do pedido, sem critérios.`,
    )
    setPedidoId('')
  }

  return (
    <Pagina titulo="User Stories">
      {eGestor && (
        <section className="cartao">
          <h2>Gerar User Story com IA</h2>
          <form className="linha-formulario" onSubmit={gerar}>
            <select value={pedidoId} onChange={(e) => setPedidoId(e.target.value)} required aria-label="Pedido aprovado">
              <option value="">Escolher um pedido aprovado…</option>
              {aprovados.map((p) => <option key={p.id} value={p.id}>{codigoPedido(p.id)} {p.titulo}</option>)}
            </select>
            <button type="submit" className="primario" disabled={ocupado || !pedidoId}>{ocupado ? 'A gerar…' : '✨ Gerar esboço'}</button>
          </form>
          <p className="suave nota-curta">A IA só sugere: o esboço fica em A Fazer, no fim do backlog, para o Gestor de Produto rever.</p>
        </section>
      )}
      {podePlanear && (
        <form
          className="linha-formulario margem"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await executar(() => api.criarUserStory(nova))) setNova('')
          }}
        >
          <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Como <papel>, eu preciso de <o quê>, para que <benefício>" aria-label="Nova User Story" required />
          <button type="submit" className="secundario" disabled={ocupado}>+ Story manual</button>
        </form>
      )}
      {aviso && <p className="sucesso" role="status">{aviso}</p>}
      <Erro erro={erro} />

      <div className="separadores linha-separadores" role="tablist">
        {[['backlog', `Product Backlog (${dados.stories.length})`], ['quadro', 'Quadro de estados']].map(([chave, nome]) => (
          <button key={chave} role="tab" aria-selected={separador === chave} className={separador === chave ? 'ativo' : ''} onClick={() => setSeparador(chave)}>{nome}</button>
        ))}
      </div>
      {separador === 'backlog'
        ? <Backlog stories={dados.stories} executar={executar} ocupado={ocupado} podePlanear={podePlanear} />
        : <Quadro stories={dados.stories} executar={executar} ocupado={ocupado} />}
    </Pagina>
  )
}
