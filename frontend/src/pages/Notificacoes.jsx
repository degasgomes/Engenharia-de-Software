import { Link } from 'react-router-dom'
import * as api from '../api.js'
import { useDados } from '../useDados.js'
import { Erro, Pagina } from '../components.jsx'
import { tempoRelativo } from '../formatos.js'

export default function Notificacoes() {
  const { dados: notificacoes, erro, ocupado, executar } = useDados(api.listarNotificacoes)

  if (!notificacoes) return <Pagina titulo="Notificações">{erro ? <Erro erro={erro} /> : <p className="info">A carregar…</p>}</Pagina>
  const porLer = notificacoes.filter((n) => !n.lida).length

  return (
    <Pagina titulo="Notificações">
      <div className="cabecalho-cartao">
        <span className="suave">{porLer === 0 ? 'Não há notificações por ler.' : `${porLer} por ler`}</span>
        <button className="secundario" disabled={ocupado || porLer === 0} onClick={() => executar(api.marcarTodasLidas)}>Marcar todas como lidas</button>
      </div>
      <Erro erro={erro} />
      {notificacoes.length === 0 && (
        <section className="cartao vazio">
          <h2>Ainda não há notificações</h2>
          <p className="suave">Vai ser avisado aqui e por e-mail quando um pedido que submeteu ou em que votou ficar Planeado, Em Desenvolvimento ou Lançado.</p>
        </section>
      )}
      <ul className="lista">
        {notificacoes.map((n) => (
          <li key={n.id} className={n.lida ? 'cartao notificacao' : 'cartao notificacao por-ler'}>
            <div className="resumo">
              <p>{n.mensagem}</p>
              <small className="suave">
                {tempoRelativo(n.data)}
                {n.pedido && <> · <Link to={`/pedidos/${n.pedido}`}>Ver pedido</Link></>}
              </small>
            </div>
            {!n.lida && <button disabled={ocupado} onClick={() => executar(() => api.marcarLida(n.id))}>Marcar como lida</button>}
          </li>
        ))}
      </ul>
    </Pagina>
  )
}
