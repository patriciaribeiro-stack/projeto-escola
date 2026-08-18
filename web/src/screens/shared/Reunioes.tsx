import { useState } from 'react'
import { api } from '../../api'
import type { Coordenador, Reuniao, ReuniaoTipo } from '../../types'
import { Button, Card, Chip, Pill, SectionLabel, formatDateBR } from '../../components/ui'
import { inputCls } from './formHelpers'

export const TIPO_LABEL: Record<ReuniaoTipo, string> = {
  online: 'Online',
  ligacao: 'Ligação',
  presencial: 'Presencial',
}

export function formatDataHora(iso: string) {
  return `${formatDateBR(iso)} às ${iso.slice(11, 16)}`
}

const ESTADO_PILL: Record<Reuniao['estado'], { tone: 'amber' | 'green' | 'red' | 'blue' | 'muted'; label: string }> = {
  pendente: { tone: 'amber', label: 'Aguardando resposta' },
  contraproposta: { tone: 'blue', label: 'Novo horário sugerido' },
  aceita_pelo_pai: { tone: 'blue', label: 'Aceito — aguardando confirmação' },
  confirmada: { tone: 'green', label: 'Confirmada' },
  cancelada: { tone: 'muted', label: 'Cancelada' },
}

export function FormNovaReuniao({ alunoId, paiId, coordenadoras, onDone }: {
  alunoId: string
  paiId: string
  coordenadoras: Coordenador[]
  onDone: () => void
}) {
  const [coordenadoraId, setCoordenadoraId] = useState('')
  const [horario, setHorario] = useState('')
  const [motivo, setMotivo] = useState('')
  const [tipo, setTipo] = useState<ReuniaoTipo>('presencial')
  const [enviando, setEnviando] = useState(false)

  const coordenadora = coordenadoras.find((c) => c.id === coordenadoraId)

  async function enviar() {
    setEnviando(true)
    try {
      await api.post('/reunioes', {
        alunoId,
        paiId,
        coordenadoraId,
        coordenadoraNome: coordenadora?.nome ?? '',
        motivo,
        tipo,
        horarioSugeridoPai: horario,
      })
      setCoordenadoraId('')
      setHorario('')
      setMotivo('')
      setTipo('presencial')
      onDone()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <SectionLabel>Solicitar reunião</SectionLabel>
      <div className="mt-2.5 flex flex-col gap-2.5">
        <select className={inputCls} value={coordenadoraId} onChange={(e) => setCoordenadoraId(e.target.value)}>
          <option value="">Com quem você quer se reunir?</option>
          {coordenadoras.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {coordenadora?.disponibilidade && (
          <p className="text-[11.5px] text-muted">Atende: {coordenadora.disponibilidade}</p>
        )}
        <input
          autoComplete="off"
          type="datetime-local"
          className={inputCls}
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
        />
        <div className="flex gap-2">
          {(['presencial', 'online', 'ligacao'] as ReuniaoTipo[]).map((t) => (
            <Chip key={t} selected={tipo === t} onClick={() => setTipo(t)}>{TIPO_LABEL[t]}</Chip>
          ))}
        </div>
        <textarea
          autoComplete="off"
          className={inputCls}
          rows={3}
          placeholder="Motivo ou assunto (breve)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <Button disabled={!coordenadoraId || !horario || !motivo.trim() || enviando} onClick={enviar}>
          {enviando ? 'Enviando...' : 'Enviar solicitação'}
        </Button>
      </div>
    </Card>
  )
}

export function ReuniaoCard({ reuniao, papel, autor, alunoNome, onReload }: {
  reuniao: Reuniao
  papel: 'pai' | 'staff'
  autor: string
  alunoNome?: string
  onReload: () => void
}) {
  const [contrapropondo, setContrapropondo] = useState(false)
  const [novoHorario, setNovoHorario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const pill = ESTADO_PILL[reuniao.estado]

  async function confirmar() {
    setEnviando(true)
    try {
      await api.patch(`/reunioes/${reuniao.id}/confirmar`, { respondidoPor: autor })
      onReload()
    } finally {
      setEnviando(false)
    }
  }

  async function enviarContraproposta() {
    if (!novoHorario) return
    setEnviando(true)
    try {
      await api.patch(`/reunioes/${reuniao.id}/contrapropor`, { horario: novoHorario, respondidoPor: autor })
      setContrapropondo(false)
      setNovoHorario('')
      onReload()
    } finally {
      setEnviando(false)
    }
  }

  async function responderPai(aceita: boolean) {
    setEnviando(true)
    try {
      await api.patch(`/reunioes/${reuniao.id}/responder-pai`, { aceita })
      onReload()
    } finally {
      setEnviando(false)
    }
  }

  async function cancelar() {
    if (!confirm('Cancelar essa reunião?')) return
    await api.patch(`/reunioes/${reuniao.id}/cancelar`)
    onReload()
  }

  const infoText =
    papel === 'staff' && reuniao.estado === 'contraproposta' ? 'Aguardando resposta do responsável.' :
    papel === 'pai' && reuniao.estado === 'pendente' ? 'Aguardando resposta da coordenação.' :
    papel === 'pai' && reuniao.estado === 'aceita_pelo_pai' ? 'Você aceitou esse horário — aguardando confirmação final da coordenação.' :
    null

  const podeCancelar = reuniao.estado !== 'cancelada'

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          {!!alunoNome && <span className="text-[13px] font-bold">{alunoNome}</span>}
          <div className="mt-0.5 text-[12.5px] text-muted">Com {reuniao.coordenadoraNome} · {TIPO_LABEL[reuniao.tipo]}</div>
        </div>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>

      <div className="mt-2.5 flex flex-col gap-1 text-[12.5px]">
        <div><span className="text-faint">Sugerido pelo responsável:</span> <span className="font-semibold">{formatDataHora(reuniao.horarioSugeridoPai)}</span></div>
        {!!reuniao.horarioSugeridoCoordenacao && reuniao.estado !== 'confirmada' && (
          <div><span className="text-faint">Sugestão de {reuniao.coordenadoraNome}:</span> <span className="font-semibold">{formatDataHora(reuniao.horarioSugeridoCoordenacao)}</span></div>
        )}
        {!!reuniao.horarioConfirmado && (
          <div><span className="text-faint">Confirmado:</span> <span className="font-bold text-green-dark">{formatDataHora(reuniao.horarioConfirmado)}</span></div>
        )}
      </div>

      <p className="mt-2 text-[12px] text-muted">"{reuniao.motivo}"</p>

      {papel === 'staff' && reuniao.estado === 'pendente' && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          {!contrapropondo ? (
            <div className="flex gap-2">
              <Button className="flex-1" disabled={enviando} onClick={confirmar}>Confirmar esse horário</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setContrapropondo(true)}>Sugerir outro</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                autoComplete="off"
                type="datetime-local"
                className={inputCls}
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
              />
              <div className="flex gap-2">
                <Button className="flex-1" disabled={!novoHorario || enviando} onClick={enviarContraproposta}>Enviar sugestão</Button>
                <Button variant="ghost" className="flex-1" onClick={() => setContrapropondo(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {papel === 'staff' && reuniao.estado === 'aceita_pelo_pai' && (
        <div className="mt-3 border-t border-line pt-3">
          <Button disabled={enviando} onClick={confirmar}>Confirmar agendamento</Button>
        </div>
      )}

      {papel === 'pai' && reuniao.estado === 'contraproposta' && (
        <div className="mt-3 flex gap-2 border-t border-line pt-3">
          <Button className="flex-1" disabled={enviando} onClick={() => responderPai(true)}>Aceitar esse horário</Button>
          <Button variant="secondary" className="flex-1" disabled={enviando} onClick={() => responderPai(false)}>Pedir outro horário</Button>
        </div>
      )}

      {!!infoText && <p className="mt-2.5 text-[11.5px] font-semibold text-blue">{infoText}</p>}

      {podeCancelar && (
        <button onClick={cancelar} className="mt-2.5 text-[11.5px] font-bold text-red">Cancelar reunião</button>
      )}
    </Card>
  )
}
