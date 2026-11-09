import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSessao } from '../sessao.jsx'
import { usePedidos } from '../usePedidos.js'
import { Avatar, BotaoVoto, Erro, Estado, Pagina } from '../components.jsx'
import { codigoPedido, tempoRelativo } from '../formatos.js'

const POR_PAGINA = 5
const ESTADOS = { SUBMETIDO: 'Submetido', EM_TRIAGEM: 'Em triagem', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado' }
const ORDENS = {
  votos: ['Mais votados', (a, b) => b.total_votos - a.total_votos],
  recentes: ['Mais recentes', (a, b) => new Date(b.data_submissao) - new Date(a.data_submissao)],
}

export default function ListaPedidos() {
  const { utilizador } = useSessao()
  const { pedidos, erro, aVotar, votar } = usePedidos()
  const [params, setParams] = useSearchParams()
  const [estado, setEstado] = useState('')
  const [categoria, setCategoria] = useState('')
  const [ordem, setOrdem] = useState('votos')
  const [separador, setSeparador] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const q = params.get('q') ?? ''

  const categorias = useMemo(
    () => [...new Set((pedidos ?? []).map((p) => p.categoria).filter(Boolean))].sort(),
    [pedidos],
  )

  const separadores = useMemo(() => {
    const lista = pedidos ?? []
    return {
      todos: ['Todos', lista],
      meus: ['Os meus pedidos', lista.filter((p) => p.autor_id === utilizador.id)],
      votados: ['Votados por mim', lista.filter((p) => p.votado)],
    }
  }, [pedidos, utilizador.id])

  const termo = q.toLowerCase()
  const filtrados = separadores[separador][1]
    .filter((p) => !estado || p.estado === estado)
    .filter((p) => !categoria || p.categoria === categoria)
    .filter((p) => !termo || `${p.titulo} ${p.problema} ${codigoPedido(p.id)}`.toLowerCase().includes(termo))
    .sort(ORDENS[ordem][1])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const atual = Math.min(pagina, totalPaginas)
  const visiveis = filtrados.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA)

  const filtrosAtivos = [
    estado && { nome: `Estado: ${ESTADOS[estado]}`, limpar: () => setEstado('') },
    categoria && { nome: `Categoria: ${categoria}`, limpar: () => setCategoria('') },
    q && { nome: `Pesquisa: ${q}`, limpar: () => setParams({}) },
  ].filter(Boolean)

  const mudar = (definir) => (e) => {
    definir(e.target.value)
    setPagina(1)
  }

  return (
    <Pagina titulo="Pedidos">
      <div className="filtros">
        <select value={estado} onChange={mudar(setEstado)} aria-label="Estado">
          <option value="">Estado</option>
          {Object.entries(ESTADOS).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
        </select>
        <select value={categoria} onChange={mudar(setCategoria)} aria-label="Categoria">
          <option value="">Categoria</option>
          {categorias.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={ordem} onChange={mudar(setOrdem)} aria-label="Ordenar">
          {Object.entries(ORDENS).map(([valor, [nome]]) => <option key={valor} value={valor}>Ordenar: {nome}</option>)}
        </select>
      </div>

      {filtrosAtivos.length > 0 && (
        <div className="filtros-ativos">
          <span className="suave">Filtros ativos:</span>
          {filtrosAtivos.map((f) => (
            <button key={f.nome} className="chip" onClick={() => { f.limpar(); setPagina(1) }}>{f.nome} ✕</button>
          ))}
        </div>
      )}

      <div className="separadores linha-separadores" role="tablist">
        {Object.entries(separadores).map(([chave, [nome, lista]]) => (
          <button
            key={chave}
            role="tab"
            aria-selected={separador === chave}
            className={separador === chave ? 'ativo' : ''}
            onClick={() => { setSeparador(chave); setPagina(1) }}
          >
            {nome} ({lista.length})
          </button>
        ))}
      </div>

      <Erro erro={erro} />
      {!pedidos && !erro && <p className="info">A carregar…</p>}
      {pedidos && filtrados.length === 0 && <p className="info">Nenhum pedido corresponde aos filtros.</p>}

      <ul className="lista">
        {visiveis.map((p) => (
          <li key={p.id} className="cartao linha-pedido">
            <BotaoVoto pedido={p} aoVotar={votar} ocupado={aVotar === p.id} />
            <div className="resumo">
              <span className="suave codigo">{codigoPedido(p.id)}</span>
              <Link to={`/pedidos/${p.id}`} className="ligacao-linha">{p.titulo}</Link>
              <p className="problema">{p.problema}</p>
              {p.categoria && <span className="chip">{p.categoria}</span>}
            </div>
            <Estado pedido={p} />
            <Avatar nome={p.autor} />
            <small className="suave quando">{tempoRelativo(p.data_submissao)}</small>
          </li>
        ))}
      </ul>

      {filtrados.length > 0 && (
        <div className="paginacao">
          <span className="suave">
            {(atual - 1) * POR_PAGINA + 1}–{Math.min(atual * POR_PAGINA, filtrados.length)} de {filtrados.length}
          </span>
          <div>
            <button onClick={() => setPagina(atual - 1)} disabled={atual === 1} aria-label="Página anterior">‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button key={n} className={n === atual ? 'ativo' : ''} onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button onClick={() => setPagina(atual + 1)} disabled={atual === totalPaginas} aria-label="Página seguinte">›</button>
          </div>
        </div>
      )}
    </Pagina>
  )
}
