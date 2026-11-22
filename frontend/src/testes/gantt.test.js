import { describe, expect, it } from 'vitest'
import { calcularGantt } from '../gantt.js'

const HOJE = new Date('2026-11-10T12:00:00Z')
const release = (extra = {}) => ({ id: 1, nome: 'v1.1', data_prevista: '2026-12-04', milestones: [], pedidos: [], ...extra })

describe('calcularGantt', () => {
  it('não desenha nada sem releases', () => {
    expect(calcularGantt([], HOJE)).toBeNull()
  })

  it('mostra meses inteiros, de hoje até à última release', () => {
    const gantt = calcularGantt([release()], HOJE)
    expect(gantt.meses.map((m) => m.nome)).toHaveLength(2) // novembro e dezembro
    expect(gantt.meses[0].esquerda).toBe(0)
    expect(gantt.meses.reduce((soma, m) => soma + m.largura, 0)).toBeCloseTo(100, 0)
    expect(gantt.hoje).toBeGreaterThan(0)
    expect(gantt.hoje).toBeLessThan(gantt.linhas[0].esquerda + gantt.linhas[0].largura)
  })

  it('a barra acaba na data prevista e começa 4 semanas antes', () => {
    const { linhas } = calcularGantt([release()], HOJE)
    const dias = 61 // novembro + dezembro
    expect(linhas[0].esquerda).toBeCloseTo((5 / dias) * 100, 1) // 6 de novembro
    expect(linhas[0].esquerda + linhas[0].largura).toBeCloseTo((33 / dias) * 100, 1) // 4 de dezembro
  })

  it('um milestone mais cedo puxa o início da barra e fica dentro dela', () => {
    const milestones = [{ id: 9, nome: 'Beta', data: '2026-11-02' }]
    const { linhas } = calcularGantt([release({ milestones })], HOJE)
    expect(linhas[0].milestones[0].esquerda).toBe(linhas[0].esquerda)
    expect(linhas[0].milestones[0].nome).toBe('Beta')
  })

  it('alarga o intervalo a releases já passadas', () => {
    const antiga = release({ id: 2, nome: 'v1.0', data_prevista: '2026-09-15' })
    const gantt = calcularGantt([antiga, release()], HOJE)
    expect(gantt.meses.length).toBe(5) // de agosto a dezembro
    expect(gantt.linhas[0].esquerda).toBeLessThan(gantt.hoje)
  })
})
