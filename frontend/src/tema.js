// Tema claro ou escuro. A escolha fica guardada no browser; na primeira visita segue o sistema.
const CHAVE = 'featureflow.tema'
const TEMAS = ['claro', 'escuro']

export function lerTema() {
  let guardado = null
  try {
    guardado = localStorage.getItem(CHAVE)
  } catch {
    // Sem acesso ao armazenamento (janela privada): usa-se a preferência do sistema.
  }
  if (TEMAS.includes(guardado)) return guardado
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema
}

export function guardarTema(tema) {
  aplicarTema(tema)
  try {
    localStorage.setItem(CHAVE, tema)
  } catch {
    // O tema fica aplicado nesta visita, só não é lembrado.
  }
}

export const outroTema = (tema) => (tema === 'escuro' ? 'claro' : 'escuro')
