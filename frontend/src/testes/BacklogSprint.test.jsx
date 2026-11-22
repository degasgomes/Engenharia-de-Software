import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api.js'
import { useSessao } from '../sessao.jsx'
import BacklogSprint from '../pages/BacklogSprint.jsx'
import { mostrar, SESSOES, story } from './apoio.jsx'

vi.mock('../api.js')
vi.mock('../sessao.jsx')

const SPRINT = { id: 1, equipa: 1, equipa_nome: 'Equipa Alfa', numero: 1, objetivo: 'Relatórios agendados', data_inicio: '2026-11-16', data_fim: '2026-11-27', user_stories: [], total_story_points: 0, capacidade: 20, carga: [{ id: 5, nome: 'Rui Programador', capacidade_sp: 20, story_points: 0 }] }
const EQUIPA = { id: 1, nome: 'Equipa Alfa', membros: [{ id: 5, nome: 'Rui Programador', perfil: 'PROGRAMADOR' }] }
const PRONTA = story({ id: 2 })
const SEM_CRITERIOS = story({ id: 3, descricao: 'Pausar um agendamento', criterios: [], pronta: false })

beforeEach(() => {
  useSessao.mockReturnValue(SESSOES.gestor)
  api.listarSprints.mockResolvedValue([SPRINT])
  api.listarUserStories.mockResolvedValue([PRONTA, SEM_CRITERIOS])
  api.listarEquipas.mockResolvedValue([EQUIPA])
})

describe('Backlog e Sprint', () => {
  it('mostra o Product Backlog e quais as stories prontas', async () => {
    mostrar(<BacklogSprint />)
    expect(await screen.findByText('Pausar um agendamento')).toBeInTheDocument()
    expect(screen.getByText('✓ Pronta')).toBeInTheDocument()
    expect(screen.getByText('Sem critérios')).toBeInTheDocument()
    expect(screen.getByText('O Sprint Backlog está vazio.')).toBeInTheDocument()
  })

  it('mostra o erro 422 quando a story não cumpre a Definition of Ready', async () => {
    const erro = Object.assign(new Error('A story não cumpre a Definition of Ready: falta pelo menos um critério de aceitação.'), { status: 422 })
    api.moverParaSprint.mockRejectedValue(erro)
    mostrar(<BacklogSprint />)

    await userEvent.click(await screen.findByRole('button', { name: 'Mover US-003 para o Sprint' }))

    expect(api.moverParaSprint).toHaveBeenCalledWith(1, 3)
    expect(await screen.findByRole('alert')).toHaveTextContent('não cumpre a Definition of Ready')
  })

  it('move uma story pronta e volta a carregar o Sprint', async () => {
    api.moverParaSprint.mockResolvedValue({})
    mostrar(<BacklogSprint />)
    await screen.findByText('Pausar um agendamento')
    api.listarSprints.mockResolvedValue([{ ...SPRINT, user_stories: [{ ...PRONTA, sprint: 1 }], total_story_points: 5 }])
    api.listarUserStories.mockResolvedValue([{ ...PRONTA, sprint: 1 }, SEM_CRITERIOS])

    await userEvent.click(screen.getByRole('button', { name: 'Mover US-002 para o Sprint' }))

    expect(await screen.findByRole('button', { name: 'Retirar US-002 do Sprint' })).toBeInTheDocument()
    expect(screen.getByText('· 5 SP')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('o programador vê o planeamento mas não o altera', async () => {
    useSessao.mockReturnValue(SESSOES.programador)
    mostrar(<BacklogSprint />)
    await screen.findByText('Pausar um agendamento')
    expect(screen.queryByRole('button', { name: /para o Sprint/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Novo Sprint' })).not.toBeInTheDocument()
  })

  it('avisa quando o Sprint passa a capacidade da equipa', async () => {
    api.listarSprints.mockResolvedValue([
      { ...SPRINT, total_story_points: 26, carga: [{ id: 5, nome: 'Rui Programador', capacidade_sp: 20, story_points: 26 }] },
    ])
    mostrar(<BacklogSprint />)
    expect(await screen.findByText('26 de 20 SP · acima da capacidade')).toBeInTheDocument()
    expect(screen.getByText('26 / 20 SP')).toHaveClass('erro')
    expect(screen.getByRole('progressbar', { name: 'Carga da equipa' })).toHaveAttribute('aria-valuenow', '26')
  })

  it('dentro da capacidade não há aviso', async () => {
    mostrar(<BacklogSprint />)
    expect(await screen.findByText('0 de 20 SP')).toBeInTheDocument()
    expect(screen.queryByText(/acima da capacidade/)).not.toBeInTheDocument()
  })

  it('sem equipas, manda criar uma antes do Sprint', async () => {
    api.listarSprints.mockResolvedValue([])
    api.listarEquipas.mockResolvedValue([])
    mostrar(<BacklogSprint />)
    await userEvent.click(await screen.findByRole('button', { name: '+ Novo Sprint' }))
    await waitFor(() => expect(screen.getByRole('link', { name: 'Criar uma equipa →' })).toHaveAttribute('href', '/equipas'))
  })
})
