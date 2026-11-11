import { describe, expect, it } from 'vitest'
import { codigoPedido, codigoStory, iniciais, score } from '../formatos.js'

describe('score de priorização', () => {
  it('é 100 com impacto máximo e esforço mínimo', () => {
    expect(score({ impacto: 5, esforco: 1 })).toBe(100)
  })
  it('desce quando o esforço sobe', () => {
    expect(score({ impacto: 4, esforco: 3 })).toBe(48)
    expect(score({ impacto: 1, esforco: 5 })).toBe(4)
  })
  it('não existe antes de o pedido ser avaliado', () => {
    expect(score({ impacto: null, esforco: null })).toBeNull()
    expect(score({ impacto: 3, esforco: null })).toBeNull()
  })
})

describe('códigos e iniciais', () => {
  it('formata os códigos com três algarismos', () => {
    expect(codigoPedido(7)).toBe('F-007')
    expect(codigoStory(12)).toBe('US-012')
  })
  it('usa as duas primeiras iniciais do nome', () => {
    expect(iniciais('sofia marques cliente')).toBe('SM')
    expect(iniciais('')).toBe('')
  })
})
