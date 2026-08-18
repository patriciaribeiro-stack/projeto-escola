import { useState } from 'react'
import { api } from '../../api'
import type { Pai } from '../../types'
import { Button } from '../../components/ui'
import { inputCls } from './formHelpers'
import { FileAttach, type Anexo } from '../../components/FileAttach'

const dividerCls = 'mt-2 text-[11px] font-bold uppercase tracking-wide text-muted'

export interface DadosFicha {
  sexo: 'M' | 'F' | 'outro' | ''
  dataNascimento: string
  naturalidade: string
  uf: string
  nacionalidade: string
  profissao: string
  cpf: string
  rg: string
  orgaoEmissorRg: string
  dataEmissaoRg: string
  certidaoNascimento: string
  email: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  cep: string
  foto: Anexo | null
  observacoes: string
}

export function fichaVazia(): DadosFicha {
  return {
    sexo: '', dataNascimento: '', naturalidade: '', uf: '', nacionalidade: '', profissao: '',
    cpf: '', rg: '', orgaoEmissorRg: '', dataEmissaoRg: '', certidaoNascimento: '', email: '',
    logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '', foto: null, observacoes: '',
  }
}

export function fichaDoPai(p: Pai): DadosFicha {
  return {
    sexo: p.sexo ?? '',
    dataNascimento: p.dataNascimento ?? '',
    naturalidade: p.naturalidade ?? '',
    uf: p.uf ?? '',
    nacionalidade: p.nacionalidade ?? '',
    profissao: p.profissao ?? '',
    cpf: p.cpf ?? '',
    rg: p.rg ?? '',
    orgaoEmissorRg: p.orgaoEmissorRg ?? '',
    dataEmissaoRg: p.dataEmissaoRg ?? '',
    certidaoNascimento: p.certidaoNascimento ?? '',
    email: p.email ?? '',
    logradouro: p.endereco?.logradouro ?? '',
    numero: p.endereco?.numero ?? '',
    complemento: p.endereco?.complemento ?? '',
    bairro: p.endereco?.bairro ?? '',
    cidade: p.endereco?.cidade ?? '',
    cep: p.endereco?.cep ?? '',
    foto: p.fotoDataUrl ? { nome: p.fotoNome ?? '', tipo: p.fotoTipo ?? '', dataUrl: p.fotoDataUrl } : null,
    observacoes: p.observacoes ?? '',
  }
}

export function camposFicha(d: DadosFicha) {
  return {
    sexo: d.sexo || undefined,
    dataNascimento: d.dataNascimento,
    naturalidade: d.naturalidade,
    uf: d.uf,
    nacionalidade: d.nacionalidade,
    profissao: d.profissao,
    cpf: d.cpf,
    rg: d.rg,
    orgaoEmissorRg: d.orgaoEmissorRg,
    dataEmissaoRg: d.dataEmissaoRg,
    certidaoNascimento: d.certidaoNascimento,
    email: d.email,
    endereco: { logradouro: d.logradouro, numero: d.numero, complemento: d.complemento, bairro: d.bairro, cidade: d.cidade, estado: d.uf, cep: d.cep },
    fotoNome: d.foto?.nome, fotoTipo: d.foto?.tipo, fotoDataUrl: d.foto?.dataUrl,
    observacoes: d.observacoes,
  }
}

export function precisaPreencherFicha(pai: Pai): boolean {
  return !pai.fichaAtualizadaEm
}

export function precisaLembrarFicha(pai: Pai): boolean {
  if (!pai.fichaAtualizadaEm) return false
  const seisMesesAtras = new Date()
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6)
  return new Date(pai.fichaAtualizadaEm) < seisMesesAtras
}

export function FichaResponsavelForm({ value, onChange }: { value: DadosFicha; onChange: (v: DadosFicha) => void }) {
  function set<K extends keyof DadosFicha>(campo: K, novo: DadosFicha[K]) {
    onChange({ ...value, [campo]: novo })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className={dividerCls}>Dados pessoais</p>
      <div className="flex gap-1.5">
        {([['M', 'Masculino'], ['F', 'Feminino'], ['outro', 'Outro']] as const).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => set('sexo', v)}
            className={`flex-1 rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold ${value.sexo === v ? 'border-green bg-green text-white' : 'border-line text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <input autoComplete="off" type="date" className={inputCls} placeholder="Data de nascimento" value={value.dataNascimento} onChange={(e) => set('dataNascimento', e.target.value)} />
      <div className="flex gap-2">
        <input autoComplete="off" className={`${inputCls} min-w-0 flex-1`} placeholder="Naturalidade" value={value.naturalidade} onChange={(e) => set('naturalidade', e.target.value)} />
        <input autoComplete="off" className={`${inputCls} w-16 flex-shrink-0`} placeholder="UF" maxLength={2} value={value.uf} onChange={(e) => set('uf', e.target.value.toUpperCase())} />
      </div>
      <input autoComplete="off" className={inputCls} placeholder="Nacionalidade" value={value.nacionalidade} onChange={(e) => set('nacionalidade', e.target.value)} />
      <input autoComplete="off" className={inputCls} placeholder="Profissão" value={value.profissao} onChange={(e) => set('profissao', e.target.value)} />

      <p className={dividerCls}>Documento</p>
      <div className="flex gap-2">
        <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="CPF" value={value.cpf} onChange={(e) => set('cpf', e.target.value)} />
        <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="RG" value={value.rg} onChange={(e) => set('rg', e.target.value)} />
      </div>
      <div className="flex gap-2">
        <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="Órgão emissor" value={value.orgaoEmissorRg} onChange={(e) => set('orgaoEmissorRg', e.target.value)} />
        <input autoComplete="off" type="date" className={`${inputCls} flex-1`} placeholder="Data de emissão" value={value.dataEmissaoRg} onChange={(e) => set('dataEmissaoRg', e.target.value)} />
      </div>
      <input autoComplete="off" className={inputCls} placeholder="Certidão de nascimento" value={value.certidaoNascimento} onChange={(e) => set('certidaoNascimento', e.target.value)} />
      <input autoComplete="off" type="email" className={inputCls} placeholder="E-mail" value={value.email} onChange={(e) => set('email', e.target.value)} />

      <p className={dividerCls}>Endereço</p>
      <div className="flex gap-2">
        <input autoComplete="off" className={`${inputCls} min-w-0 flex-1`} placeholder="Logradouro" value={value.logradouro} onChange={(e) => set('logradouro', e.target.value)} />
        <input autoComplete="off" className={`${inputCls} w-20 flex-shrink-0`} placeholder="Nº" value={value.numero} onChange={(e) => set('numero', e.target.value)} />
      </div>
      <input autoComplete="off" className={inputCls} placeholder="Complemento" value={value.complemento} onChange={(e) => set('complemento', e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <input autoComplete="off" className={`${inputCls} min-w-0 flex-1 basis-24`} placeholder="Bairro" value={value.bairro} onChange={(e) => set('bairro', e.target.value)} />
        <input autoComplete="off" className={`${inputCls} min-w-0 flex-1 basis-24`} placeholder="Cidade" value={value.cidade} onChange={(e) => set('cidade', e.target.value)} />
        <input autoComplete="off" className={`${inputCls} w-24 flex-shrink-0`} placeholder="CEP" value={value.cep} onChange={(e) => set('cep', e.target.value)} />
      </div>

      <p className={dividerCls}>Foto</p>
      <FileAttach value={value.foto} onChange={(f) => set('foto', f)} accept="image/*" label="Adicionar foto" />

      <p className={dividerCls}>Observações</p>
      <textarea autoComplete="off" className={inputCls} rows={2} placeholder="Observações" value={value.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
    </div>
  )
}

export function EditorFichaResponsavel({ pai, onSalvo, textoBotao = 'Salvar' }: {
  pai: Pai
  onSalvo: (pai: Pai) => void
  textoBotao?: string
}) {
  const [valor, setValor] = useState<DadosFicha>(fichaDoPai(pai))
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      const atualizado = await api.patch<Pai>(`/pais/${pai.id}`, {
        ...camposFicha(valor),
        fichaAtualizadaEm: new Date().toISOString(),
      })
      onSalvo(atualizado)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <FichaResponsavelForm value={valor} onChange={setValor} />
      <Button disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : textoBotao}</Button>
    </div>
  )
}
