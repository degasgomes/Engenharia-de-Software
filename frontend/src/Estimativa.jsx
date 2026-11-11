import { useState } from 'react'
import * as api from './api.js'
import { Erro } from './components.jsx'
import { codigoPedido, NIVEL, score } from './formatos.js'

// Onde o cursor fica desenhado enquanto o valor ainda não foi escolhido.
const MEIO = 3

// Cartão "Estimativa do pedido" dos wireframes: o Gestor define impacto e esforço (1 a 5).
// Num pedido ainda sem estimativa não há valores nem score até o Gestor os escolher.
export default function Estimativa({ pedido, aoGuardar }) {
  const [impacto, setImpacto] = useState(pedido.impacto)
  const [esforco, setEsforco] = useState(pedido.esforco)
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const completo = impacto !== null && esforco !== null
  const alterado = impacto !== pedido.impacto || esforco !== pedido.esforco

  async function guardar() {
    setErro(null)
    setOcupado(true)
    try {
      aoGuardar(await api.avaliarPedido(pedido.id, esforco, impacto))
    } catch (err) {
      setErro(err)
    } finally {
      setOcupado(false)
    }
  }

  const deslizador = (nome, valor, definir) => {
    const escolher = (e) => definir(Number(e.target.value))
    return (
      <label className="deslizador">
        <span>{nome}</span>
        {/* onClick e onKeyUp: escolher o valor do meio também conta, mesmo sem mexer o cursor. */}
        <input
          type="range"
          min="1"
          max="5"
          value={valor ?? MEIO}
          className={valor === null ? 'por-definir' : ''}
          onChange={escolher}
          onClick={escolher}
          onKeyUp={escolher}
        />
        <span className="nivel">{valor === null ? 'Por definir' : `${NIVEL[valor]} (${valor}/5)`}</span>
      </label>
    )
  }

  return (
    <section className="cartao estimativa">
      <h2>Estimativa do pedido {codigoPedido(pedido.id)}</h2>
      <div className="estimativa-corpo">
        <div className="deslizadores">
          {deslizador('Impacto', impacto, setImpacto)}
          {deslizador('Esforço', esforco, setEsforco)}
        </div>
        <div className="score">
          <span className="suave">Score</span>
          <strong>{score({ impacto, esforco }) ?? '—'}</strong>
        </div>
      </div>
      <Erro erro={erro} />
      <div className="acoes">
        {!completo && <span className="suave">Por avaliar: escolha o impacto e o esforço.</span>}
        {!alterado && completo && <span className="sucesso">Estimativa guardada</span>}
        <button className="primario" onClick={guardar} disabled={ocupado || !alterado || !completo}>Guardar estimativa</button>
      </div>
    </section>
  )
}
