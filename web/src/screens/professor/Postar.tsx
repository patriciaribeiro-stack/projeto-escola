import { useOutletContext } from 'react-router-dom'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno, Materia, Turma } from '../../types'
import { PostarHub } from '../shared/PostarHub'
import { elegivelAtividadeAvaliativa } from '../shared/AtividadesAvaliativas'
import type { ProfessorContext } from './ProfessorLayout'

const ehFundamental = (t?: Turma) => t?.segmento === 'fundamental_1' || t?.segmento === 'fundamental_2'

export default function Postar() {
  const { session, professor, nomeAutor } = useSession()
  const { turmaId } = useOutletContext<ProfessorContext>()
  const { data: alunos } = usePolling<Aluno[]>(async () => (turmaId ? api.get(`/alunos${qs({ turmaId })}`) : []), 30000, [turmaId])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])

  if (!turmaId || !session) return null

  const turma = turmas?.find((t) => t.id === turmaId)
  // Substituta não tem vínculos fixos com matéria — vê todas, igual à coordenação.
  const materiaIdsDoProfessor = new Set((professor?.vinculos ?? []).filter((v) => v.turmaId === turmaId).map((v) => v.materiaId))
  const materiasDisponiveis = session.role === 'substituto'
    ? (materias ?? [])
    : (materias ?? []).filter((m) => materiaIdsDoProfessor.has(m.id))

  return (
    <PostarHub
      turmaId={turmaId}
      alunos={alunos}
      autor={nomeAutor ?? ''}
      ehFundamental={ehFundamental(turma)}
      elegivelAvaliativa={elegivelAtividadeAvaliativa(turma)}
      serie={turma?.serie}
      materiasDisponiveis={materiasDisponiveis}
      materias={materias ?? []}
    />
  )
}
