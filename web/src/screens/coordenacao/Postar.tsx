import { useState } from 'react'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno, Materia, Turma } from '../../types'
import { PostarHub } from '../shared/PostarHub'
import { inputCls } from '../shared/formHelpers'

const ehFundamental = (t?: Turma) => t?.segmento === 'fundamental_1' || t?.segmento === 'fundamental_2'

export default function Postar() {
  const { session } = useSession()
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const [turmaId, setTurmaId] = useState<string | null>(null)
  const turmaAtiva = turmaId ?? turmas?.[0]?.id ?? null

  const { data: alunos } = usePolling<Aluno[]>(
    async () => (turmaAtiva ? api.get(`/alunos${qs({ turmaId: turmaAtiva })}`) : []),
    30000,
    [turmaAtiva],
  )

  if (!turmas?.length || !turmaAtiva || !session) return null

  const turma = turmas.find((t) => t.id === turmaAtiva)

  return (
    <div className="flex flex-col gap-4">
      <select className={`${inputCls} w-auto min-w-[180px] self-center text-center font-bold`} value={turmaAtiva} onChange={(e) => setTurmaId(e.target.value)}>
        {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>

      <PostarHub
        key={turmaAtiva}
        turmaId={turmaAtiva}
        alunos={alunos}
        autor={`Coordenação (${session.nome})`}
        ehCoordenacao
        ehFundamental={ehFundamental(turma)}
        serie={turma?.serie}
        materiasDisponiveis={materias ?? []}
        materias={materias ?? []}
      />
    </div>
  )
}
