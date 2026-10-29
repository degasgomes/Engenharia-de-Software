import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessao } from '../sessao.jsx'
import { Erro } from '../components.jsx'

export default function Entrar() {
  const { entrar, registar } = useSessao()
  const navegar = useNavigate()
  const [modo, setModo] = useState('entrar')
  const [dados, setDados] = useState({ nome: '', email: '', password: '' })
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value })
  const eRegisto = modo === 'registo'

  async function submeter(e) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    try {
      if (eRegisto) await registar(dados)
      else await entrar(dados.email, dados.password)
      navegar('/')
    } catch (err) {
      setErro(err)
      setOcupado(false)
    }
  }

  return (
    <div className="ecra-entrada">
      <section className="cartao entrada">
        <p className="marca">FeatureFlow</p>
        <div className="separadores">
          <button className={!eRegisto ? 'ativo' : ''} onClick={() => { setModo('entrar'); setErro(null) }}>Entrar</button>
          <button className={eRegisto ? 'ativo' : ''} onClick={() => { setModo('registo'); setErro(null) }}>Criar conta</button>
        </div>
        <form onSubmit={submeter}>
          {eRegisto && (
            <label>
              Nome
              <input value={dados.nome} onChange={mudar('nome')} required autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input type="email" value={dados.email} onChange={mudar('email')} required autoComplete="email" />
          </label>
          <label>
            Palavra-passe
            <input
              type="password"
              value={dados.password}
              onChange={mudar('password')}
              required
              minLength={eRegisto ? 8 : undefined}
              autoComplete={eRegisto ? 'new-password' : 'current-password'}
            />
          </label>
          <Erro erro={erro} />
          <button type="submit" className="primario" disabled={ocupado}>
            {eRegisto ? 'Criar conta de Cliente' : 'Entrar'}
          </button>
        </form>
      </section>
    </div>
  )
}
