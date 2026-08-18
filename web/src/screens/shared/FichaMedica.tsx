import { useState } from 'react'
import { api } from '../../api'
import type { Aluno, FichaMedica } from '../../types'
import { Button, Card, SectionLabel } from '../../components/ui'
import { inputCls } from './formHelpers'

export function fichaMedicaVazia(): FichaMedica {
  return {
    alergias: [],
    medicacoes: [],
    condicoesObservacoes: '',
    planoSaude: { nome: '', numeroInscricao: '', telefone: '' },
    medicoReferencia: { nome: '', telefone: '' },
    emergencia: { nomeContato: '', telefoneContato: '', hospitalPreferencia: '' },
    autorizaEmergencia: false,
    revisadoEm: null,
  }
}

export function precisaRevisarFichaMedica(aluno: Aluno): boolean {
  const revisadoEm = aluno.fichaMedica?.revisadoEm
  if (!revisadoEm) return true
  return new Date(revisadoEm).getFullYear() < new Date().getFullYear()
}

const dividerCls = 'mt-2 text-[11px] font-bold uppercase tracking-wide text-muted'

export function FichaMedicaForm({ value, onChange }: {
  value: FichaMedica
  onChange: (v: FichaMedica) => void
}) {
  function set<K extends keyof FichaMedica>(campo: K, novo: FichaMedica[K]) {
    onChange({ ...value, [campo]: novo })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className={dividerCls}>Alergias</p>
      <div className="flex flex-col gap-2">
        {value.alergias.map((a, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-line p-2.5">
            <input autoComplete="off" className={inputCls} placeholder="Nome da alergia"
              value={a.nome} onChange={(e) => set('alergias', value.alergias.map((x, idx) => (idx === i ? { ...x, nome: e.target.value } : x)))} />
            <input autoComplete="off" className={inputCls} placeholder="Como se manifesta"
              value={a.comoSeManifesta} onChange={(e) => set('alergias', value.alergias.map((x, idx) => (idx === i ? { ...x, comoSeManifesta: e.target.value } : x)))} />
            <input autoComplete="off" className={inputCls} placeholder="Remédio / conduta"
              value={a.conduta} onChange={(e) => set('alergias', value.alergias.map((x, idx) => (idx === i ? { ...x, conduta: e.target.value } : x)))} />
            <button type="button" onClick={() => set('alergias', value.alergias.filter((_, idx) => idx !== i))} className="self-start text-[11.5px] font-bold text-red">
              Remover
            </button>
          </div>
        ))}
        <button type="button" onClick={() => set('alergias', [...value.alergias, { nome: '', comoSeManifesta: '', conduta: '' }])} className="self-start text-[11.5px] font-bold text-blue">
          + Adicionar alergia
        </button>
      </div>

      <p className={dividerCls}>Medicações contínuas</p>
      <div className="flex flex-col gap-2">
        {value.medicacoes.map((m, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-line p-2.5">
            <input autoComplete="off" className={inputCls} placeholder="Nome da medicação"
              value={m.nome} onChange={(e) => set('medicacoes', value.medicacoes.map((x, idx) => (idx === i ? { ...x, nome: e.target.value } : x)))} />
            <input autoComplete="off" className={inputCls} placeholder="Dose / horário"
              value={m.observacao} onChange={(e) => set('medicacoes', value.medicacoes.map((x, idx) => (idx === i ? { ...x, observacao: e.target.value } : x)))} />
            <button type="button" onClick={() => set('medicacoes', value.medicacoes.filter((_, idx) => idx !== i))} className="self-start text-[11.5px] font-bold text-red">
              Remover
            </button>
          </div>
        ))}
        <button type="button" onClick={() => set('medicacoes', [...value.medicacoes, { nome: '', observacao: '' }])} className="self-start text-[11.5px] font-bold text-blue">
          + Adicionar medicação
        </button>
      </div>

      <p className={dividerCls}>Condições e observações médicas</p>
      <textarea
        autoComplete="off"
        className={inputCls}
        rows={3}
        placeholder="Tratamentos, cirurgias, doenças, necessidades especiais — o que for importante saber"
        value={value.condicoesObservacoes}
        onChange={(e) => set('condicoesObservacoes', e.target.value)}
      />

      <p className={dividerCls}>Plano de saúde</p>
      <input autoComplete="off" className={inputCls} placeholder="Nome do plano" value={value.planoSaude.nome}
        onChange={(e) => set('planoSaude', { ...value.planoSaude, nome: e.target.value })} />
      <div className="flex gap-2">
        <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="Nº de inscrição" value={value.planoSaude.numeroInscricao}
          onChange={(e) => set('planoSaude', { ...value.planoSaude, numeroInscricao: e.target.value })} />
        <input autoComplete="off" inputMode="numeric" className={`${inputCls} flex-1`} placeholder="Telefone" value={value.planoSaude.telefone}
          onChange={(e) => set('planoSaude', { ...value.planoSaude, telefone: e.target.value.replace(/\D/g, '') })} />
      </div>

      <p className={dividerCls}>Médico de referência</p>
      <div className="flex gap-2">
        <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="Nome" value={value.medicoReferencia.nome}
          onChange={(e) => set('medicoReferencia', { ...value.medicoReferencia, nome: e.target.value })} />
        <input autoComplete="off" inputMode="numeric" className={`${inputCls} flex-1`} placeholder="Telefone" value={value.medicoReferencia.telefone}
          onChange={(e) => set('medicoReferencia', { ...value.medicoReferencia, telefone: e.target.value.replace(/\D/g, '') })} />
      </div>

      <p className={dividerCls}>Emergência</p>
      <div className="flex gap-2">
        <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="Contato preferencial (nome)" value={value.emergencia.nomeContato}
          onChange={(e) => set('emergencia', { ...value.emergencia, nomeContato: e.target.value })} />
        <input autoComplete="off" inputMode="numeric" className={`${inputCls} flex-1`} placeholder="Telefone" value={value.emergencia.telefoneContato}
          onChange={(e) => set('emergencia', { ...value.emergencia, telefoneContato: e.target.value.replace(/\D/g, '') })} />
      </div>
      <input autoComplete="off" className={inputCls} placeholder="Hospital / clínica de preferência" value={value.emergencia.hospitalPreferencia}
        onChange={(e) => set('emergencia', { ...value.emergencia, hospitalPreferencia: e.target.value })} />

      <label className="mt-1 flex items-start gap-2 text-[12.5px] font-semibold">
        <input autoComplete="off" type="checkbox" className="mt-0.5" checked={value.autorizaEmergencia}
          onChange={(e) => set('autorizaEmergencia', e.target.checked)} />
        Autorizo a equipe a medicar em caso de emergência real, quando não der tempo de me consultar antes.
      </label>
    </div>
  )
}

export function FichaMedicaView({ ficha }: { ficha: FichaMedica | undefined }) {
  const vazia = !ficha || (
    !ficha.alergias.length && !ficha.medicacoes.length && !ficha.condicoesObservacoes &&
    !ficha.emergencia.nomeContato && !ficha.planoSaude.nome && !ficha.medicoReferencia.nome
  )

  if (vazia) {
    return (
      <Card className="border-red bg-red-light">
        <SectionLabel>Ficha médica</SectionLabel>
        <p className="mt-1 text-[12.5px] font-semibold text-red">O responsável ainda não preencheu a ficha médica.</p>
      </Card>
    )
  }

  return (
    <Card>
      <SectionLabel>Ficha médica</SectionLabel>
      {!!ficha.alergias.length && (
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red">Alergias</p>
          {ficha.alergias.map((a, i) => (
            <p key={i} className="mt-1 text-[13px]">
              <b>{a.nome}</b>{a.comoSeManifesta ? ` — ${a.comoSeManifesta}` : ''}{a.conduta ? ` · ${a.conduta}` : ''}
            </p>
          ))}
        </div>
      )}
      {!!ficha.medicacoes.length && (
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Medicações contínuas</p>
          {ficha.medicacoes.map((m, i) => (
            <p key={i} className="mt-1 text-[13px]"><b>{m.nome}</b>{m.observacao ? ` — ${m.observacao}` : ''}</p>
          ))}
        </div>
      )}
      {!!ficha.condicoesObservacoes && (
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Condições e observações</p>
          <p className="mt-1 text-[13px]">{ficha.condicoesObservacoes}</p>
        </div>
      )}
      {(ficha.planoSaude.nome || ficha.medicoReferencia.nome) && (
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Plano de saúde / médico</p>
          {ficha.planoSaude.nome && <p className="mt-1 text-[13px]">{ficha.planoSaude.nome} · {ficha.planoSaude.numeroInscricao} · {ficha.planoSaude.telefone}</p>}
          {ficha.medicoReferencia.nome && <p className="mt-1 text-[13px]">Dr(a). {ficha.medicoReferencia.nome} · {ficha.medicoReferencia.telefone}</p>}
        </div>
      )}
      {!!ficha.emergencia.nomeContato && (
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Emergência</p>
          <p className="mt-1 text-[13px]">{ficha.emergencia.nomeContato} · {ficha.emergencia.telefoneContato}</p>
          {ficha.emergencia.hospitalPreferencia && <p className="mt-1 text-[13px]">Preferência: {ficha.emergencia.hospitalPreferencia}</p>}
        </div>
      )}
      <p className={`mt-2 text-[12px] font-semibold ${ficha.autorizaEmergencia ? 'text-green-dark' : 'text-red'}`}>
        {ficha.autorizaEmergencia ? 'Autoriza medicar em emergência real.' : 'NÃO autoriza medicar sem contato prévio.'}
      </p>
    </Card>
  )
}

export function EditorFichaMedica({ aluno, onSalvo, textoBotao = 'Salvar ficha médica' }: {
  aluno: Aluno
  onSalvo: (aluno: Aluno) => void
  textoBotao?: string
}) {
  const [valor, setValor] = useState<FichaMedica>(aluno.fichaMedica ?? fichaMedicaVazia())
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      const atualizado = await api.patch<Aluno>(`/alunos/${aluno.id}`, {
        fichaMedica: { ...valor, revisadoEm: new Date().toISOString() },
      })
      onSalvo(atualizado)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <FichaMedicaForm value={valor} onChange={setValor} />
      <Button disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : textoBotao}</Button>
    </div>
  )
}
