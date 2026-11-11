import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Os ecrãs usam ligações e o cabeçalho com pesquisa, por isso precisam de um router.
export const mostrar = (ecra, caminho = '/') => render(<MemoryRouter initialEntries={[caminho]}>{ecra}</MemoryRouter>)

export const SESSOES = {
  cliente: { utilizador: { id: 2, nome: 'Sofia Cliente', perfil: 'CLIENTE' }, eGestor: false, podePlanear: false, eInterno: false },
  gestor: { utilizador: { id: 1, nome: 'Tiago Gestor', perfil: 'GESTOR_PRODUTO' }, eGestor: true, podePlanear: true, eInterno: true },
  programador: { utilizador: { id: 5, nome: 'Rui Programador', perfil: 'PROGRAMADOR' }, eGestor: false, podePlanear: false, eInterno: true },
}

export const story = (extra = {}) => ({
  id: 1,
  descricao: 'Como gestora, eu preciso de agendar relatórios.',
  story_points: 5,
  ordem_backlog: 1,
  estado: 'A_FAZER',
  estado_display: 'A Fazer',
  gerada_por_ia: false,
  pedido: 5,
  pedido_titulo: 'Agendar o envio de relatórios',
  pedido_estado: 'PLANEADO',
  sprint: null,
  sprint_numero: null,
  responsavel: null,
  responsavel_nome: null,
  criterios: [{ id: 1, dado: 'um relatório', quando: 'agendo', entao: 'é enviado' }],
  pronta: true,
  ...extra,
})
