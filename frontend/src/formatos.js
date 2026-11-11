// Formatação partilhada pelos ecrãs.

export const codigoPedido = (id) => `F-${String(id).padStart(3, '0')}`

// Score de priorização: alto impacto e baixo esforço → perto de 100.
export const score = (p) =>
  p.impacto && p.esforco ? Math.round((100 * p.impacto * (6 - p.esforco)) / 25) : null

export const NIVEL = { 1: 'Muito baixo', 2: 'Baixo', 3: 'Médio', 4: 'Alto', 5: 'Muito alto' }

export function tempoRelativo(data) {
  const segundos = (Date.now() - new Date(data).getTime()) / 1000
  const formato = new Intl.RelativeTimeFormat('pt-PT', { numeric: 'auto' })
  if (segundos < 3600) return formato.format(-Math.max(1, Math.round(segundos / 60)), 'minute')
  if (segundos < 86400) return formato.format(-Math.round(segundos / 3600), 'hour')
  return formato.format(-Math.round(segundos / 86400), 'day')
}

export function iniciais(nome = '') {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('')
}

export const dataCurta = (data) =>
  data ? new Date(data).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const codigoStory = (id) => `US-${String(id).padStart(3, '0')}`
