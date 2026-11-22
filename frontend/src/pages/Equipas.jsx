import { useState } from 'react'
import * as api from '../api.js'
import { useSessao } from '../sessao.jsx'
import { useDados } from '../useDados.js'
import { Avatar, Erro, Pagina } from '../components.jsx'

const PERFIS = { GESTOR_PRODUTO: 'Gestor de Produto', GESTOR_PROJETO: 'Gestor de Projeto', PROGRAMADOR: 'Programador' }

function Equipa({ equipa, utilizadores, executar, ocupado, podePlanear }) {
  const [novo, setNovo] = useState('')
  const deFora = utilizadores.filter((u) => !equipa.membros.some((m) => m.id === u.id))
  return (
    <section className="cartao">
      <h2>{equipa.nome} <span className="suave">({equipa.membros.length})</span></h2>
      {equipa.membros.length === 0 && <p className="info">Esta equipa ainda não tem membros.</p>}
      <ul className="membros">
        {equipa.membros.map((m) => (
          <li key={m.id}>
            <Avatar nome={m.nome} />
            <span className="resumo">{m.nome} <small className="suave">· {PERFIS[m.perfil] ?? m.perfil}</small></span>
            {podePlanear && (
              <button className="ligacao" disabled={ocupado} onClick={() => executar(() => api.retirarMembro(equipa.id, m.id))} aria-label={`Retirar ${m.nome} da ${equipa.nome}`}>Retirar</button>
            )}
          </li>
        ))}
      </ul>
      {podePlanear && deFora.length > 0 && (
        <form
          className="linha-formulario"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await executar(() => api.juntarMembro(equipa.id, novo))) setNovo('')
          }}
        >
          <select value={novo} onChange={(e) => setNovo(e.target.value)} required aria-label={`Novo membro da ${equipa.nome}`}>
            <option value="">Juntar um membro…</option>
            {deFora.map((u) => <option key={u.id} value={u.id}>{u.nome} ({PERFIS[u.perfil] ?? u.perfil})</option>)}
          </select>
          <button type="submit" className="secundario" disabled={ocupado || !novo}>Juntar</button>
        </form>
      )}
    </section>
  )
}

export default function Equipas() {
  const { podePlanear } = useSessao()
  const { dados, erro, ocupado, executar } = useDados(async () => {
    const [equipas, utilizadores] = await Promise.all([api.listarEquipas(), api.listarUtilizadoresInternos()])
    return { equipas, utilizadores }
  })
  const [nome, setNome] = useState('')

  if (!dados) return <Pagina titulo="Equipas">{erro ? <Erro erro={erro} /> : <p className="info">A carregar…</p>}</Pagina>

  return (
    <Pagina titulo="Equipas">
      {podePlanear && (
        <form
          className="linha-formulario margem"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await executar(() => api.criarEquipa(nome))) setNome('')
          }}
        >
          <input placeholder="Nome da equipa" aria-label="Nome da equipa" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={100} />
          <button type="submit" className="secundario" disabled={ocupado}>+ Nova equipa</button>
        </form>
      )}
      <Erro erro={erro} />
      {dados.equipas.length === 0 && <p className="info">Ainda não há equipas.</p>}
      <div className="grelha-1-1">
        {dados.equipas.map((eq) => (
          <Equipa key={eq.id} equipa={eq} utilizadores={dados.utilizadores} executar={executar} ocupado={ocupado} podePlanear={podePlanear} />
        ))}
      </div>
    </Pagina>
  )
}
