import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../api.js'
import { usePedidos } from '../usePedidos.js'
import { Erro, Pagina } from '../components.jsx'

const CHAVE_RASCUNHO = 'featureflow.rascunho'

function lerRascunho() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_RASCUNHO)) ?? {}
  } catch {
    return {}
  }
}

const palavras = (texto) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\W+/)
    .filter((p) => p.length >= 4)

export default function SubmeterPedido() {
  const navegar = useNavigate()
  const rascunho = useMemo(lerRascunho, [])
  const { pedidos } = usePedidos()
  const [titulo, setTitulo] = useState(rascunho.titulo ?? '')
  const [problema, setProblema] = useState(rascunho.problema ?? '')
  const [categoria, setCategoria] = useState(rascunho.categoria ?? '')
  const [categorias, setCategorias] = useState([])
  const [anexo, setAnexo] = useState(null)
  const [aArrastar, setAArrastar] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const ficheiroRef = useRef(null)

  useEffect(() => {
    api.listarCategorias().then(setCategorias).catch(() => setCategorias([]))
  }, [])

  // "Pedidos semelhantes": pedidos que partilham palavras com o título e a descrição.
  const semelhantes = useMemo(() => {
    const termos = new Set(palavras(`${titulo} ${problema}`))
    if (!pedidos || termos.size === 0) return []
    return pedidos
      .map((p) => ({ p, comuns: palavras(`${p.titulo} ${p.problema}`).filter((w) => termos.has(w)).length }))
      .filter(({ comuns }) => comuns > 0)
      .sort((a, b) => b.comuns - a.comuns || b.p.total_votos - a.p.total_votos)
      .slice(0, 3)
      .map(({ p }) => p)
  }, [pedidos, titulo, problema])

  function guardarRascunho() {
    try {
      localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ titulo, problema, categoria }))
      setAviso('Rascunho guardado neste browser.')
    } catch {
      setAviso('Não foi possível guardar o rascunho.')
    }
  }

  async function submeter(e) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    try {
      const pedido = await api.submeterPedido({ titulo, problema, categoria, anexo })
      try {
        localStorage.removeItem(CHAVE_RASCUNHO)
      } catch {
        // sem acesso ao armazenamento: não há rascunho para apagar
      }
      navegar(`/pedidos/${pedido.id}`, { state: { acabadoDeSubmeter: true } })
    } catch (err) {
      setErro(err)
      setOcupado(false)
    }
  }

  function largar(e) {
    e.preventDefault()
    setAArrastar(false)
    if (e.dataTransfer.files[0]) setAnexo(e.dataTransfer.files[0])
  }

  return (
    <Pagina titulo="Submeter pedido">
      <div className="grelha-2-1">
        <section className="cartao">
          <form onSubmit={submeter}>
            <label>
              Título
              <input placeholder="Título do pedido" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} required />
            </label>
            <label>
              Descrição
              <textarea
                placeholder="Descreve a funcionalidade e o problema que resolve"
                value={problema}
                onChange={(e) => setProblema(e.target.value)}
                rows={5}
                required
              />
            </label>
            <div className="duas-colunas">
              <label>
                Categoria
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="">Selecionar categoria (opcional)</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </label>
              <label>
                Tags
                <input placeholder="Disponível no sprint completo" disabled />
              </label>
            </div>
            <div className="campo">
              <span className="rotulo">Anexos</span>
              <button
                type="button"
                className={aArrastar ? 'zona-anexo a-arrastar' : 'zona-anexo'}
                onClick={() => ficheiroRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setAArrastar(true) }}
                onDragLeave={() => setAArrastar(false)}
                onDrop={largar}
              >
                {anexo ? `📎 ${anexo.name}` : 'Arrasta ficheiros ou clica para anexar'}
              </button>
              <input ref={ficheiroRef} type="file" hidden onChange={(e) => setAnexo(e.target.files[0] ?? null)} />
              {anexo && <button type="button" className="ligacao" onClick={() => setAnexo(null)}>Remover anexo</button>}
            </div>
            <Erro erro={erro} />
            <div className="acoes">
              {aviso && <span className="suave">{aviso}</span>}
              <button type="button" className="secundario" onClick={() => navegar(-1)}>Cancelar</button>
              <button type="button" className="secundario" onClick={guardarRascunho}>Guardar rascunho</button>
              <button type="submit" className="primario" disabled={ocupado}>Submeter</button>
            </div>
          </form>
        </section>

        <aside className="cartao">
          <h2>Pedidos semelhantes</h2>
          <p className="suave">Confirma se já existe um pedido igual antes de submeter.</p>
          {semelhantes.length === 0 && (
            <p className="info">{titulo || problema ? 'Nenhum pedido semelhante encontrado.' : 'Escreve o título para procurar.'}</p>
          )}
          {semelhantes.map((p) => (
            <div key={p.id} className="semelhante">
              <strong>{p.titulo}</strong>
              <div>
                <span className="suave">▲ {p.total_votos} · {p.estado_display}</span>
                <Link to={`/pedidos/${p.id}`}>Ver pedido →</Link>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </Pagina>
  )
}
