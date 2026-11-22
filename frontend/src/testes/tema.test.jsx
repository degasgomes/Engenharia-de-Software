import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotaoTema } from '../components.jsx'
import { aplicarTema, lerTema } from '../tema.js'

const sistema = (escuro) => vi.stubGlobal('matchMedia', () => ({ matches: escuro }))

afterEach(() => {
  delete document.documentElement.dataset.tema
  vi.unstubAllGlobals()
})

describe('tema', () => {
  it('na primeira visita segue a preferência do sistema', () => {
    sistema(true)
    expect(lerTema()).toBe('escuro')
    sistema(false)
    expect(lerTema()).toBe('claro')
  })

  it('a escolha guardada ganha à preferência do sistema', () => {
    sistema(true)
    localStorage.setItem('featureflow.tema', 'claro')
    expect(lerTema()).toBe('claro')
  })

  it('ignora um valor guardado que não é um tema', () => {
    sistema(false)
    localStorage.setItem('featureflow.tema', 'roxo')
    expect(lerTema()).toBe('claro')
  })

  it('o botão troca o tema, aplica-o à página e guarda-o', async () => {
    sistema(false)
    aplicarTema(lerTema())
    render(<BotaoTema />)

    await userEvent.click(screen.getByRole('button', { name: 'Mudar para o modo escuro' }))
    expect(document.documentElement.dataset.tema).toBe('escuro')
    expect(localStorage.getItem('featureflow.tema')).toBe('escuro')

    await userEvent.click(screen.getByRole('button', { name: 'Mudar para o modo claro' }))
    expect(document.documentElement.dataset.tema).toBe('claro')
    expect(lerTema()).toBe('claro')
  })
})
