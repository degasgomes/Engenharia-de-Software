import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api.js'
import { useSessao } from '../sessao.jsx'
import Estimativa from '../Estimativa.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import { mostrar, SESSOES } from './apoio.jsx'

vi.mock('../api.js')
vi.mock('../sessao.jsx')

const pedido = (extra = {}) => ({
  id: 1, titulo: 'Exportar relatórios', estado: 'EM_TRIAGEM', estado_display: 'Em Triagem',
  impacto: null, esforco: null, total_votos: 1, data_submissao: '2026-10-26T10:00:00Z', ...extra,
})

describe('Estimativa', () => {
  it('um pedido por avaliar não mostra score nem deixa guardar', () => {
    mostrar(<Estimativa pedido={pedido()} aoGuardar={() => {}} />)
    expect(screen.getAllByText('Por definir')).toHaveLength(2)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('Por avaliar: escolha o impacto e o esforço.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar estimativa' })).toBeDisabled()
  })

  it('só guarda depois de escolher os dois valores, e o valor do meio também se escolhe', async () => {
    const aoGuardar = vi.fn()
    api.avaliarPedido.mockResolvedValue(pedido({ impacto: 3, esforco: 2 }))
    mostrar(<Estimativa pedido={pedido()} aoGuardar={aoGuardar} />)
    const [impacto, esforco] = screen.getAllByRole('slider')

    await userEvent.click(impacto) // escolhe o 3 sem mexer o cursor
    expect(screen.getByText('Médio (3/5)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar estimativa' })).toBeDisabled()

    fireEvent.change(esforco, { target: { value: '2' } })
    expect(screen.getByText('48')).toBeInTheDocument() // 100 × 3 × (6 − 2) / 25
    await userEvent.click(screen.getByRole('button', { name: 'Guardar estimativa' }))
    expect(api.avaliarPedido).toHaveBeenCalledWith(1, 2, 3)
    expect(aoGuardar).toHaveBeenCalled()
  })

  it('um pedido já avaliado mostra a estimativa guardada', () => {
    mostrar(<Estimativa pedido={pedido({ impacto: 4, esforco: 3 })} aoGuardar={() => {}} />)
    expect(screen.getByText('Estimativa guardada')).toBeInTheDocument()
    expect(screen.getByText('48')).toBeInTheDocument()
  })
})

describe('Dashboard', () => {
  beforeEach(() => {
    useSessao.mockReturnValue(SESSOES.cliente)
    api.listarPedidos.mockResolvedValue([
      pedido({ id: 1, total_votos: 1 }),
      pedido({ id: 4, titulo: 'Exportar para disquete', estado: 'REJEITADO', estado_display: 'Rejeitado', total_votos: 9 }),
    ])
    api.obterRoadmap.mockResolvedValue([
      { id: 1, nome: 'v1.1', data_prevista: '2026-12-04', publicada: false, progresso: 50, pedidos: [{ id: 5 }], milestones: [] },
    ])
  })

  it('mostra o progresso de cada release', async () => {
    mostrar(<Dashboard />)
    const barra = await screen.findByRole('progressbar', { name: 'Progresso da v1.1' })
    expect(barra).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('não tem barra para Submetido e tem para os estados do roadmap', async () => {
    mostrar(<Dashboard />)
    await screen.findByText('Pedidos por estado')
    expect(screen.queryByText('Submetido')).not.toBeInTheDocument()
    expect(screen.getByText('Planeado')).toBeInTheDocument()
    expect(screen.getByText('Lançado')).toBeInTheDocument()
  })

  it('um pedido rejeitado não aparece nos mais votados', async () => {
    mostrar(<Dashboard />)
    await screen.findByText('Mais votados')
    // Aparece uma vez, em "Pedidos recentes", e não em "Mais votados".
    expect(screen.getAllByText('Exportar para disquete')).toHaveLength(1)
    expect(screen.getAllByText('Exportar relatórios')).toHaveLength(2)
  })
})
