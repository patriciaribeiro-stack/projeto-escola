import { useState } from 'react'
import { api } from '../../api'
import type { MedicacaoAgendada } from '../../types'
import { Button, Card, Pill, SectionLabel, formatDateBR } from '../../components/ui'
import { FileAttach, type Anexo } from '../../components/FileAttach'
import { inputCls } from './formHelpers'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function horaAtual() {
  return new Date().toTimeString().slice(0, 5)
}

export function FormNovaMedicacao({ alunoId, autor, onDone }: { alunoId: string; autor: string; onDone: () => void }) {
  const [nomeMedicamento, setNomeMedicamento] = useState('')
  const [dosagem, setDosagem] = useState('')
  const [horarioNovo, setHorarioNovo] = useState('')
  const [horarios, setHorarios] = useState<string[]>([])
  const [dataInicio, setDataInicio] = useState(hoje())
  const [dataFim, setDataFim] = useState(hoje())
  const [observacoes, setObservacoes] = useState('')
  const [receita, setReceita] = useState<Anexo | null>(null)
  const [enviando, setEnviando] = useState(false)

  function adicionarHorario() {
    if (!horarioNovo || horarios.includes(horarioNovo)) return
    setHorarios([...horarios, horarioNovo].sort())
    setHorarioNovo('')
  }

  async function enviar() {
    setEnviando(true)
    try {
      await api.post('/medicacoes', {
        alunoId,
        nomeMedicamento,
        dosagem,
        horarios,
        dataInicio,
        dataFim,
        observacoes: observacoes.trim() || null,
        receitaAnexoNome: receita?.nome ?? null,
        receitaAnexoTipo: receita?.tipo ?? null,
        receitaAnexoDataUrl: receita?.dataUrl ?? null,
        registradoPor: autor,
      })
      setNomeMedicamento('')
      setDosagem('')
      setHorarios([])
      setDataInicio(hoje())
      setDataFim(hoje())
      setObservacoes('')
      setReceita(null)
      onDone()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <SectionLabel>Enviar medicamento pra escola</SectionLabel>
      <div className="mt-2.5 flex flex-col gap-2.5">
        <input autoComplete="off" className={inputCls} placeholder="Nome do medicamento" value={nomeMedicamento} onChange={(e) => setNomeMedicamento(e.target.value)} />
        <input autoComplete="off" className={inputCls} placeholder="Dosagem/quantidade (ex: 5ml, 1 comprimido)" value={dosagem} onChange={(e) => setDosagem(e.target.value)} />

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Horários de administração</span>
          <div className="mt-1.5 flex gap-2">
            <input autoComplete="off" type="time" className={`${inputCls} flex-1`} value={horarioNovo} onChange={(e) => setHorarioNovo(e.target.value)} />
            <button type="button" onClick={adicionarHorario} className="whitespace-nowrap rounded-lg bg-paper-sunken px-3 text-[12px] font-bold text-ink">
              Adicionar
            </button>
          </div>
          {!!horarios.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {horarios.map((h) => (
                <span key={h} className="flex items-center gap-1.5 rounded-full bg-blue-light px-3 py-1 text-[12px] font-bold text-blue">
                  {h}
                  <button type="button" onClick={() => setHorarios(horarios.filter((x) => x !== h))} className="text-blue">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <label className="flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-faint">De</span>
            <input autoComplete="off" type="date" className={`${inputCls} mt-1 w-full`} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </label>
          <label className="flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Até</span>
            <input autoComplete="off" type="date" className={`${inputCls} mt-1 w-full`} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </label>
        </div>

        <FileAttach value={receita} onChange={setReceita} accept="image/*,application/pdf" label="Anexar foto da receita (opcional)" />
        <textarea autoComplete="off" className={inputCls} rows={2} placeholder="Observações (opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />

        <Button
          disabled={!nomeMedicamento || !dosagem || !horarios.length || !dataInicio || !dataFim || enviando}
          onClick={enviar}
        >
          {enviando ? 'Enviando...' : 'Enviar pra escola'}
        </Button>
      </div>
    </Card>
  )
}

export function MedicacaoCard({ medicacao, papel, alunoNome, autor, onReload }: {
  medicacao: MedicacaoAgendada
  papel: 'pai' | 'staff'
  alunoNome?: string
  autor?: string
  onReload: () => void
}) {
  const [processando, setProcessando] = useState<string | null>(null)
  const hojeStr = hoje()
  const ativa = medicacao.ativo && hojeStr >= medicacao.dataInicio && hojeStr <= medicacao.dataFim
  const horariosDeHoje = ativa ? medicacao.horarios : []

  async function administrar(horario: string) {
    if (!autor) return
    setProcessando(horario)
    try {
      await api.post(`/medicacoes/${medicacao.id}/administrar`, { data: hojeStr, horario, administradoPor: autor })
      onReload()
    } finally {
      setProcessando(null)
    }
  }

  async function encerrar() {
    if (!confirm(`Encerrar o envio de ${medicacao.nomeMedicamento}?`)) return
    await api.patch(`/medicacoes/${medicacao.id}`, { ativo: false })
    onReload()
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          {!!alunoNome && <span className="text-[13px] font-bold">{alunoNome} · </span>}
          <span className="text-[13px] font-bold">{medicacao.nomeMedicamento}</span>
          <div className="mt-0.5 text-[12px] text-muted">{medicacao.dosagem}</div>
        </div>
        {!medicacao.ativo && <Pill tone="muted">Encerrada</Pill>}
      </div>

      <p className="mt-1.5 text-[11px] text-faint">
        {formatDateBR(medicacao.dataInicio)} a {formatDateBR(medicacao.dataFim)} · horários: {medicacao.horarios.join(', ')} · enviado por {medicacao.registradoPor}
      </p>
      {medicacao.observacoes && <p className="mt-1 text-[12px] text-muted">{medicacao.observacoes}</p>}
      {medicacao.receitaAnexoDataUrl && (
        <a href={medicacao.receitaAnexoDataUrl} download={medicacao.receitaAnexoNome ?? 'receita'} className="mt-1.5 inline-flex text-[11.5px] font-bold text-blue underline">
          Ver receita anexada
        </a>
      )}

      {!!horariosDeHoje.length && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Hoje</span>
          {horariosDeHoje.map((horario) => {
            const dose = medicacao.administracoes.find((a) => a.data === hojeStr && a.horario === horario)
            const atrasado = !dose && horario < horaAtual()
            return (
              <div key={horario} className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold">{horario}</span>
                {dose && <Pill tone="green">Dado às {dose.administradoEm.slice(11, 16)}</Pill>}
                {!dose && !atrasado && <Pill tone="blue">Agendado</Pill>}
                {!dose && atrasado && <Pill tone="red">Atrasado</Pill>}
                {papel === 'staff' && !dose && (
                  <Button className="w-auto px-3 py-1.5 text-[11.5px]" disabled={processando === horario} onClick={() => administrar(horario)}>
                    Já medicado
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {papel === 'pai' && medicacao.ativo && (
        <button onClick={encerrar} className="mt-2.5 text-[11.5px] font-bold text-red">Encerrar envio</button>
      )}
    </Card>
  )
}
