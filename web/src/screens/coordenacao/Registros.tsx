import { useState } from 'react'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { AchadoPerdido, Aluno, Atestado, SaidaAntecipada } from '../../types'
import { Card, EmptyState, Pill, formatDateBR, timeAgo } from '../../components/ui'

type Sub = 'saidas' | 'achados' | 'atestados'

export default function Registros() {
  const [sub, setSub] = useState<Sub>('saidas')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-paper-sunken p-1">
        {(
          [
            ['saidas', 'Saídas'],
            ['achados', 'Achados e Perdidos'],
            ['atestados', 'Atestados'],
          ] as [Sub, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'saidas' && <SaidasCoord />}
      {sub === 'achados' && <AchadosCoord />}
      {sub === 'atestados' && <AtestadosCoord />}
    </div>
  )
}

function SaidasCoord() {
  const hoje = new Date().toISOString().slice(0, 10)
  const { data: saidas } = usePolling<SaidaAntecipada[]>(async () => api.get(`/saidas-antecipadas${qs({ data: hoje })}`), 8000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'

  if (!saidas?.length) return <EmptyState>Nenhuma saída antecipada avisada para hoje.</EmptyState>

  return (
    <div className="flex flex-col gap-2.5">
      {saidas.map((s) => (
        <Card key={s.id}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold">{nome(s.alunoId)}</span>
            <span className="text-[13px] font-bold text-blue">{s.horario}</span>
          </div>
          {s.motivo && <p className="mt-1 text-[12.5px] text-muted">{s.motivo}</p>}
          <p className="mt-1 text-[11px] text-faint">Avisado por {s.criadoPor} · {timeAgo(s.criadoEm)}</p>
        </Card>
      ))}
    </div>
  )
}

function AtestadosCoord() {
  const { data: atestados } = usePolling<Atestado[]>(async () => api.get('/atestados'), 8000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'

  if (!atestados?.length) return <EmptyState>Nenhum atestado enviado ainda.</EmptyState>

  return (
    <div className="flex flex-col gap-2.5">
      {atestados.map((a) => (
        <Card key={a.id} className="flex items-start gap-3">
          {a.arquivoDataUrl && a.arquivoTipo?.startsWith('image/') ? (
            <img src={a.arquivoDataUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-paper-sunken text-[9px] font-bold text-muted">
              {a.arquivoNome ? 'ARQUIVO' : 'Sem anexo'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold">{nome(a.alunoId)}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">{a.motivo}</div>
            <div className="mt-1 text-[11px] text-faint">
              {formatDateBR(a.dataInicio)} a {formatDateBR(a.dataFim)} · {timeAgo(a.criadoEm)}
            </div>
            {a.arquivoDataUrl && (
              <a href={a.arquivoDataUrl} download={a.arquivoNome ?? 'atestado'} className="mt-1 inline-block text-[11.5px] font-bold text-blue underline">
                Ver anexo
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function AchadosCoord() {
  const { data: achados, reload } = usePolling<AchadoPerdido[]>(async () => api.get('/achados'), 6000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'

  async function marcarEncontrado(id: string) {
    await api.patch(`/achados/${id}`, { estado: 'encontrado' })
    reload()
  }

  if (!achados?.length) return <EmptyState>Nenhum item reportado.</EmptyState>

  return (
    <div className="flex flex-col gap-2.5">
      {achados.map((a) => (
        <Card key={a.id}>
          <div className="flex items-start gap-3">
            {a.fotoDataUrl ? (
              <a href={a.fotoDataUrl} download={a.fotoNome ?? 'foto'} target="_blank" rel="noreferrer">
                <img src={a.fotoDataUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
              </a>
            ) : (
              <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-paper-sunken" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{nome(a.alunoId)}</span>
                <Pill tone={a.estado === 'encontrado' ? 'green' : 'red'}>{a.estado === 'encontrado' ? 'Encontrado' : 'Procurando'}</Pill>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">{a.descricao}</p>
              {a.fotoDataUrl && (
                <a href={a.fotoDataUrl} download={a.fotoNome ?? 'foto'} className="mt-1 inline-block text-[11.5px] font-bold text-blue underline">
                  Ver foto
                </a>
              )}
            </div>
          </div>
          {a.estado === 'reportado' && (
            <button onClick={() => marcarEncontrado(a.id)} className="mt-2 text-[12px] font-bold text-blue">
              Marcar como encontrado
            </button>
          )}
        </Card>
      ))}
    </div>
  )
}
