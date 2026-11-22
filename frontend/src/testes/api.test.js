import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api.js'

const CHAVE = 'featureflow.tokens'
const resposta = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo })

beforeEach(() => {
  localStorage.setItem(CHAVE, JSON.stringify({ access: 'acesso', refresh: 'renovacao' }))
  vi.stubGlobal('fetch', vi.fn())
})

describe('votos (Diagrama de Sequência 3)', () => {
  it('envia POST quando ainda não votou', async () => {
    fetch.mockResolvedValue(resposta(201, { id: 3, votado: true }))
    await api.alternarVoto({ id: 3, votado: false })
    expect(fetch).toHaveBeenCalledWith('/api/v1/pedidos/3/votos', expect.objectContaining({ method: 'POST' }))
  })

  it('envia DELETE quando já tinha votado', async () => {
    fetch.mockResolvedValue(resposta(200, { id: 3, votado: false }))
    await api.alternarVoto({ id: 3, votado: true })
    expect(fetch).toHaveBeenCalledWith('/api/v1/pedidos/3/votos', expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('pedidos à API', () => {
  it('envia o token de acesso', async () => {
    fetch.mockResolvedValue(resposta(200, []))
    await api.listarUserStories()
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer acesso')
  })

  it('mostra a mensagem do servidor no 422 da Definition of Ready', async () => {
    fetch.mockResolvedValue(resposta(422, { detail: 'A story não cumpre a Definition of Ready.' }))
    const erro = await api.moverParaSprint(1, 7).catch((e) => e)
    expect(erro).toBeInstanceOf(api.ApiError)
    expect(erro.status).toBe(422)
    expect(erro.message).toBe('A story não cumpre a Definition of Ready.')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ user_story: 7 })
  })

  it('junta os erros de validação por campo', async () => {
    fetch.mockResolvedValue(resposta(400, { dado: ['Este campo é obrigatório.'], entao: ['Demasiado longo.'] }))
    const erro = await api.acrescentarCriterio(1, {}).catch((e) => e)
    expect(erro.message).toBe('dado: Este campo é obrigatório.\nentao: Demasiado longo.')
  })

  it('renova o token quando o acesso expira e repete o pedido', async () => {
    fetch
      .mockResolvedValueOnce(resposta(401, { detail: 'Token expirado' }))
      .mockResolvedValueOnce(resposta(200, { access: 'novo' }))
      .mockResolvedValueOnce(resposta(200, [{ id: 1 }]))
    expect(await api.listarNotificacoes()).toEqual([{ id: 1 }])
    expect(fetch.mock.calls[1][0]).toBe('/api/v1/auth/token/renovar')
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer novo')
    expect(api.lerTokens().access).toBe('novo')
  })

  it('termina a sessão quando a renovação falha', async () => {
    fetch.mockResolvedValueOnce(resposta(401, { detail: 'Token expirado' })).mockResolvedValueOnce(resposta(401, {}))
    const erro = await api.listarNotificacoes().catch((e) => e)
    expect(erro.status).toBe(401)
    expect(api.lerTokens()).toBeNull()
  })
})
