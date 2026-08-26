import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { Aluno, Relatorio, Turma as TurmaType } from '../../types'
import { Card, EmptyState, Pill, timeAgo } from '../../components/ui'
import { inputCls } from '../shared/formHelpers'
import { LicoesLista } from '../shared/LicoesLista'
import Relatorios from './Relatorios'
import LivroDidatico from './LivroDidatico'
import Semanarios from './Semanarios'

type Sub = 'alunos' | 'licoes' | 'relatorios' | 'estatisticas' | 'livro' | 'semanario'

export default function Turma() {
  const [params] = useSearchParams()
  const subInicial = (params.get('sub') as Sub) || 'alunos'
  const [sub, setSub] = useState<Sub>(subInicial)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-paper-sunken p-1">
        {(
          [
            ['alunos', 'Alunos'],
            ['licoes', 'Lições'],
            ['relatorios', 'Diário'],
            ['estatisticas', 'Relatórios'],
            ['livro', 'Livro didático'],
            ['semanario', 'Semanário'],
          ] as [Sub, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 whitespace-nowrap rounded-lg border border-line px-2 py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'text-muted'}`}>
            {label}
          </button>
        ))}
      </div>

      {sub === 'alunos' && <AlunosPorTurma />}
      {sub === 'licoes' && <Licoes />}
      {sub === 'relatorios' && <RelatoriosTexto />}
      {sub === 'estatisticas' && <Relatorios />}
      {sub === 'livro' && <LivroDidatico />}
      {sub === 'semanario' && <Semanarios />}
    </div>
  )
}

function AlunosPorTurma() {
  const { data: turmas } = usePolling<TurmaType[]>(async () => api.get('/turmas'), 60000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 15000, [])
  const [turmaAbertaId, setTurmaAbertaId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-[22px] font-bold font-mono">{turmas?.length ?? 0}</div>
          <div className="text-[11.5px] text-muted">Turmas ativas</div>
        </Card>
        <Card>
          <div className="text-[22px] font-bold font-mono">{alunos?.length ?? 0}</div>
          <div className="text-[11.5px] text-muted">Alunos matriculados</div>
        </Card>
      </div>

      {!turmas?.length ? (
        <EmptyState>Nenhuma turma cadastrada.</EmptyState>
      ) : (
      <div className="flex flex-col gap-2">
      {turmas.map((t) => {
        const alunosDaTurma = (alunos ?? [])
          .filter((a) => a.turmaId === t.id)
          .sort((a, b) => a.nome.localeCompare(b.nome))
        const aberta = turmaAbertaId === t.id
        return (
          <Card key={t.id}>
            <button
              onClick={() => setTurmaAbertaId(aberta ? null : t.id)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="text-[13px] font-bold">{t.nome}</span>
              <div className="flex items-center gap-2">
                <Pill tone="muted"><span className="font-mono">{alunosDaTurma.length}</span> aluno(s)</Pill>
                <span className="text-[11px] font-bold text-blue">{aberta ? 'Ocultar' : 'Ver alunos'}</span>
              </div>
            </button>
            {aberta && (
              <div className="mt-2.5 border-t border-line pt-2.5">
                {!alunosDaTurma.length ? (
                  <p className="text-[12px] text-muted">Nenhum aluno matriculado nessa turma ainda.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {alunosDaTurma.map((a, i) => (
                      <div key={a.id} className="flex items-center justify-between text-[12.5px]">
                        <span><span className="text-faint">{i + 1}.</span> {a.nome}</span>
                        <span className="text-faint">{a.periodo === 'integral' ? 'Integral' : 'Meio período'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
      </div>
      )}
    </div>
  )
}

function Licoes() {
  const { session } = useSession()
  return <LicoesLista podeEditar autorConferir={`Coordenação: ${session?.nome}`} />
}

function RelatoriosTexto() {
  const { data: relatorios } = usePolling<Relatorio[]>(async () => api.get('/relatorios'), 8000, [])
  const { data: turmas } = usePolling<TurmaType[]>(async () => api.get('/turmas'), 60000, [])
  const [turmaId, setTurmaId] = useState('')
  const [dia, setDia] = useState('')

  const filtrados = (relatorios ?? []).filter((r) => {
    if (turmaId && r.turmaId !== turmaId) return false
    if (dia && r.criadoEm.slice(0, 10) !== dia) return false
    return true
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <select className={`${inputCls} flex-1`} value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
          <option value="">Todas as turmas</option>
          {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input autoComplete="off" type="date" className={`${inputCls} flex-1`} value={dia} onChange={(e) => setDia(e.target.value)} />
      </div>
      {(turmaId || dia) && (
        <button onClick={() => { setTurmaId(''); setDia('') }} className="self-start text-[11.5px] font-bold text-blue">
          Limpar filtro
        </button>
      )}

      {!filtrados.length && <EmptyState>Nenhum relatório encontrado com esse filtro.</EmptyState>}
      {filtrados.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold">{r.autor}</span>
            <span className="text-[11px] text-faint">{timeAgo(r.criadoEm)}</span>
          </div>
          <p className="mt-1 whitespace-pre-line text-[13px]">{r.texto}</p>
          {!!r.aulas?.length && <p className="mt-1 text-[11.5px] text-muted">Aulas de hoje: {r.aulas.join(', ')}</p>}
          <p className="mt-1 text-[11px] text-faint">{r.alunoId ? 'Relatório individual' : 'Relatório de turma'}</p>
        </Card>
      ))}
    </div>
  )
}
