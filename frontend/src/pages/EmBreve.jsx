import { Pagina } from '../components.jsx'

export default function EmBreve({ titulo, sprint }) {
  return (
    <Pagina titulo={titulo}>
      <section className="cartao vazio">
        <h2>{titulo} entra no Sprint {sprint}</h2>
        <p className="suave">
          Este ecrã está desenhado nos wireframes, mas depende de módulos que ainda não fazem
          parte do Mini Sprint 3 (registo → pedido → voto → aprovação).
        </p>
      </section>
    </Pagina>
  )
}
