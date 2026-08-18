import { Link, useOutletContext } from 'react-router-dom'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno } from '../../types'
import { Avatar, Card } from '../../components/ui'
import { IconChevron } from '../../components/Icons'
import type { ProfessorContext } from './ProfessorLayout'

export default function Turma() {
  const { turmaId } = useOutletContext<ProfessorContext>()
  const { data: alunos } = usePolling<Aluno[]>(async () => (turmaId ? api.get(`/alunos${qs({ turmaId })}`) : []), 30000, [turmaId])

  return (
    <div className="flex flex-col gap-2.5">
      {alunos?.map((a, i) => (
        <Link key={a.id} to={`/professor/turma/${a.id}`}>
          <Card className="flex items-center gap-3">
            <Avatar label={a.iniciais} tone="green" />
            <span className="w-5 flex-shrink-0 text-[12px] font-bold text-faint">{i + 1}</span>
            <span className="flex-1 text-[13.5px] font-semibold">{a.nome}</span>
            <IconChevron className="h-4 w-4 text-faint" />
          </Card>
        </Link>
      ))}
    </div>
  )
}
