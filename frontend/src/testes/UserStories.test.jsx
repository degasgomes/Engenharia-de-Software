import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api.js'
import { useSessao } from '../sessao.jsx'
import UserStories from '../pages/UserStories.jsx'
import { mostrar, SESSOES, story } from './apoio.jsx'

vi.mock('../api.js')
vi.mock('../sessao.jsx')

const PEDIDOS = [
  { id: 3, titulo: 'Modo escuro', estado: 'APROVADO' },
  { id: 1, titulo: 'Exportar relatórios', estado: 'EM_TRIAGEM' },
]

beforeEach(() => {
  useSessao.mockReturnValue(SESSOES.gestor)
  api.listarUserStories.mockResolvedValue([story()])
  api.listarPedidos.mockResolvedValue(PEDIDOS)
})

describe('User Stories', () => {
  it('só deixa gerar stories de pedidos aprovados', async () => {
    mostrar(<UserStories />)
    const escolha = await screen.findByRole('combobox', { name: 'Pedido aprovado' })
    expect(within(escolha).getByRole('option', { name: 'F-003 Modo escuro' })).toBeInTheDocument()
    expect(within(escolha).queryByRole('option', { name: /Exportar relatórios/ })).not.toBeInTheDocument()
  })

  it('avisa que o esboço veio da IA', async () => {
    api.gerarUserStory.mockResolvedValue(story({ id: 8, gerada_por_ia: true }))
    mostrar(<UserStories />)
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Pedido aprovado' }), '3')
    await userEvent.click(screen.getByRole('button', { name: /Gerar esboço/ }))
    expect(api.gerarUserStory).toHaveBeenCalledWith('3')
    expect(await screen.findByRole('status')).toHaveTextContent('A IA escreveu o esboço US-008')
  })

  it('avisa quando a IA falhou e a story ficou sem critérios', async () => {
    api.gerarUserStory.mockResolvedValue(story({ id: 9, gerada_por_ia: false, criterios: [], pronta: false }))
    mostrar(<UserStories />)
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Pedido aprovado' }), '3')
    await userEvent.click(screen.getByRole('button', { name: /Gerar esboço/ }))
    expect(await screen.findByRole('status')).toHaveTextContent('A IA não respondeu')
  })

  it('acrescenta um critério Dado/Quando/Então', async () => {
    api.acrescentarCriterio.mockResolvedValue({})
    mostrar(<UserStories />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Dado' }), 'um agendamento')
    await userEvent.type(screen.getByRole('textbox', { name: 'Quando' }), 'chega a hora')
    await userEvent.type(screen.getByRole('textbox', { name: 'Então' }), 'o e-mail sai')
    await userEvent.click(screen.getByRole('button', { name: '+ Critério' }))
    expect(api.acrescentarCriterio).toHaveBeenCalledWith(1, { dado: 'um agendamento', quando: 'chega a hora', entao: 'o e-mail sai' })
  })

  it('no quadro, a story só avança para a coluna seguinte', async () => {
    api.mudarEstadoStory.mockResolvedValue({})
    mostrar(<UserStories />)
    await userEvent.click(await screen.findByRole('tab', { name: 'Quadro de estados' }))
    const aFazer = screen.getByRole('region', { name: 'A Fazer' })
    expect(within(aFazer).getByRole('button', { name: 'Recuar US-001' })).toBeDisabled()
    await userEvent.click(within(aFazer).getByRole('button', { name: 'Avançar US-001' }))
    expect(api.mudarEstadoStory).toHaveBeenCalledWith(1, 'EM_PROGRESSO')
  })

  it('avisa no quadro quando há stories em curso de um pedido sem release', async () => {
    api.listarUserStories.mockResolvedValue([
      story({ estado: 'EM_PROGRESSO', estado_display: 'Em Progresso', pedido_estado: 'APROVADO' }),
      story({ id: 2, estado: 'EM_PROGRESSO', estado_display: 'Em Progresso', pedido_estado: 'EM_DESENVOLVIMENTO' }),
    ])
    mostrar(<UserStories />)
    await userEvent.click(await screen.findByRole('tab', { name: 'Quadro de estados' }))
    expect(screen.getByRole('note')).toHaveTextContent('Há 1 story em curso de pedidos que ainda não estão numa Release')
    expect(screen.getAllByText('Pedido sem release')).toHaveLength(1)
  })

  it('sem stories nessa situação, o quadro não mostra o aviso', async () => {
    mostrar(<UserStories />)
    await userEvent.click(await screen.findByRole('tab', { name: 'Quadro de estados' }))
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('o programador não gera nem edita stories', async () => {
    useSessao.mockReturnValue(SESSOES.programador)
    mostrar(<UserStories />)
    await screen.findByText(/agendar relatórios/)
    expect(screen.queryByRole('button', { name: /Gerar esboço/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })
})
