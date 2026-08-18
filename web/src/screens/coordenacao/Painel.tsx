import { useState } from 'react'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { Aluno, Substituto, Turma } from '../../types'
import { Button, Card, SectionLabel } from '../../components/ui'
import { inputCls } from '../shared/formHelpers'
import Feeds from './Feeds'
import Atividades from './Atividades'


function SubstitutaCard() {
  const { data: substitutos, reload } = usePolling<Substituto[]>(async () => api.get('/substitutos'), 10000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const [turmaId, setTurmaId] = useState('')
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  const substituto = substitutos?.[0]
  const turmaAtualNome = turmas?.find((t) => t.id === substituto?.turmaAtualId)?.nome

  async function atribuir() {
    if (!substituto) return
    setSalvando(true)
    try {
      await api.patch(`/substitutos/${substituto.id}`, { turmaAtualId: turmaId, nomeAtual: nome })
      setTurmaId('')
      setNome('')
      reload()
    } finally {
      setSalvando(false)
    }
  }

  async function encerrar() {
    if (!substituto) return
    await api.patch(`/substitutos/${substituto.id}`, { turmaAtualId: null, nomeAtual: null })
    reload()
  }

  if (!substituto) return null

  return (
    <Card>
      <SectionLabel>Professor(a) eventual</SectionLabel>
      {substituto.turmaAtualId ? (
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold">{substituto.nomeAtual}</div>
            <div className="text-[11.5px] text-muted">Cobrindo {turmaAtualNome}</div>
          </div>
          <button onClick={encerrar} className="text-[11.5px] font-bold text-red">Encerrar substituição</button>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2">
          <p className="text-[11.5px] text-faint">Nenhuma substituição ativa no momento.</p>
          <select className={inputCls} value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            <option value="">Selecione a turma a cobrir</option>
            {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <input autoComplete="off" className={inputCls} placeholder="Nome de quem vai cobrir" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Button disabled={!turmaId || !nome || salvando} onClick={atribuir}>
            {salvando ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </div>
      )}
    </Card>
  )
}

type Sub = 'visao' | 'atividades' | 'feeds'

export default function Painel() {
  const [sub, setSub] = useState<Sub>('visao')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 rounded-xl bg-paper-sunken p-1">
        {(
          [
            ['visao', 'Visão geral'],
            ['atividades', 'Atividades'],
            ['feeds', 'Feed'],
          ] as [Sub, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 rounded-lg py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'visao' && <VisaoGeral />}
      {sub === 'atividades' && <Atividades />}
      {sub === 'feeds' && <Feeds />}
    </div>
  )
}

function VisaoGeral() {
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])

  const totalAlunos = alunos?.length ?? 0
  const totalTurmas = turmas?.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      <SubstitutaCard />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-[22px] font-bold font-mono">{totalTurmas}</div>
          <div className="text-[11.5px] text-muted">Turmas ativas</div>
        </Card>
        <Card>
          <div className="text-[22px] font-bold font-mono">{totalAlunos}</div>
          <div className="text-[11.5px] text-muted">Alunos matriculados</div>
        </Card>
      </div>
    </div>
  )
}
