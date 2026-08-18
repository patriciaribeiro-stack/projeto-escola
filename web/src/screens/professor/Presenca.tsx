import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno, Materia, Presenca as PresencaType, Turma } from '../../types'
import { Avatar, Button, Card } from '../../components/ui'
import { inputCls } from '../shared/formHelpers'
import type { ProfessorContext } from './ProfessorLayout'

const ehFundamental = (t?: Turma) => t?.segmento === 'fundamental_1' || t?.segmento === 'fundamental_2'

export default function Presenca() {
  const { session, professor } = useSession()
  const { turmaId } = useOutletContext<ProfessorContext>()
  const hoje = new Date().toISOString().slice(0, 10)

  const { data: alunos } = usePolling<Aluno[]>(async () => (turmaId ? api.get(`/alunos${qs({ turmaId })}`) : []), 30000, [turmaId])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const { data: presencas } = usePolling<PresencaType[]>(
    async () => (turmaId ? api.get(`/presencas${qs({ turmaId, data: hoje })}`) : []),
    10000,
    [turmaId],
  )

  const turma = turmas?.find((t) => t.id === turmaId)
  const fundamental = ehFundamental(turma)
  const materiaIdsDoProfessor = new Set((professor?.vinculos ?? []).filter((v) => v.turmaId === turmaId).map((v) => v.materiaId))
  const materiasDisponiveis = session?.role === 'substituto'
    ? (materias ?? [])
    : (materias ?? []).filter((m) => materiaIdsDoProfessor.has(m.id))

  const [materiaId, setMateriaId] = useState('')
  useEffect(() => {
    if (fundamental && !materiaId && materiasDisponiveis.length) setMateriaId(materiasDisponiveis[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundamental, materiasDisponiveis.length])

  const materiaChave = fundamental ? materiaId || null : null

  const aulasExistentes = [...new Set((presencas ?? []).filter((p) => p.materiaId === materiaChave).map((p) => p.aula))].sort((a, b) => a - b)
  const [aulaSelecionada, setAulaSelecionada] = useState(1)
  useEffect(() => {
    setAulaSelecionada(aulasExistentes[0] ?? 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaChave])

  const [marcas, setMarcas] = useState<Record<string, boolean>>({})
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [avisoVolta, setAvisoVolta] = useState<string[]>([])

  useEffect(() => {
    if (!alunos) return
    const next: Record<string, boolean> = {}
    for (const a of alunos) {
      const existente = presencas?.find((p) => p.alunoId === a.id && p.materiaId === materiaChave && p.aula === aulaSelecionada)
      next[a.id] = existente ? existente.presente : true
    }
    setMarcas(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alunos, presencas, materiaChave, aulaSelecionada])

  async function salvar() {
    if (!turmaId || !alunos) return
    if (fundamental && !materiaId) return
    setSalvando(true)
    try {
      const resultado = await api.post<{ ok: true; avisosVolta: string[] }>('/presencas/bulk', {
        turmaId,
        data: hoje,
        materiaId: materiaChave,
        aula: aulaSelecionada,
        marcas: alunos.map((a) => ({ alunoId: a.id, presente: marcas[a.id] ?? true })),
      })
      const nomes = resultado.avisosVolta.map((id) => alunos.find((a) => a.id === id)?.nome).filter((n): n is string => !!n)
      setAvisoVolta(nomes)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {fundamental && (
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">Matéria</p>
          {materiasDisponiveis.length > 1 ? (
            <select className={inputCls} value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
              {materiasDisponiveis.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          ) : (
            <p className="text-[13px] font-bold">{materiasDisponiveis[0]?.nome ?? '...'}</p>
          )}
        </div>
      )}

      {fundamental && (
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">Aula de hoje</p>
          <div className="flex flex-wrap gap-1.5">
            {(aulasExistentes.length ? aulasExistentes : [1]).map((n) => (
              <button
                key={n}
                onClick={() => setAulaSelecionada(n)}
                className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold ${
                  aulaSelecionada === n ? 'border-green bg-green text-white' : 'border-line text-muted'
                }`}
              >
                Aula {n}
              </button>
            ))}
            <button
              onClick={() => setAulaSelecionada((aulasExistentes[aulasExistentes.length - 1] ?? 0) + 1)}
              className="rounded-full border-[1.5px] border-dashed border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-blue"
            >
              + Nova aula
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-faint">
        {fundamental
          ? 'Presença é lançada por aula — cada matéria e cada aula do dia tem sua própria lista, sem sobrescrever as outras.'
          : 'Todos começam marcados como presentes — toque em quem faltou.'} Visível só para você e a coordenação.
      </p>

      <Card className="p-0">
        {alunos?.map((a, i) => (
          <div key={a.id} className={`flex items-center gap-3 p-3.5 ${i > 0 ? 'border-t border-line' : ''}`}>
            <Avatar label={a.iniciais} />
            <span className="w-5 flex-shrink-0 text-[12px] font-bold text-faint">{i + 1}</span>
            <span className="flex-1 text-[13.5px] font-semibold">{a.nome}</span>
            <button
              onClick={() => setMarcas((m) => ({ ...m, [a.id]: !m[a.id] }))}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                marcas[a.id] ? 'bg-green-light text-green-dark' : 'bg-red-light text-red'
              }`}
            >
              {marcas[a.id] ? 'Presente' : 'Faltou'}
            </button>
          </div>
        ))}
      </Card>

      <Button onClick={salvar} disabled={salvando || (fundamental && !materiaId)}>
        {salvo ? 'Presença salva ✓' : salvando ? 'Salvando...' : 'Salvar presença'}
      </Button>

      {!!avisoVolta.length && (
        <div className="rounded-xl bg-amber-light px-3.5 py-3 text-[13px] font-semibold text-amber">
          {avisoVolta.length === 1
            ? `${avisoVolta[0]} voltou e tem lição marcada como "faltou" — reveja em Acompanhar > Lições.`
            : `${avisoVolta.join(', ')} voltaram e têm lição marcada como "faltou" — reveja em Acompanhar > Lições.`}
        </div>
      )}
    </div>
  )
}
