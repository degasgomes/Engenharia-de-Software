import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api.js'
import { useSessao } from '../sessao.jsx'
import Notificacoes from '../pages/Notificacoes.jsx'
import Roadmap from '../pages/Roadmap.jsx'
import { mostrar, SESSOES } from './apoio.jsx'

vi.mock('../api.js')
vi.mock('../sessao.jsx')

const RELEASE = {
  id: 1,
  nome: 'v1.1',
  data_prevista: '2026-12-04',
  data_publicacao: null,
  publicada: false,
  milestones: [{ id: 1, nome: 'Beta para clientes', data: '2026-11-27' }],
  pedidos: [{ id: 5, titulo: 'Agendar o envio de relatórios', estado: 'PLANEADO', estado_display: 'Planeado' }],
}

describe('Roadmap', () => {
  beforeEach(() => {
    api.obterRoadmap.mockResolvedValue([RELEASE])
    api.listarPedidos.mockResolvedValue([{ id: 3, titulo: 'Modo escuro', estado: 'APROVADO' }])
  })

  it('o cliente vê as releases mas não as gere', async () => {
    useSessao.mockReturnValue(SESSOES.cliente)
    mostrar(<Roadmap />)
    expect(await screen.findByText('Agendar o envio de relatórios')).toBeInTheDocument()
    expect(screen.getByText(/Beta para clientes/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Roadmap das releases/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar release' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Nova release' })).not.toBeInTheDocument()
  })

  it('publicar pede confirmação antes de lançar os pedidos', async () => {
    useSessao.mockReturnValue(SESSOES.gestor)
    api.publicarRelease.mockResolvedValue({})
    mostrar(<Roadmap />)
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar release' }))
    expect(api.publicarRelease).not.toHaveBeenCalled()
    expect(screen.getByText(/Não dá para desfazer/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar publicação' }))
    expect(api.publicarRelease).toHaveBeenCalledWith(1)
  })

  it('uma release publicada já não mostra ações', async () => {
    useSessao.mockReturnValue(SESSOES.gestor)
    api.obterRoadmap.mockResolvedValue([{ ...RELEASE, publicada: true, data_publicacao: '2026-12-04T10:00:00Z' }])
    mostrar(<Roadmap />)
    expect(await screen.findByText('Publicada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar release' })).not.toBeInTheDocument()
  })

  it('associa um pedido aprovado à release', async () => {
    useSessao.mockReturnValue(SESSOES.gestor)
    api.associarPedido.mockResolvedValue({})
    mostrar(<Roadmap />)
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Pedido aprovado para a v1.1' }), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Associar' }))
    expect(api.associarPedido).toHaveBeenCalledWith(1, '3')
  })
})

describe('Notificações', () => {
  beforeEach(() => {
    useSessao.mockReturnValue(SESSOES.cliente)
  })

  it('conta as que estão por ler e marca uma como lida', async () => {
    api.listarNotificacoes.mockResolvedValue([
      { id: 1, mensagem: 'O pedido "Modo escuro" foi planeado para a release v1.1.', lida: false, data: new Date().toISOString(), pedido: 3 },
      { id: 2, mensagem: 'Notificação antiga', lida: true, data: '2026-11-01T10:00:00Z', pedido: null },
    ])
    api.marcarLida.mockResolvedValue({})
    mostrar(<Notificacoes />)
    expect(await screen.findByText('1 por ler')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver pedido' })).toHaveAttribute('href', '/pedidos/3')
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como lida' }))
    expect(api.marcarLida).toHaveBeenCalledWith(1)
  })

  it('explica quando não há notificações', async () => {
    api.listarNotificacoes.mockResolvedValue([])
    mostrar(<Notificacoes />)
    expect(await screen.findByText('Ainda não há notificações')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marcar todas como lidas' })).toBeDisabled()
  })
})
