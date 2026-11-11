import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api.js'
import { useSessao } from '../sessao.jsx'
import { useDados } from '../useDados.js'
import { Erro, EstadoStory, Pagina, Pronta } from '../components.jsx'
import { codigoStory, dataCurta } from '../formatos.js'

// Métrica "Team workload": Story Points do Sprint face à capacidade da equipa e de cada membro.
function Carga({ sprint }) {
  const acima = sprint.total_story_points > sprint.capacidade
  const largura = (valor, maximo) => `${maximo > 0 ? Math.min(100, (valor / maximo) * 100) : valor > 0 ? 100 : 0}%`
  return (
    <div className="carga">
      <div className="linha-progresso">
        <strong>Carga da equipa</strong>
        <span className={acima ? 'erro' : 'suave'}>
          {sprint.total_story_points} de {sprint.capacidade} SP{acima && ' · acima da capacidade'}
        </span>
      </div>
      <div className="trilho" role="progressbar" aria-label="Carga da equipa" aria-valuenow={sprint.total_story_points} aria-valuemin={0} aria-valuemax={sprint.capacidade}>
        <div className={acima ? 'excesso' : ''} style={{ width: largura(sprint.total_story_points, sprint.capacidade) }} />
      </div>
      <ul className="carga-membros">
        {sprint.carga.map((m) => {
          const demais = m.story_points > m.capacidade_sp
          return (
            <li key={m.id}>
              <span>{m.nome}</span>
              <div className="trilho"><div className={demais ? 'excesso' : 'suave-preenchido'} style={{ width: largura(m.story_points, m.capacidade_sp) }} /></div>
              <span className={demais ? 'erro' : 'suave'}>{m.story_points} / {m.capacidade_sp} SP</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NovoSprint({ equipas, executar, ocupado, aoCriar }) {
  const [form, setForm] = useState({ equipa: '', objetivo: '', data_inicio: '', data_fim: '' })
  const campo = (nome) => ({ value: form[nome], onChange: (e) => setForm({ ...form, [nome]: e.target.value }), required: true })
  if (equipas.length === 0) {
    return <p className="info">Para criar um Sprint é preciso uma equipa. <Link to="/equipas">Criar uma equipa →</Link></p>
  }
  return (
    <form
      className="cartao"
      onSubmit={async (e) => {
        e.preventDefault()
        let criado
        if (await executar(async () => { criado = await api.criarSprint(form) })) aoCriar(criado.id)
      }}
    >
      <h2>Novo Sprint</h2>
      <div className="duas-colunas">
        <label>Equipa
          <select {...campo('equipa')}>
            <option value="">Escolher…</option>
            {equipas.map((eq) => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
          </select>
        </label>
        <label>Objetivo do Sprint<input {...campo('objetivo')} maxLength={300} /></label>
        <label>Início<input type="date" {...campo('data_inicio')} /></label>
        <label>Fim<input type="date" {...campo('data_fim')} /></label>
      </div>
      <div className="acoes"><button type="submit" className="primario" disabled={ocupado}>Criar Sprint</button></div>
    </form>
  )
}

export default function BacklogSprint() {
  const { podePlanear } = useSessao()
  const { dados, erro, ocupado, executar } = useDados(async () => {
    const [sprints, stories, equipas] = await Promise.all([api.listarSprints(), api.listarUserStories(), api.listarEquipas()])
    return { sprints, stories, equipas }
  })
  const [escolhido, setEscolhido] = useState(null)
  const [aCriar, setACriar] = useState(false)

  if (!dados) return <Pagina titulo="Backlog e Sprint">{erro ? <Erro erro={erro} /> : <p className="info">A carregar…</p>}</Pagina>

  const sprint = dados.sprints.find((s) => s.id === escolhido) ?? dados.sprints[0]
  const porPlanear = dados.stories.filter((s) => s.sprint === null && s.estado !== 'CONCLUIDO')
  const equipa = sprint && dados.equipas.find((eq) => eq.id === sprint.equipa)

  return (
    <Pagina titulo="Backlog e Sprint">
      <div className="filtros">
        {dados.sprints.length > 0 && (
          <select value={sprint.id} onChange={(e) => setEscolhido(Number(e.target.value))} aria-label="Sprint">
            {dados.sprints.map((s) => <option key={s.id} value={s.id}>Sprint {s.numero} — {s.equipa_nome}</option>)}
          </select>
        )}
        {podePlanear && <button className="secundario" onClick={() => setACriar(!aCriar)}>{aCriar ? 'Cancelar' : '+ Novo Sprint'}</button>}
      </div>
      {aCriar && <NovoSprint equipas={dados.equipas} executar={executar} ocupado={ocupado} aoCriar={(id) => { setEscolhido(id); setACriar(false) }} />}
      <Erro erro={erro} />
      {!sprint && !aCriar && <p className="info">Ainda não há Sprints.</p>}

      {sprint && (
        <div className="grelha-1-1">
          <section className="cartao">
            <h2>Product Backlog <span className="suave">({porPlanear.length})</span></h2>
            <p className="suave nota-curta">Definition of Ready: só entram no Sprint as stories com pelo menos um critério de aceitação.</p>
            {porPlanear.length === 0 && <p className="info">Não há stories por planear.</p>}
            {porPlanear.map((s) => (
              <article key={s.id} className="item-planeamento">
                <div className="resumo">
                  <span className="suave codigo">{codigoStory(s.id)} · {s.story_points ?? '?'} SP</span>
                  <p>{s.descricao}</p>
                  <Pronta story={s} />
                </div>
                {podePlanear && (
                  <button className="secundario" disabled={ocupado} onClick={() => executar(() => api.moverParaSprint(sprint.id, s.id))} aria-label={`Mover ${codigoStory(s.id)} para o Sprint`}>
                    Para o Sprint →
                  </button>
                )}
              </article>
            ))}
          </section>

          <section className="cartao">
            <h2>Sprint {sprint.numero} <span className="suave">· {sprint.total_story_points} SP</span></h2>
            <p className="nota-curta"><b>Objetivo:</b> {sprint.objetivo}</p>
            <p className="suave nota-curta">{sprint.equipa_nome} · {dataCurta(sprint.data_inicio)} a {dataCurta(sprint.data_fim)}</p>
            <Carga sprint={sprint} />
            {sprint.user_stories.length === 0 && <p className="info">O Sprint Backlog está vazio.</p>}
            {sprint.user_stories.map((s) => (
              <article key={s.id} className="item-planeamento">
                <div className="resumo">
                  <span className="suave codigo">{codigoStory(s.id)} · {s.story_points ?? '?'} SP</span>
                  <p>{s.descricao}</p>
                  <div className="etiquetas">
                    <EstadoStory story={s} />
                    {podePlanear ? (
                      <select
                        value={s.responsavel ?? ''}
                        disabled={ocupado}
                        onChange={(e) => executar(() => api.editarUserStory(s.id, { responsavel: e.target.value || null }))}
                        aria-label={`Responsável por ${codigoStory(s.id)}`}
                      >
                        <option value="">Sem responsável</option>
                        {equipa?.membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                      </select>
                    ) : <span className="chip">{s.responsavel_nome ?? 'Sem responsável'}</span>}
                  </div>
                </div>
                {podePlanear && (
                  <button disabled={ocupado} onClick={() => executar(() => api.retirarDoSprint(sprint.id, s.id))} aria-label={`Retirar ${codigoStory(s.id)} do Sprint`}>
                    ← Retirar
                  </button>
                )}
              </article>
            ))}
          </section>
        </div>
      )}
    </Pagina>
  )
}
