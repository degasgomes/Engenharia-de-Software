import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import * as api from '../api.js'
import { useSessao } from '../sessao.jsx'
import Estimativa from '../Estimativa.jsx'
import { BotaoVoto, Erro, Estado, Pagina } from '../components.jsx'
import { codigoPedido, NIVEL, score, tempoRelativo } from '../formatos.js'

// Diagrama de Estados 1: o Gestor só decide depois da triagem.
const EM_AVALIACAO = ['EM_TRIAGEM']
const SEPARADORES = {
  descricao: 'Descrição',
  historico: 'Histórico de versões',
  rastreabilidade: 'Rastreabilidade',
}

function Detalhe({ nome, children }) {
  return (
    <>
      <dt>{nome}</dt>
      <dd>{children}</dd>
    </>
  )
}

export default function DetalhePedido() {
  const { id } = useParams()
  const { state } = useLocation()
  const { eGestor } = useSessao()
  const [pedido, setPedido] = useState(null)
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [separador, setSeparador] = useState('descricao')
  const [aRejeitar, setARejeitar] = useState(false)
  const [justificacao, setJustificacao] = useState('')

  useEffect(() => {
    api.obterPedido(id).then(setPedido).catch(setErro)
  }, [id])

  async function executar(acao) {
    setErro(null)
    setOcupado(true)
    try {
      setPedido(await acao())
      setARejeitar(false)
    } catch (err) {
      setErro(err)
    } finally {
      setOcupado(false)
    }
  }

  if (!pedido) {
    return <Pagina titulo="Detalhe do pedido">{erro ? <Erro erro={erro} /> : <p className="info">A carregar…</p>}</Pagina>
  }

  const podeDecidir = eGestor && EM_AVALIACAO.includes(pedido.estado)
  const avaliado = pedido.esforco !== null && pedido.impacto !== null

  return (
    <Pagina titulo="Detalhe do pedido">
      {state?.acabadoDeSubmeter && <p className="sucesso">Pedido submetido com sucesso.</p>}

      <section className="cartao cabecalho-pedido">
        <BotaoVoto pedido={pedido} aoVotar={() => executar(() => api.alternarVoto(pedido))} ocupado={ocupado} />
        <div className="resumo">
          <span className="suave codigo">{codigoPedido(pedido.id)}</span>
          <h2 className="titulo-pedido">{pedido.titulo}</h2>
          <Estado pedido={pedido} />
        </div>
        {podeDecidir && (
          <div className="acoes">
            <button className="secundario" onClick={() => setARejeitar(!aRejeitar)} disabled={ocupado}>Rejeitar</button>
            <button
              className="primario"
              onClick={() => executar(() => api.aprovarPedido(pedido.id))}
              disabled={ocupado || !avaliado}
              title={avaliado ? '' : 'Guarde primeiro a estimativa de impacto e esforço'}
            >
              Aprovar
            </button>
          </div>
        )}
      </section>

      {aRejeitar && (
        <form
          className="cartao rejeicao"
          onSubmit={(e) => {
            e.preventDefault()
            executar(() => api.rejeitarPedido(pedido.id, justificacao))
          }}
        >
          <label>
            Justificação da rejeição
            <textarea value={justificacao} onChange={(e) => setJustificacao(e.target.value)} rows={3} required autoFocus />
          </label>
          <div className="acoes">
            <button type="button" className="secundario" onClick={() => setARejeitar(false)}>Cancelar</button>
            <button type="submit" className="perigo" disabled={ocupado || !justificacao.trim()}>Confirmar rejeição</button>
          </div>
        </form>
      )}
      <Erro erro={erro} />
      {podeDecidir && !avaliado && (
        <p className="info">Para aprovar, defina e guarde o impacto e o esforço na estimativa.</p>
      )}

      <div className="grelha-2-1">
        <div>
          <section className="cartao sem-margem-interna">
            <div className="separadores linha-separadores" role="tablist">
              {Object.entries(SEPARADORES).map(([chave, nome]) => (
                <button
                  key={chave}
                  role="tab"
                  aria-selected={separador === chave}
                  className={separador === chave ? 'ativo' : ''}
                  onClick={() => setSeparador(chave)}
                >
                  {nome}
                </button>
              ))}
            </div>
            <div className="corpo-separador">
              {separador === 'descricao' && (
                <>
                  <span className="rotulo">Que problema resolve?</span>
                  <p className="texto">{pedido.problema}</p>
                  {pedido.anexos.length > 0 && (
                    <>
                      <span className="rotulo">Anexos</span>
                      <ul className="anexos">
                        {pedido.anexos.map((a) => (
                          <li key={a.id}><a href={a.url} target="_blank" rel="noreferrer">📎 {a.nome_ficheiro}</a></li>
                        ))}
                      </ul>
                    </>
                  )}
                  {pedido.estado === 'REJEITADO' && (
                    <>
                      <span className="rotulo">Justificação da rejeição</span>
                      <p className="texto">{pedido.justificacao_rejeicao}</p>
                    </>
                  )}
                  <p className="suave nota">Os comentários e menções entram no sprint completo.</p>
                </>
              )}
              {separador === 'historico' && <p className="info">O histórico de versões entra no Sprint 5.</p>}
              {separador === 'rastreabilidade' && (
                <>
                  <div className="rastreabilidade">
                    <span className="no">{codigoPedido(pedido.id)}</span>→
                    <span className="no pendente">User story</span>→
                    <span className="no pendente">Tarefa / PR</span>
                  </div>
                  <p className="info">As User Stories e a ligação ao GitHub entram no Sprint 4.</p>
                </>
              )}
            </div>
          </section>
        </div>

        <div>
          <section className="cartao">
            <h2>Detalhes</h2>
            <dl className="detalhes">
              <Detalhe nome="Estado"><Estado pedido={pedido} /></Detalhe>
              <Detalhe nome="Impacto">{pedido.impacto ? NIVEL[pedido.impacto] : '—'}</Detalhe>
              <Detalhe nome="Esforço">{pedido.esforco ? NIVEL[pedido.esforco] : '—'}</Detalhe>
              <Detalhe nome="Score">{score(pedido) ?? '—'}</Detalhe>
              <Detalhe nome="Categoria">{pedido.categoria ?? '—'}</Detalhe>
              <Detalhe nome="Votos">{pedido.total_votos}</Detalhe>
              <Detalhe nome="Autor">{pedido.autor}</Detalhe>
              <Detalhe nome="Submetido">{tempoRelativo(pedido.data_submissao)}</Detalhe>
            </dl>
          </section>
          {podeDecidir && <Estimativa key={pedido.id} pedido={pedido} aoGuardar={setPedido} />}
        </div>
      </div>
    </Pagina>
  )
}
