// Cálculo do roadmap visual (S4-06): posições em percentagem dentro do intervalo mostrado.
const DIA = 86400 * 1000
const dia = (data) => new Date(`${String(data).slice(0, 10)}T00:00:00Z`).getTime()
const inicioDoMes = (ms) => {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
}
const mesSeguinte = (ms) => {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
}

// Sem Milestones, a barra de uma Release cobre as 4 semanas antes da data prevista.
const DIAS_POR_OMISSAO = 28

export function calcularGantt(releases, hoje = new Date()) {
  if (!releases.length) return null
  const agora = dia(hoje.toISOString())
  const linhas = releases.map((r) => {
    const fim = dia(r.data_prevista)
    const milestones = r.milestones.map((m) => ({ ...m, ms: dia(m.data) }))
    const inicio = Math.min(fim - DIAS_POR_OMISSAO * DIA, ...milestones.map((m) => m.ms))
    return { release: r, inicio, fim, milestones }
  })
  const de = inicioDoMes(Math.min(agora, ...linhas.map((l) => l.inicio)))
  const ate = mesSeguinte(Math.max(agora, ...linhas.map((l) => l.fim)))
  const pct = (ms) => Math.round(((ms - de) / (ate - de)) * 10000) / 100

  const meses = []
  for (let m = de; m < ate; m = mesSeguinte(m)) {
    meses.push({
      nome: new Date(m).toLocaleDateString('pt-PT', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      esquerda: pct(m),
      largura: pct(mesSeguinte(m)) - pct(m),
    })
  }
  return {
    meses,
    hoje: pct(agora),
    linhas: linhas.map((l) => ({
      release: l.release,
      esquerda: pct(l.inicio),
      largura: Math.max(pct(l.fim) - pct(l.inicio), 1),
      milestones: l.milestones.map((m) => ({ id: m.id, nome: m.nome, data: m.data, esquerda: pct(m.ms) })),
    })),
  }
}
