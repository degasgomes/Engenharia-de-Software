import { useState } from 'react'
import * as api from './api.js'
import { Erro } from './components.jsx'
import { codigoPedido, NIVEL, score } from './formatos.js'

// Cartão "Estimativa do pedido" dos wireframes: o Gestor define impacto e esforço (1 a 5).
export default function Estimativa({ pedido, aoGuardar }) {
  const [impacto, setImpacto] = useState(pedido.impacto ?? 3)
  const [esforco, setEsforco] = useState(pedido.esforco ?? 3)
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)
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

  const deslizador = (nome, valor, definir) => (
    <label className="deslizador">
      <span>{nome}</span>
      <input type="range" min="1" max="5" value={valor} onChange={(e) => definir(Number(e.target.value))} />
      <span className="nivel">{NIVEL[valor]} ({valor}/5)</span>
    </label>
  )

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
          <strong>{score({ impacto, esforco })}</strong>
        </div>
      </div>
      <Erro erro={erro} />
      <div className="acoes">
        {!alterado && pedido.impacto !== null && <span className="sucesso">Estimativa guardada</span>}
        <button className="primario" onClick={guardar} disabled={ocupado || !alterado}>Guardar estimativa</button>
      </div>
    </section>
  )
}
