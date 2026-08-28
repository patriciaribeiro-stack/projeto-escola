import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../api'
import { usePolling } from '../../usePolling'
import type { Aluno, ConfiguracaoMatricula, Materia, Pai, Periodo, Professor, Segmento, Turma } from '../../types'
import { Button, Card, EmptyState, Pill, SectionLabel, formatDateBR } from '../../components/ui'
import { inputCls } from './formHelpers'
import { ImportarPlanilha } from './ImportarPlanilha'
import { avisoIdadeTurma } from './idadeMatricula'
import { FichaResponsavelForm, fichaVazia, fichaDoPai, camposFicha, type DadosFicha } from './FichaResponsavel'
import { TabGroup, type TabOption } from '../../components/TabGroup'

type Sub = 'alunos' | 'pais' | 'professores'

const CADASTROS_PESSOAS_TABS: TabOption<Sub>[] = [
  { key: 'alunos', label: 'Alunos' },
  { key: 'pais', label: 'Responsáveis' },
  { key: 'professores', label: 'Professores' },
]

const SEGMENTO_LABEL: Record<Segmento, string> = {
  infantil: 'Educação Infantil',
  fundamental_1: 'Fundamental I',
  fundamental_2: 'Fundamental II',
}

const ehFundamental = (t: Turma) => t.segmento === 'fundamental_1' || t.segmento === 'fundamental_2'

type Vinculo = { turmaId: string; materiaId: string }
type CredencialPai = { paiId: string; nome: string; telefone: string; texto: string; rotulo: string; tipo?: string }
type CredencialProfessor = { nome: string; telefone: string; texto: string; rotulo: string }
export type BlocoEtiqueta = { titulo: string; linhas: { label: string; valor: string }[] }

function agruparCredenciaisPorAluno(fila: CredencialPai[], pais?: Pai[] | null, alunos?: Aluno[] | null): BlocoEtiqueta[] {
  const porAluno = new Map<string, CredencialPai[]>()
  for (const cred of fila) {
    const pai = pais?.find((p) => p.id === cred.paiId)
    const alunoIds = pai?.alunoIds.length ? pai.alunoIds : ['__sem_aluno__']
    for (const alunoId of alunoIds) {
      const lista = porAluno.get(alunoId) ?? []
      lista.push(cred)
      porAluno.set(alunoId, lista)
    }
  }
  return Array.from(porAluno.entries()).map(([alunoId, credenciais]) => ({
    titulo: alunoId === '__sem_aluno__' ? 'Sem aluno vinculado ainda' : (alunos?.find((a) => a.id === alunoId)?.nome ?? '...'),
    linhas: credenciais.map((c) => ({ label: c.tipo || 'Responsável', valor: `${c.nome} · Tel ${c.telefone} · ${c.rotulo}: ${c.texto}` })),
  }))
}

function toggleTurmaHandler(
  turma: Turma,
  turmaIdsAtual: string[],
  setTurmaIds: (fn: (prev: string[]) => string[]) => void,
  setVinculos: (fn: (prev: Vinculo[]) => Vinculo[]) => void,
) {
  setTurmaIds((prev) => (prev.includes(turma.id) ? prev.filter((t) => t !== turma.id) : [...prev, turma.id]))
  setVinculos((prev) => (turmaIdsAtual.includes(turma.id) ? prev.filter((v) => v.turmaId !== turma.id) : prev))
}

function toggleVinculoHandler(
  turmaId: string,
  materiaId: string,
  ultimoClique: { current: Record<string, number> },
  setVinculos: (fn: (prev: Vinculo[]) => Vinculo[]) => void,
) {
  const chave = `${turmaId}:${materiaId}`
  const agora = Date.now()
  // Ignora um segundo clique muito rápido no mesmo botão (duplo clique acidental),
  // que senão liga e desliga o vínculo sem nenhum aviso antes de salvar.
  if (agora - (ultimoClique.current[chave] ?? 0) < 400) return
  ultimoClique.current[chave] = agora
  setVinculos((prev) =>
    prev.some((v) => v.turmaId === turmaId && v.materiaId === materiaId)
      ? prev.filter((v) => !(v.turmaId === turmaId && v.materiaId === materiaId))
      : [...prev, { turmaId, materiaId }],
  )
}

function toggleResponsavelHandler(paiId: string, setResponsavelIds: (fn: (prev: string[]) => string[]) => void) {
  setResponsavelIds((prev) => (prev.includes(paiId) ? prev.filter((id) => id !== paiId) : [...prev, paiId]))
}

export function imprimirEtiquetas(titulo: string, blocos: BlocoEtiqueta[]) {
  const janela = window.open('', '_blank')
  if (!janela) return
  const cards = blocos
    .map(
      (b) => `<div class="etiqueta">
        <p class="nome">${b.titulo}</p>
        ${b.linhas.map((l) => `<p class="linha"><strong>${l.label}:</strong> ${l.valor}</p>`).join('')}
        <p class="instrucao">Acesse pelo app/navegador e informe telefone + código/senha.</p>
      </div>`,
    )
    .join('')
  janela.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${titulo}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2b26; padding: 24px; }
  .cabecalho { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #1B7A68; padding-bottom: 14px; margin-bottom: 20px; }
  .cabecalho img { height: 48px; width: auto; }
  h1 { font-size: 20px; margin: 0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .etiqueta { border: 1.5px dashed #b7beb9; border-radius: 10px; padding: 14px; break-inside: avoid; }
  .etiqueta .nome { font-size: 14px; font-weight: 700; margin: 0 0 6px; }
  .etiqueta .linha { font-size: 12.5px; color: #444; margin: 2px 0; }
  .etiqueta .credencial { font-size: 15px; font-weight: 700; letter-spacing: .03em; color: #2E7FB8; margin-top: 6px; }
  .etiqueta .instrucao { font-size: 10.5px; color: #8a938f; margin-top: 6px; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
  <div class="cabecalho">
    <img src="${window.location.origin}/logo-escola.png" alt="" />
    <h1>${titulo}</h1>
  </div>
  <div class="grid">${cards}</div>
</body>
</html>`)
  janela.document.close()
  janela.focus()
  janela.print()
}

function campoFicha(label: string, valor: string | undefined) {
  return `<div class="campo"><span class="rotulo">${label}</span><span class="valor ${valor ? '' : 'vazio'}">${valor ?? ''}</span></div>`
}

const SEXO_LABEL: Record<string, string> = { M: 'Masculino', F: 'Feminino', outro: 'Outro' }

function imprimirFichaFamilia(aluno: Aluno, turmaNome: string, familia: Pai[], preenchida: boolean) {
  const janela = window.open('', '_blank')
  if (!janela) return

  // Em branco: mostra só o que a secretaria já sabe (nome/telefone/tipo) e deixa o resto
  // em linha pra preencher à mão, mesmo que o pai já tenha preenchido digitalmente —
  // serve como cópia física independente do que já está no sistema.
  const campo = (label: string, valor: string | undefined) => campoFicha(label, preenchida ? valor : undefined)

  const responsaveisHtml = familia.map((p) => `
    <section class="responsavel">
      <h2>${p.nome} <span class="tipo">${p.tipo || 'Responsável'}</span></h2>
      <div class="grade">
        ${campoFicha('Telefone', p.telefone)}
        ${campo('E-mail', p.email)}
        ${campo('Data de nascimento', p.dataNascimento ? formatDateBR(p.dataNascimento) : undefined)}
        ${campo('Sexo', p.sexo ? SEXO_LABEL[p.sexo] : undefined)}
        ${campo('Naturalidade', p.naturalidade)}
        ${campo('UF', p.uf)}
        ${campo('Nacionalidade', p.nacionalidade)}
        ${campo('Profissão', p.profissao)}
        ${campo('CPF', p.cpf)}
        ${campo('RG', p.rg)}
        ${campo('Órgão emissor', p.orgaoEmissorRg)}
        ${campo('Data de emissão', p.dataEmissaoRg ? formatDateBR(p.dataEmissaoRg) : undefined)}
        ${campo('Certidão de nascimento', p.certidaoNascimento)}
      </div>
      <h3>Endereço</h3>
      <div class="grade">
        ${campo('Logradouro', p.endereco?.logradouro)}
        ${campo('Número', p.endereco?.numero)}
        ${campo('Complemento', p.endereco?.complemento)}
        ${campo('Bairro', p.endereco?.bairro)}
        ${campo('Cidade', p.endereco?.cidade)}
        ${campo('CEP', p.endereco?.cep)}
      </div>
      <h3>Observações</h3>
      <div class="linha-livre">${preenchida ? (p.observacoes ?? '') : ''}</div>
    </section>`).join('')

  const tituloModo = preenchida ? 'Ficha Cadastral da Família' : 'Ficha Cadastral da Família (em branco)'

  janela.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Ficha cadastral — ${aluno.nome}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2b26; padding: 32px; }
  .cabecalho { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #1B7A68; padding-bottom: 16px; margin-bottom: 24px; }
  .cabecalho img { height: 52px; width: auto; }
  h1 { font-size: 20px; margin: 0; }
  .meta { color: #667; font-size: 12.5px; margin-top: 4px; }
  .responsavel { margin-bottom: 28px; page-break-inside: avoid; }
  h2 { font-size: 15px; margin: 0 0 10px; border-bottom: 1.5px solid #d8ddda; padding-bottom: 6px; }
  h2 .tipo { font-size: 11px; font-weight: 400; color: #767f7a; margin-left: 6px; }
  h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #5c655f; margin: 14px 0 6px; }
  .grade { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 18px; }
  .campo { display: flex; flex-direction: column; font-size: 12.5px; }
  .rotulo { font-size: 10px; text-transform: uppercase; color: #8a938f; }
  .valor { min-height: 18px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .valor.vazio { border-bottom: 1.5px solid #666; }
  .linha-livre { min-height: 40px; border-bottom: 1.5px solid #666; font-size: 12.5px; padding-top: 4px; }
  .rodape { margin-top: 20px; font-size: 10.5px; color: #a4aca9; text-align: center; }
  @media print { body { padding: 14px; } }
</style>
</head>
<body>
  <div class="cabecalho">
    <img src="${window.location.origin}/logo-escola.png" alt="" />
    <div>
      <h1>${tituloModo}</h1>
      <div class="meta">Aluno: ${aluno.nome} · ${turmaNome} · Nascimento: ${aluno.dataNascimento ? formatDateBR(aluno.dataNascimento) : '—'}</div>
    </div>
  </div>
  ${responsaveisHtml}
  <div class="rodape">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
</body>
</html>`)
  janela.document.close()
  janela.focus()
  janela.print()
}

function SeletorTurmasEMaterias({
  turmas, materias, turmaIds, vinculos, onToggleTurma, onToggleVinculo,
}: {
  turmas?: Turma[] | null
  materias?: Materia[] | null
  turmaIds: string[]
  vinculos: Vinculo[]
  onToggleTurma: (turma: Turma) => void
  onToggleVinculo: (turmaId: string, materiaId: string) => void
}) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {turmas?.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggleTurma(t)}
            className={`rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold ${turmaIds.includes(t.id) ? 'border-green bg-green text-white' : 'border-line text-muted'}`}
          >
            {t.nome}
          </button>
        ))}
      </div>
      {turmas?.filter((t) => turmaIds.includes(t.id) && ehFundamental(t)).map((t) => (
        <div key={t.id} className="rounded-lg bg-paper-sunken p-2.5">
          <p className="text-[11px] font-bold text-muted">Matérias em {t.nome}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {materias?.map((m) => {
              const ativo = vinculos.some((v) => v.turmaId === t.id && v.materiaId === m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onToggleVinculo(t.id, m.id)}
                  className={`rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold ${ativo ? 'border-blue bg-blue text-white' : 'border-line text-muted'}`}
                >
                  {m.nome}
                </button>
              )
            })}
            {!materias?.length && <p className="text-[11.5px] text-faint">Cadastre matérias primeiro, na aba "Matérias".</p>}
          </div>
          {!!materias?.length && (
            <p className="mt-1.5 text-[11px] text-muted">
              {vinculos.filter((v) => v.turmaId === t.id).length
                ? `Selecionadas: ${vinculos.filter((v) => v.turmaId === t.id).map((v) => materias?.find((m) => m.id === v.materiaId)?.nome).filter(Boolean).join(', ')}`
                : 'Nenhuma matéria selecionada ainda nessa turma.'}
            </p>
          )}
        </div>
      ))}
    </>
  )
}

function SeletorTurmasIntegral({ turmas, turmaIds, onToggle }: {
  turmas?: Turma[] | null
  turmaIds: string[]
  onToggle: (turmaId: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {turmas?.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onToggle(t.id)}
          className={`rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold ${turmaIds.includes(t.id) ? 'border-amber bg-amber text-white' : 'border-line text-muted'}`}
        >
          {t.nome}
        </button>
      ))}
    </div>
  )
}

function SeletorResponsaveis({ pais, responsavelIds, onToggle }: {
  pais?: Pai[] | null
  responsavelIds: string[]
  onToggle: (paiId: string) => void
}) {
  const [busca, setBusca] = useState('')
  const selecionados = (pais ?? []).filter((p) => responsavelIds.includes(p.id))
  const q = busca.trim().toLowerCase()
  const resultados = q
    ? (pais ?? []).filter((p) => !responsavelIds.includes(p.id) && (p.nome.toLowerCase().includes(q) || p.telefone.includes(q))).slice(0, 8)
    : []

  if (!pais?.length) {
    return <p className="text-[11.5px] text-faint">Cadastre o pai/responsável primeiro, na aba "Pais".</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {!!selecionados.length && (
        <div className="flex flex-wrap gap-1.5">
          {selecionados.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              className="rounded-full border-[1.5px] border-green bg-green px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              {p.nome} ✕
            </button>
          ))}
        </div>
      )}
      <input
        autoComplete="off"
        className={inputCls}
        placeholder="Buscar responsável por nome ou telefone"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      {!!q && (
        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-paper-raised">
          {resultados.length ? resultados.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onToggle(p.id); setBusca('') }}
              className="border-b border-line px-3 py-2.5 text-left text-[13px] font-semibold last:border-b-0 active:bg-paper-sunken"
            >
              {p.nome} <span className="font-normal text-muted">· {p.telefone}</span>
            </button>
          )) : <p className="px-3 py-2.5 text-[12px] text-faint">Nenhum responsável encontrado.</p>}
        </div>
      )}
    </div>
  )
}

type Telefone = { numero: string; etiqueta: string }

function SeletorTelefones({ telefones, onChange }: {
  telefones: Telefone[]
  onChange: Dispatch<SetStateAction<Telefone[]>>
}) {
  function atualizar(i: number, campo: keyof Telefone, valor: string) {
    onChange((prev) => prev.map((t, idx) => (idx === i ? { ...t, [campo]: valor } : t)))
  }
  function remover(i: number) {
    onChange((prev) => prev.filter((_, idx) => idx !== i))
  }
  return (
    <div className="flex flex-col gap-2">
      {telefones.map((t, i) => (
        <div key={i} className="flex gap-2">
          <input
            autoComplete="off"
            inputMode="numeric"
            className={`${inputCls} flex-1`}
            placeholder="Telefone (com DDD)"
            value={t.numero}
            onChange={(e) => atualizar(i, 'numero', e.target.value.replace(/\D/g, ''))}
          />
          <input
            autoComplete="off"
            className={`${inputCls} flex-1`}
            placeholder="De quem é (ex: mãe marli)"
            value={t.etiqueta}
            onChange={(e) => atualizar(i, 'etiqueta', e.target.value)}
          />
          <button type="button" onClick={() => remover(i)} className="text-[11.5px] font-bold text-red">Remover</button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange((prev) => [...prev, { numero: '', etiqueta: '' }])}
        className="self-start text-[11.5px] font-bold text-blue"
      >
        + Adicionar telefone
      </button>
    </div>
  )
}

const dividerCls = 'mt-2 text-[11px] font-bold uppercase tracking-wide text-muted'

export function gerarSenhaAleatoria() {
  return Math.random().toString(36).slice(2, 10)
}

export function CadastrosPessoas() {
  const [sub, setSub] = useState<Sub>('alunos')
  // Ficam aqui (e não dentro de cada aba) pra não zerar quando a secretaria troca de aba
  // no meio do cadastro (ex: cria os responsáveis, vai em Alunos vincular, volta pra imprimir).
  const [filaImpressaoPais, setFilaImpressaoPais] = useState<CredencialPai[]>([])
  const [filaImpressaoProfessores, setFilaImpressaoProfessores] = useState<CredencialProfessor[]>([])
  return (
    <div className="flex flex-col gap-4">
      <TabGroup tabs={CADASTROS_PESSOAS_TABS} value={sub} onChange={setSub} />
      {sub === 'alunos' && <AlunosCadastro />}
      {sub === 'pais' && <PaisCadastro filaImpressao={filaImpressaoPais} setFilaImpressao={setFilaImpressaoPais} />}
      {sub === 'professores' && <ProfessoresCadastro filaImpressao={filaImpressaoProfessores} setFilaImpressao={setFilaImpressaoProfessores} />}
    </div>
  )
}

export function TurmasCadastro() {
  const { data: turmas, reload } = usePolling<Turma[]>(async () => api.get('/turmas'), 30000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 15000, [])
  const [nome, setNome] = useState('')
  const [segmento, setSegmento] = useState<Segmento>('infantil')
  const [serie, setSerie] = useState('')
  const [idadeMinima, setIdadeMinima] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await api.post('/turmas', {
        nome, segmento,
        serie: segmento === 'infantil' ? undefined : Number(serie) || undefined,
        idadeMinima: idadeMinima ? Number(idadeMinima) : undefined,
      })
      setNome('')
      setSerie('')
      setIdadeMinima('')
      reload()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir essa turma?')) return
    await api.delete(`/turmas/${id}`)
    reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <ConfiguracaoMatriculaCard />
      <Card>
        <SectionLabel>Nova turma</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <input autoComplete="off" className={inputCls} placeholder="Nome da turma (ex: Jardim I, 5º Ano A)" value={nome} onChange={(e) => setNome(e.target.value)} />
          <select className={inputCls} value={segmento} onChange={(e) => setSegmento(e.target.value as Segmento)}>
            <option value="infantil">Educação Infantil</option>
            <option value="fundamental_1">Fundamental I</option>
            <option value="fundamental_2">Fundamental II</option>
          </select>
          {segmento !== 'infantil' && (
            <input autoComplete="off" inputMode="numeric" className={inputCls} placeholder={segmento === 'fundamental_1' ? 'Série (1 a 5)' : 'Série (6 a 9)'} value={serie} onChange={(e) => setSerie(e.target.value.replace(/\D/g, ''))} />
          )}
          <input autoComplete="off" inputMode="numeric" className={inputCls} placeholder="Idade mínima até a data de corte (opcional)" value={idadeMinima} onChange={(e) => setIdadeMinima(e.target.value.replace(/\D/g, ''))} />
          <Button disabled={!nome || salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Adicionar turma'}</Button>
        </div>
      </Card>
      <div>
        <SectionLabel>Turmas cadastradas</SectionLabel>
        {!turmas?.length && <EmptyState>Nenhuma turma cadastrada.</EmptyState>}
        <div className="mt-2 flex flex-col gap-2">
          {turmas?.map((t) => (
            <TurmaCard key={t.id} turma={t} alunosDaTurma={(alunos ?? []).filter((a) => a.turmaId === t.id)} onExcluir={() => excluir(t.id)} onSalvo={reload} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TurmaCard({ turma, alunosDaTurma, onExcluir, onSalvo }: {
  turma: Turma
  alunosDaTurma: Aluno[]
  onExcluir: () => void
  onSalvo: () => void
}) {
  const [editando, setEditando] = useState(false)
  const [mostrarAlunos, setMostrarAlunos] = useState(false)
  const [idadeMinima, setIdadeMinima] = useState(turma.idadeMinima != null ? String(turma.idadeMinima) : '')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await api.patch(`/turmas/${turma.id}`, { idadeMinima: idadeMinima ? Number(idadeMinima) : undefined })
      setEditando(false)
      onSalvo()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card>
      <button onClick={() => setMostrarAlunos((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="text-[13px] font-bold">{turma.nome}</span>
        <div className="flex items-center gap-2">
          <Pill tone="muted">{alunosDaTurma.length} aluno(s)</Pill>
          <Pill tone={ehFundamental(turma) ? 'blue' : 'green'}>{SEGMENTO_LABEL[turma.segmento]}{turma.serie ? ` · ${turma.serie}ª série` : ''}</Pill>
          <span className="text-[11px] font-bold text-blue">{mostrarAlunos ? 'Ocultar' : 'Ver alunos'}</span>
        </div>
      </button>
      {mostrarAlunos && (
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
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
        <span className="text-[11.5px] text-muted">
          {turma.idadeMinima != null ? `Idade mínima até a data de corte: ${turma.idadeMinima} anos` : 'Sem idade mínima configurada'}
        </span>
        <button onClick={() => setEditando((v) => !v)} className="text-[11.5px] font-bold text-blue">
          {editando ? 'Cancelar' : 'Editar idade mínima'}
        </button>
      </div>
      {editando && (
        <div className="mt-2 flex items-center gap-2">
          <input autoComplete="off" inputMode="numeric" className={`${inputCls} w-24`} placeholder="Anos" value={idadeMinima} onChange={(e) => setIdadeMinima(e.target.value.replace(/\D/g, ''))} />
          <Button className="w-auto flex-1" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar idade mínima'}</Button>
        </div>
      )}
      <button onClick={onExcluir} className="mt-2 text-[11.5px] font-bold text-red">Excluir turma</button>
    </Card>
  )
}

function ConfiguracaoMatriculaCard() {
  const { data: config, reload } = usePolling<ConfiguracaoMatricula>(async () => api.get('/configuracao'), 60000, [])
  const [editando, setEditando] = useState(false)
  const [dia, setDia] = useState('')
  const [mes, setMes] = useState('')
  const [salvando, setSalvando] = useState(false)

  function abrirEdicao() {
    setDia(config ? String(config.dataCorteDia) : '')
    setMes(config ? String(config.dataCorteMes) : '')
    setEditando(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      await api.patch('/configuracao', { dataCorteDia: Number(dia), dataCorteMes: Number(mes) })
      setEditando(false)
      reload()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionLabel>Data de corte pra matrícula</SectionLabel>
        <button onClick={() => (editando ? setEditando(false) : abrirEdicao())} className="text-[12px] font-bold text-blue">
          {editando ? 'Cancelar' : 'Editar'}
        </button>
      </div>
      {!editando && (
        <p className="mt-1 text-[13px]">
          {config ? `${String(config.dataCorteDia).padStart(2, '0')}/${String(config.dataCorteMes).padStart(2, '0')}` : '...'}
          {' — usada pra avisar se a idade do aluno bate com a turma escolhida na matrícula.'}
        </p>
      )}
      {editando && (
        <div className="mt-2.5 flex items-center gap-2">
          <input autoComplete="off" inputMode="numeric" className={`${inputCls} w-20`} placeholder="Dia" value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, ''))} />
          <input autoComplete="off" inputMode="numeric" className={`${inputCls} w-20`} placeholder="Mês" value={mes} onChange={(e) => setMes(e.target.value.replace(/\D/g, ''))} />
          <Button className="w-auto flex-1" disabled={!dia || !mes || salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar data de corte'}</Button>
        </div>
      )}
    </Card>
  )
}

export function MateriasCadastro() {
  const { data: materias, reload } = usePolling<Materia[]>(async () => api.get('/materias'), 30000, [])
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await api.post('/materias', { nome })
      setNome('')
      reload()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir essa matéria?')) return
    await api.delete(`/materias/${id}`)
    reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionLabel>Nova matéria</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <input autoComplete="off" className={inputCls} placeholder="Nome da matéria (ex: Matemática)" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Button disabled={!nome || salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Adicionar matéria'}</Button>
        </div>
      </Card>
      <div>
        <SectionLabel>Matérias cadastradas</SectionLabel>
        {!materias?.length && <EmptyState>Nenhuma matéria cadastrada.</EmptyState>}
        <div className="mt-2 flex flex-col gap-2">
          {materias?.map((m) => (
            <Card key={m.id} className="flex items-center justify-between">
              <span className="text-[13px] font-bold">{m.nome}</span>
              <button onClick={() => excluir(m.id)} className="text-[11.5px] font-bold text-red">Excluir</button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

const SEGMENTOS_ACESSO_ALUNO = ['fundamental_1', 'fundamental_2']

function AlunosCadastro() {
  const { data: alunos, reload } = usePolling<Aluno[]>(async () => api.get('/alunos'), 15000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 30000, [])
  const [filaImpressaoAcesso, setFilaImpressaoAcesso] = useState<{ nome: string; texto: string; rotulo: string }[]>([])
  const { data: pais } = usePolling<Pai[]>(async () => api.get('/pais'), 15000, [])
  const { data: configMatricula } = usePolling<ConfiguracaoMatricula>(async () => api.get('/configuracao'), 60000, [])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarImportacao, setMostrarImportacao] = useState(false)
  const [nome, setNome] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [responsavelIds, setResponsavelIds] = useState<string[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('integral')
  const [salvando, setSalvando] = useState(false)

  const [sexo, setSexo] = useState<'M' | 'F' | 'outro' | ''>('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [naturalidade, setNaturalidade] = useState('')
  const [uf, setUf] = useState('')
  const [nacionalidade, setNacionalidade] = useState('')
  const [ra, setRa] = useState('')
  const [numeroMatricula, setNumeroMatricula] = useState('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [orgaoEmissorRg, setOrgaoEmissorRg] = useState('')
  const [dataEmissaoRg, setDataEmissaoRg] = useState('')
  const [certidaoNascimento, setCertidaoNascimento] = useState('')
  const [escolasAnteriores, setEscolasAnteriores] = useState('')
  const [inicioNaEscola, setInicioNaEscola] = useState('')
  const [irmaosNaEscola, setIrmaosNaEscola] = useState('')
  const [telefones, setTelefones] = useState<Telefone[]>([])
  const [observacoes, setObservacoes] = useState('')

  const [editandoAlunoId, setEditandoAlunoId] = useState<string | null>(null)

  const [buscaNome, setBuscaNome] = useState('')
  const [filtroTurmaId, setFiltroTurmaId] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<Periodo | ''>('')
  const [filtroSegmento, setFiltroSegmento] = useState<Segmento | ''>('')
  const [pagina, setPagina] = useState(0)
  const POR_PAGINA = 20

  const turmaNome = (id: string) => turmas?.find((t) => t.id === id)?.nome ?? '...'
  const responsavelNomes = (alunoId: string) => pais?.filter((p) => p.alunoIds.includes(alunoId)).map((p) => p.nome).join(', ') || '—'
  const avisoIdade = configMatricula ? avisoIdadeTurma(dataNascimento, turmaId, turmas ?? [], configMatricula) : null
  const numeroChamadaDe = (alunoId: string, doTurmaId: string) => {
    const daTurma = (alunos ?? []).filter((x) => x.turmaId === doTurmaId)
    const idx = daTurma.findIndex((x) => x.id === alunoId)
    return idx >= 0 ? idx + 1 : null
  }

  const alunosFiltrados = (alunos ?? [])
    .filter((a) => {
      if (buscaNome && !a.nome.toLowerCase().includes(buscaNome.toLowerCase())) return false
      if (filtroTurmaId && a.turmaId !== filtroTurmaId) return false
      if (filtroPeriodo && a.periodo !== filtroPeriodo) return false
      if (filtroSegmento && turmas?.find((t) => t.id === a.turmaId)?.segmento !== filtroSegmento) return false
      return true
    })
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const totalPaginas = Math.max(1, Math.ceil(alunosFiltrados.length / POR_PAGINA))
  const paginaSegura = Math.min(pagina, totalPaginas - 1)
  const alunosDaPagina = alunosFiltrados.slice(paginaSegura * POR_PAGINA, paginaSegura * POR_PAGINA + POR_PAGINA)

  function limparFormulario() {
    setEditandoAlunoId(null)
    setNome(''); setTurmaId(''); setResponsavelIds([]); setPeriodo('integral')
    setSexo(''); setDataNascimento(''); setNaturalidade(''); setUf(''); setNacionalidade('')
    setRa(''); setNumeroMatricula('')
    setCpf(''); setRg(''); setOrgaoEmissorRg(''); setDataEmissaoRg(''); setCertidaoNascimento('')
    setEscolasAnteriores(''); setInicioNaEscola(''); setIrmaosNaEscola(''); setTelefones([]); setObservacoes('')
  }

  function abrirEdicao(a: Aluno) {
    setEditandoAlunoId(a.id)
    setNome(a.nome)
    setTurmaId(a.turmaId)
    setResponsavelIds((pais ?? []).filter((p) => p.alunoIds.includes(a.id)).map((p) => p.id))
    setPeriodo(a.periodo)
    setSexo(a.sexo ?? '')
    setDataNascimento(a.dataNascimento ?? '')
    setNaturalidade(a.naturalidade ?? '')
    setUf(a.uf ?? '')
    setNacionalidade(a.nacionalidade ?? '')
    setRa(a.ra ?? '')
    setNumeroMatricula(a.numeroMatricula ?? '')
    setCpf(a.cpf ?? '')
    setRg(a.rg ?? '')
    setOrgaoEmissorRg(a.orgaoEmissorRg ?? '')
    setDataEmissaoRg(a.dataEmissaoRg ?? '')
    setCertidaoNascimento(a.certidaoNascimento ?? '')
    setEscolasAnteriores(a.escolasAnteriores ?? '')
    setInicioNaEscola(a.inicioNaEscola ?? '')
    setIrmaosNaEscola(a.irmaosNaEscola != null ? String(a.irmaosNaEscola) : '')
    setTelefones(a.telefones ?? [])
    setObservacoes(a.observacoes ?? '')
    setMostrarForm(true)
    setMostrarImportacao(false)
  }

  async function salvar() {
    if (!editandoAlunoId) {
      const jaExiste = alunos?.some((a) => a.turmaId === turmaId && a.nome.trim().toLowerCase() === nome.trim().toLowerCase())
      if (jaExiste && !confirm(`Já existe um aluno chamado "${nome}" nessa turma. Cadastrar mesmo assim?`)) return
    }
    const iniciais = nome.trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('')
    const campos = {
      nome, turmaId, iniciais, periodo,
      sexo: sexo || undefined, dataNascimento, naturalidade, uf, nacionalidade,
      ra, numeroMatricula,
      cpf, rg, orgaoEmissorRg, dataEmissaoRg, certidaoNascimento,
      escolasAnteriores, inicioNaEscola, irmaosNaEscola: irmaosNaEscola ? Number(irmaosNaEscola) : undefined,
      telefones: telefones.filter((t) => t.numero || t.etiqueta),
      observacoes,
    }
    setSalvando(true)
    try {
      if (editandoAlunoId) {
        await api.patch(`/alunos/${editandoAlunoId}`, campos)
        await api.patch(`/alunos/${editandoAlunoId}/responsaveis`, { responsavelIds })
      } else {
        await api.post('/alunos', { ...campos, responsavelIds })
      }
      limparFormulario()
      setMostrarForm(false)
      reload()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esse aluno?')) return
    await api.delete(`/alunos/${id}`)
    reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() => { limparFormulario(); setMostrarForm((v) => !v); setMostrarImportacao(false) }}
          variant={mostrarForm ? 'ghost' : 'primary'}
        >
          {mostrarForm ? 'Cancelar' : 'Novo aluno'}
        </Button>
        <Button
          className="flex-1"
          onClick={() => { setMostrarImportacao((v) => !v); setMostrarForm(false) }}
          variant={mostrarImportacao ? 'ghost' : 'secondary'}
        >
          {mostrarImportacao ? 'Cancelar' : 'Importar planilha'}
        </Button>
      </div>

      {mostrarImportacao && (
        <ImportarPlanilha turmas={turmas} pais={pais} alunos={alunos} onDone={() => { setMostrarImportacao(false); reload() }} />
      )}

      {mostrarForm && (
        <Card>
          <SectionLabel>{editandoAlunoId ? 'Editar aluno' : 'Novo aluno'}</SectionLabel>
          <div className="mt-2.5 flex flex-col gap-2.5">
            <input autoComplete="off" className={inputCls} placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
            <select className={inputCls} value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              <option value="">Selecione a turma</option>
              {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <SeletorResponsaveis pais={pais} responsavelIds={responsavelIds} onToggle={(id) => toggleResponsavelHandler(id, setResponsavelIds)} />
            <div className="flex gap-1.5">
              {(['integral', 'meio_periodo'] as Periodo[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  className={`flex-1 rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold ${periodo === p ? 'border-green bg-green text-white' : 'border-line text-muted'}`}
                >
                  {p === 'integral' ? 'Integral' : 'Meio período'}
                </button>
              ))}
            </div>

            <p className={dividerCls}>Dados pessoais</p>
            <div className="flex gap-1.5">
              {([['M', 'Masculino'], ['F', 'Feminino'], ['outro', 'Outro']] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setSexo(v)} className={`flex-1 rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold ${sexo === v ? 'border-green bg-green text-white' : 'border-line text-muted'}`}>
                  {label}
                </button>
              ))}
            </div>
            <input autoComplete="off" type="date" className={inputCls} placeholder="Data de nascimento" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
            {avisoIdade && (
              <p className="rounded-lg bg-amber-light px-2.5 py-2 text-[12px] font-semibold text-amber">{avisoIdade}</p>
            )}
            <div className="flex gap-2">
              <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="Naturalidade" value={naturalidade} onChange={(e) => setNaturalidade(e.target.value)} />
              <input autoComplete="off" className={`${inputCls} w-16`} placeholder="UF" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </div>
            <input autoComplete="off" className={inputCls} placeholder="Nacionalidade" value={nacionalidade} onChange={(e) => setNacionalidade(e.target.value)} />

            <p className={dividerCls}>Documento</p>
            <div className="flex gap-2">
              <input autoComplete="off" className={`${inputCls} min-w-0 flex-1`} placeholder="RA" value={ra} onChange={(e) => setRa(e.target.value)} />
              <input autoComplete="off" className={`${inputCls} min-w-0 flex-1`} placeholder="Matrícula" value={numeroMatricula} onChange={(e) => setNumeroMatricula(e.target.value)} />
            </div>
            {editandoAlunoId && numeroChamadaDe(editandoAlunoId, turmaId) != null ? (
              <p className="text-[12px] text-muted">Nº de chamada: {numeroChamadaDe(editandoAlunoId, turmaId)} (calculado pela ordem alfabética da turma)</p>
            ) : (
              <p className="text-[11px] text-faint">O número de chamada é calculado automaticamente pela ordem alfabética da turma.</p>
            )}
            <div className="flex gap-2">
              <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="RG" value={rg} onChange={(e) => setRg(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="Órgão emissor" value={orgaoEmissorRg} onChange={(e) => setOrgaoEmissorRg(e.target.value)} />
              <input autoComplete="off" type="date" className={`${inputCls} flex-1`} placeholder="Data de emissão" value={dataEmissaoRg} onChange={(e) => setDataEmissaoRg(e.target.value)} />
            </div>
            <input autoComplete="off" className={inputCls} placeholder="Certidão de nascimento" value={certidaoNascimento} onChange={(e) => setCertidaoNascimento(e.target.value)} />

            <p className={dividerCls}>Escola</p>
            <input autoComplete="off" className={inputCls} placeholder="Escolas anteriores" value={escolasAnteriores} onChange={(e) => setEscolasAnteriores(e.target.value)} />
            <div className="flex gap-2">
              <input autoComplete="off" type="date" className={`${inputCls} flex-1`} placeholder="Início na escola" value={inicioNaEscola} onChange={(e) => setInicioNaEscola(e.target.value)} />
              <input autoComplete="off" inputMode="numeric" className={`${inputCls} w-32`} placeholder="Irmãos na escola" value={irmaosNaEscola} onChange={(e) => setIrmaosNaEscola(e.target.value.replace(/\D/g, ''))} />
            </div>

            <p className={dividerCls}>Telefones</p>
            <SeletorTelefones telefones={telefones} onChange={setTelefones} />

            <p className={dividerCls}>Observações</p>
            <textarea autoComplete="off" className={inputCls} rows={2} placeholder="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />

            <Button disabled={!nome || !turmaId || !responsavelIds.length || salvando} onClick={salvar}>
              {salvando ? 'Salvando...' : editandoAlunoId ? 'Salvar alterações' : 'Adicionar aluno'}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <SectionLabel>Filtrar alunos</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <input autoComplete="off" className={inputCls} placeholder="Buscar por nome" value={buscaNome} onChange={(e) => { setBuscaNome(e.target.value); setPagina(0) }} />
          <div className="flex gap-2">
            <select className={`${inputCls} flex-1`} value={filtroTurmaId} onChange={(e) => { setFiltroTurmaId(e.target.value); setPagina(0) }}>
              <option value="">Todas as turmas</option>
              {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <select className={`${inputCls} flex-1`} value={filtroPeriodo} onChange={(e) => { setFiltroPeriodo(e.target.value as Periodo | ''); setPagina(0) }}>
              <option value="">Todos os períodos</option>
              <option value="integral">Integral</option>
              <option value="meio_periodo">Meio período</option>
            </select>
          </div>
          <select className={inputCls} value={filtroSegmento} onChange={(e) => { setFiltroSegmento(e.target.value as Segmento | ''); setPagina(0) }}>
            <option value="">Todos os segmentos</option>
            <option value="infantil">Educação Infantil</option>
            <option value="fundamental_1">Fundamental I</option>
            <option value="fundamental_2">Fundamental II</option>
          </select>
        </div>
      </Card>

      {!!filaImpressaoAcesso.length && (
        <Card className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold">{filaImpressaoAcesso.length} credencial(is) de login pronta(s) pra imprimir</span>
          <div className="flex gap-3">
            <button
              onClick={() => imprimirEtiquetas('Credenciais — Login do aluno', filaImpressaoAcesso.map((c) => ({ titulo: c.nome, linhas: [{ label: 'Login', valor: `${c.rotulo}: ${c.texto}` }] })))}
              className="text-[11.5px] font-bold text-blue"
            >
              Imprimir etiquetas ({filaImpressaoAcesso.length})
            </button>
            <button onClick={() => setFilaImpressaoAcesso([])} className="text-[11.5px] font-bold text-muted">Limpar fila</button>
          </div>
        </Card>
      )}

      <div>
        <SectionLabel>Alunos cadastrados ({alunosFiltrados.length})</SectionLabel>
        {!alunosFiltrados.length && <EmptyState>Nenhum aluno encontrado.</EmptyState>}
        <div className="mt-2 flex flex-col gap-2">
          {alunosDaPagina.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{a.nome}</span>
                <div className="flex items-center gap-2">
                  <Pill tone={a.periodo === 'integral' ? 'blue' : 'muted'}>{a.periodo === 'integral' ? 'Integral' : 'Meio período'}</Pill>
                  <button onClick={() => excluir(a.id)} className="text-[11.5px] font-bold text-red">Excluir</button>
                </div>
              </div>
              <p className="mt-1 text-[11.5px] text-muted">
                Turma {turmaNome(a.turmaId)} · Nº chamada {numeroChamadaDe(a.id, a.turmaId) ?? '—'} · Responsáveis: {responsavelNomes(a.id)}
              </p>
              <button onClick={() => abrirEdicao(a)} className="mt-2 text-[11.5px] font-bold text-blue">Ver/editar</button>
              {SEGMENTOS_ACESSO_ALUNO.includes(turmas?.find((t) => t.id === a.turmaId)?.segmento ?? '') && (
                <AcessoAlunoBloco
                  aluno={a}
                  onMudou={reload}
                  onCredencial={(cred) => setFilaImpressaoAcesso((prev) => [...prev, cred])}
                />
              )}
            </Card>
          ))}
        </div>
        {totalPaginas > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <button
              disabled={paginaSegura === 0}
              onClick={() => setPagina(paginaSegura - 1)}
              className="text-[11.5px] font-bold text-blue disabled:text-faint"
            >
              Anterior
            </button>
            <span className="text-[11.5px] text-muted">Página {paginaSegura + 1} de {totalPaginas}</span>
            <button
              disabled={paginaSegura >= totalPaginas - 1}
              onClick={() => setPagina(paginaSegura + 1)}
              className="text-[11.5px] font-bold text-blue disabled:text-faint"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AcessoAlunoBloco({ aluno, onMudou, onCredencial }: {
  aluno: Aluno
  onMudou: () => void
  onCredencial: (cred: { nome: string; texto: string; rotulo: string }) => void
}) {
  const [mostrarCriar, setMostrarCriar] = useState(false)
  const [login, setLogin] = useState(aluno.nome)
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function criar() {
    setSalvando(true)
    try {
      await api.patch(`/alunos/${aluno.id}/acesso`, { login, senha })
      onCredencial({ nome: aluno.nome, texto: senha, rotulo: `Login: ${login} · Senha` })
      setMostrarCriar(false)
      setSenha('')
      onMudou()
    } finally {
      setSalvando(false)
    }
  }

  async function redefinirSenha() {
    const novaSenha = prompt('Digite a nova senha (mínimo 6 caracteres):')
    if (!novaSenha) return
    if (novaSenha.length < 6) return alert('A senha precisa ter pelo menos 6 caracteres.')
    await api.patch(`/alunos/${aluno.id}/acesso`, { novaSenha })
    onCredencial({ nome: aluno.nome, texto: novaSenha, rotulo: `Login: ${aluno.login} · Senha` })
    alert('Senha redefinida. Informe a nova senha ao aluno.')
  }

  async function alternarBloqueio() {
    if (aluno.bloqueadoEm) {
      await api.patch(`/alunos/${aluno.id}/acesso`, { bloqueadoEm: null })
    } else {
      if (!confirm(`Bloquear o acesso de ${aluno.nome}? O login dele(a) para de funcionar imediatamente.`)) return
      await api.patch(`/alunos/${aluno.id}/acesso`, { bloqueadoEm: new Date().toISOString() })
    }
    onMudou()
  }

  return (
    <div className="mt-2 border-t border-line pt-2">
      {aluno.login ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-muted">Login do aluno: <b>{aluno.login}</b></span>
            {aluno.bloqueadoEm && <Pill tone="red">Bloqueado</Pill>}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-3">
            <button onClick={redefinirSenha} className="text-[11.5px] font-bold text-blue">Redefinir senha</button>
            <button onClick={alternarBloqueio} className={`text-[11.5px] font-bold ${aluno.bloqueadoEm ? 'text-green-dark' : 'text-amber'}`}>
              {aluno.bloqueadoEm ? 'Reativar login' : 'Suspender login'}
            </button>
          </div>
        </>
      ) : mostrarCriar ? (
        <div className="flex flex-col gap-2">
          <input autoComplete="off" className={inputCls} placeholder="Nome de usuário" value={login} onChange={(e) => setLogin(e.target.value)} />
          <div className="flex gap-2">
            <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="Senha inicial" value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button type="button" onClick={() => setSenha(gerarSenhaAleatoria())} className="whitespace-nowrap rounded-lg bg-paper-sunken px-3 text-[12px] font-bold text-ink">
              Gerar senha
            </button>
          </div>
          <div className="flex gap-3">
            <button disabled={!login || senha.length < 6 || salvando} onClick={criar} className="text-[11.5px] font-bold text-blue disabled:opacity-40">
              {salvando ? 'Criando...' : 'Criar login'}
            </button>
            <button onClick={() => setMostrarCriar(false)} className="text-[11.5px] font-bold text-muted">Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setMostrarCriar(true)} className="text-[11.5px] font-bold text-blue">Criar login para o aluno</button>
      )}
    </div>
  )
}

function DadosFichaPreview({ pai }: { pai: Pai }) {
  const d = fichaDoPai(pai)
  const endereco = [d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf, d.cep].filter(Boolean).join(', ')
  const todosCampos: [string, string][] = [
    ['Data de nascimento', d.dataNascimento ? formatDateBR(d.dataNascimento) : ''],
    ['Naturalidade', d.naturalidade],
    ['Nacionalidade', d.nacionalidade],
    ['Profissão', d.profissao],
    ['CPF', d.cpf],
    ['RG', d.rg],
    ['E-mail', d.email],
    ['Endereço', endereco],
    ['Observações', d.observacoes],
  ]
  const campos = todosCampos.filter(([, valor]) => !!valor)

  return (
    <div className="mt-2.5 border-t border-line pt-2.5">
      {!campos.length && !d.foto && (
        <p className="text-[12px] text-faint">A família ainda não preencheu nenhum dado da ficha.</p>
      )}
      {!!campos.length && (
        <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {campos.map(([label, valor]) => (
            <div key={label}>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-faint">{label}</div>
              <div className="text-[12.5px]">{valor}</div>
            </div>
          ))}
        </div>
      )}
      {!!d.foto && <p className="mt-1.5 text-[11.5px] text-muted">Foto enviada: {d.foto.nome}</p>}
    </div>
  )
}

function PaisCadastro({ filaImpressao, setFilaImpressao }: {
  filaImpressao: CredencialPai[]
  setFilaImpressao: Dispatch<SetStateAction<CredencialPai[]>>
}) {
  const { data: pais, reload } = usePolling<Pai[]>(async () => api.get('/pais'), 15000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 15000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipo, setTipo] = useState('')
  const [responsavelFinanceiro, setResponsavelFinanceiro] = useState(false)
  const [ficha, setFicha] = useState<DadosFicha>(fichaVazia())
  const [salvando, setSalvando] = useState(false)
  const [ultimoCodigo, setUltimoCodigo] = useState<{ nome: string; codigo: string } | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoPaiId, setEditandoPaiId] = useState<string | null>(null)
  const [verDadosId, setVerDadosId] = useState<string | null>(null)

  const [buscaPai, setBuscaPai] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'' | 'ativado' | 'aguardando'>('')
  const [filtroFinanceiro, setFiltroFinanceiro] = useState<'' | 'sim' | 'nao'>('')
  const [filtroFicha, setFiltroFicha] = useState<'' | 'completa' | 'pendente'>('')
  const [filtroAlunoId, setFiltroAlunoId] = useState('')
  const [selecionadosParaImprimir, setSelecionadosParaImprimir] = useState<string[]>([])

  const responsavelPorNomes = (paiId: string) => alunos?.filter((a) => pais?.find((p) => p.id === paiId)?.alunoIds.includes(a.id)).map((a) => a.nome).join(', ') || '—'

  const familiaDoAluno = filtroAlunoId ? (pais ?? []).filter((p) => p.alunoIds.includes(filtroAlunoId)) : []
  const nomeAlunoFiltro = alunos?.find((a) => a.id === filtroAlunoId)?.nome ?? ''

  function alternarSelecao(paiId: string) {
    setSelecionadosParaImprimir((prev) => (prev.includes(paiId) ? prev.filter((id) => id !== paiId) : [...prev, paiId]))
  }

  async function imprimirResponsavel(p: Pai) {
    if (!p.consentimentoEm && p.codigoAcesso) {
      setFilaImpressao((prev) => [...prev, { paiId: p.id, nome: p.nome, telefone: p.telefone, texto: p.codigoAcesso ?? '', rotulo: 'Código de acesso', tipo: p.tipo }])
      return
    }
    if (!confirm(`${p.nome} já ativou o acesso. Isso vai gerar uma senha nova, substituindo a atual. Continuar?`)) return
    const novaSenha = gerarSenhaAleatoria()
    await api.patch(`/pais/${p.id}`, { novaSenha })
    setFilaImpressao((prev) => [...prev, { paiId: p.id, nome: p.nome, telefone: p.telefone, texto: novaSenha, rotulo: 'Senha', tipo: p.tipo }])
  }

  async function imprimirSelecionados() {
    for (const paiId of selecionadosParaImprimir) {
      const p = familiaDoAluno.find((x) => x.id === paiId)
      if (p) await imprimirResponsavel(p)
    }
    setSelecionadosParaImprimir([])
  }

  const paisFiltrados = (pais ?? []).filter((p) => {
    if (buscaPai) {
      const q = buscaPai.toLowerCase()
      if (!p.nome.toLowerCase().includes(q) && !p.telefone.includes(buscaPai)) return false
    }
    if (filtroStatus === 'ativado' && !p.consentimentoEm) return false
    if (filtroStatus === 'aguardando' && p.consentimentoEm) return false
    if (filtroFinanceiro === 'sim' && !p.responsavelFinanceiro) return false
    if (filtroFinanceiro === 'nao' && p.responsavelFinanceiro) return false
    if (filtroFicha === 'completa' && !p.fichaAtualizadaEm) return false
    if (filtroFicha === 'pendente' && p.fichaAtualizadaEm) return false
    return true
  })

  function limparFormulario() {
    setEditandoPaiId(null)
    setNome(''); setTelefone(''); setTipo(''); setResponsavelFinanceiro(false)
    setFicha(fichaVazia())
  }

  function abrirEdicao(p: Pai) {
    setEditandoPaiId(p.id)
    setNome(p.nome)
    setTelefone(p.telefone)
    setTipo(p.tipo ?? '')
    setResponsavelFinanceiro(!!p.responsavelFinanceiro)
    setFicha(fichaDoPai(p))
    setMostrarForm(true)
  }

  async function salvar() {
    const campos = {
      nome, telefone, tipo, responsavelFinanceiro,
      ...(editandoPaiId ? camposFicha(ficha) : {}),
    }
    setSalvando(true)
    try {
      if (editandoPaiId) {
        await api.patch(`/pais/${editandoPaiId}`, campos)
      } else {
        const criado = await api.post<Pai>('/pais', campos)
        setUltimoCodigo({ nome: criado.nome, codigo: criado.codigoAcesso ?? '' })
        setFilaImpressao((prev) => [...prev, { paiId: criado.id, nome: criado.nome, telefone: criado.telefone, texto: criado.codigoAcesso ?? '', rotulo: 'Código de acesso', tipo: criado.tipo }])
      }
      limparFormulario()
      setMostrarForm(false)
      reload()
    } finally {
      setSalvando(false)
    }
  }

  async function gerarNovoCodigo(p: Pai) {
    const atualizado = await api.patch<Pai>(`/pais/${p.id}`, { gerarNovoCodigo: true })
    setUltimoCodigo({ nome: p.nome, codigo: atualizado.codigoAcesso ?? '' })
    setFilaImpressao((prev) => [...prev, { paiId: p.id, nome: p.nome, telefone: p.telefone, texto: atualizado.codigoAcesso ?? '', rotulo: 'Código de acesso', tipo: p.tipo }])
    reload()
  }

  async function redefinirSenha(p: Pai) {
    const novaSenha = prompt('Digite a nova senha (mínimo 6 caracteres):')
    if (!novaSenha) return
    if (novaSenha.length < 6) return alert('A senha precisa ter pelo menos 6 caracteres.')
    await api.patch(`/pais/${p.id}`, { novaSenha })
    setFilaImpressao((prev) => [...prev, { paiId: p.id, nome: p.nome, telefone: p.telefone, texto: novaSenha, rotulo: 'Senha', tipo: p.tipo }])
    alert('Senha redefinida. Informe a nova senha à família.')
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esse responsável? Isso não exclui o(s) aluno(s) vinculado(s).')) return
    await api.delete(`/pais/${id}`)
    reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => { limparFormulario(); setMostrarForm((v) => !v) }} variant={mostrarForm ? 'ghost' : 'primary'}>
        {mostrarForm ? 'Cancelar' : 'Novo responsável'}
      </Button>

      <Card>
        <SectionLabel>Ver ou imprimir ficha de uma família</SectionLabel>
        <select
          className={`${inputCls} mt-2.5`}
          value={filtroAlunoId}
          onChange={(e) => { setFiltroAlunoId(e.target.value); setSelecionadosParaImprimir([]) }}
        >
          <option value="">Selecione um aluno</option>
          {alunos?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>

        {!!filtroAlunoId && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-bold">Família de {nomeAlunoFiltro}</span>
              {!!selecionadosParaImprimir.length && (
                <button onClick={imprimirSelecionados} className="text-[11.5px] font-bold text-blue">
                  Imprimir selecionados ({selecionadosParaImprimir.length})
                </button>
              )}
            </div>
            {!familiaDoAluno.length && <p className="mt-2 text-[12.5px] text-faint">Nenhum responsável vinculado a esse aluno ainda.</p>}
            {!!familiaDoAluno.length && (
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => {
                    const aluno = alunos?.find((a) => a.id === filtroAlunoId)
                    if (!aluno) return
                    const turmaNome = turmas?.find((t) => t.id === aluno.turmaId)?.nome ?? ''
                    imprimirFichaFamilia(aluno, turmaNome, familiaDoAluno, false)
                  }}
                  className="text-[11.5px] font-bold text-blue"
                >
                  Imprimir em branco (preencher à mão)
                </button>
                <button
                  onClick={() => {
                    const aluno = alunos?.find((a) => a.id === filtroAlunoId)
                    if (!aluno) return
                    const turmaNome = turmas?.find((t) => t.id === aluno.turmaId)?.nome ?? ''
                    imprimirFichaFamilia(aluno, turmaNome, familiaDoAluno, true)
                  }}
                  className="text-[11.5px] font-bold text-blue"
                >
                  Imprimir com dados preenchidos
                </button>
              </div>
            )}
            <div className="mt-2 flex flex-col gap-2">
              {familiaDoAluno.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-paper-sunken px-3 py-2.5">
                  <label className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selecionadosParaImprimir.includes(p.id)}
                      onChange={() => alternarSelecao(p.id)}
                    />
                    <span>
                      <span className="text-[12.5px] font-bold">{p.nome}</span>
                      <span className="ml-1.5 text-[11px] text-muted">{p.tipo || 'Responsável'}</span>
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    {p.fichaAtualizadaEm ? <Pill tone="green">Ficha completa</Pill> : <Pill tone="amber">Aguardando família</Pill>}
                    {p.consentimentoEm ? <Pill tone="green">Ativado</Pill> : <Pill tone="amber">Ainda não entrou no app</Pill>}
                    <button onClick={() => imprimirResponsavel(p)} className="text-[11.5px] font-bold text-blue">Credencial</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {mostrarForm && (
      <Card>
        <SectionLabel>{editandoPaiId ? 'Editar responsável' : 'Novo responsável'}</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <input autoComplete="off" className={inputCls} placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
          <input autoComplete="off" inputMode="numeric" className={inputCls} placeholder="Telefone (com DDD)" value={telefone} onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))} />
          <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Parentesco</option>
            <option>Pai</option>
            <option>Mãe</option>
            <option>Avô</option>
            <option>Avó</option>
            <option>Tio</option>
            <option>Tia</option>
            <option>Responsável legal</option>
            <option>Outro</option>
          </select>
          <button
            type="button"
            onClick={() => setResponsavelFinanceiro((v) => !v)}
            className={`self-start rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold ${responsavelFinanceiro ? 'border-amber bg-amber text-white' : 'border-line text-muted'}`}
          >
            Responsável financeiro
          </button>

          {!editandoPaiId && (
            <p className="text-[11.5px] text-faint">
              O restante da ficha (documento, endereço, foto etc.) a própria família preenche no primeiro acesso.
            </p>
          )}

          {!!editandoPaiId && (
            <>
              <p className={dividerCls}>Ficha completa</p>
              <FichaResponsavelForm value={ficha} onChange={setFicha} />
            </>
          )}

          <Button disabled={!nome || !telefone || salvando} onClick={salvar}>
            {salvando ? 'Salvando...' : editandoPaiId ? 'Salvar alterações' : 'Cadastrar responsável'}
          </Button>
        </div>
      </Card>
      )}

      {ultimoCodigo && (
        <Card className="border-blue bg-blue-light">
          <p className="text-[13px] font-bold text-blue">Código de matrícula de {ultimoCodigo.nome}</p>
          <p className="mt-1 text-[22px] font-bold tracking-wider text-blue">{ultimoCodigo.codigo}</p>
          <p className="mt-1 text-[11.5px] text-blue">Informe esse código e o telefone cadastrado à família — é assim que ela ativa o próprio acesso.</p>
        </Card>
      )}

      {!!filaImpressao.length && (
        <Card className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold">{filaImpressao.length} credencial(is) pronta(s) pra imprimir</span>
          <div className="flex gap-3">
            <button onClick={() => imprimirEtiquetas('Credenciais — Famílias', agruparCredenciaisPorAluno(filaImpressao, pais, alunos))} className="text-[11.5px] font-bold text-blue">Imprimir etiquetas ({filaImpressao.length})</button>
            <button onClick={() => setFilaImpressao([])} className="text-[11.5px] font-bold text-muted">Limpar fila</button>
          </div>
        </Card>
      )}

      <Card>
        <SectionLabel>Filtrar responsáveis</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <input autoComplete="off" className={inputCls} placeholder="Buscar por nome ou telefone" value={buscaPai} onChange={(e) => setBuscaPai(e.target.value)} />
          <div className="flex gap-2">
            <select className={`${inputCls} flex-1`} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}>
              <option value="">Todos os status</option>
              <option value="ativado">Ativado</option>
              <option value="aguardando">Ainda não entrou no app</option>
            </select>
            <select className={`${inputCls} flex-1`} value={filtroFinanceiro} onChange={(e) => setFiltroFinanceiro(e.target.value as typeof filtroFinanceiro)}>
              <option value="">Financeiro: todos</option>
              <option value="sim">Responsável financeiro</option>
              <option value="nao">Não é financeiro</option>
            </select>
          </div>
          <select className={inputCls} value={filtroFicha} onChange={(e) => setFiltroFicha(e.target.value as typeof filtroFicha)}>
            <option value="">Ficha: todas</option>
            <option value="completa">Ficha completa</option>
            <option value="pendente">Aguardando família</option>
          </select>
        </div>
      </Card>

      <div>
        <SectionLabel>Responsáveis cadastrados ({paisFiltrados.length})</SectionLabel>
        {!paisFiltrados.length && <EmptyState>Nenhum responsável encontrado.</EmptyState>}
        <div className="mt-2 flex flex-col gap-2">
          {paisFiltrados.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{p.nome}</span>
                <div className="flex items-center gap-1.5">
                  {p.responsavelFinanceiro && <Pill tone="amber">Responsável financeiro</Pill>}
                  {p.fichaAtualizadaEm ? <Pill tone="green">Ficha completa</Pill> : <Pill tone="amber">Aguardando família</Pill>}
                  {p.consentimentoEm ? <Pill tone="green">Ativado</Pill> : <Pill tone="amber">Ainda não entrou no app</Pill>}
                </div>
              </div>
              <p className="mt-1 text-[11.5px] text-muted">{p.telefone}{p.tipo ? ` · ${p.tipo}` : ''}</p>
              <p className="mt-1 text-[11px] text-faint">Responsável por: {responsavelPorNomes(p.id)}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button onClick={() => setVerDadosId(verDadosId === p.id ? null : p.id)} className="text-[11.5px] font-bold text-blue">
                  {verDadosId === p.id ? 'Ocultar dados preenchidos' : 'Ver dados preenchidos'}
                </button>
                <button onClick={() => abrirEdicao(p)} className="text-[11.5px] font-bold text-blue">Editar</button>
                {!p.consentimentoEm && (
                  <button onClick={() => gerarNovoCodigo(p)} className="text-[11.5px] font-bold text-blue">Gerar novo código</button>
                )}
                <button onClick={() => redefinirSenha(p)} className="text-[11.5px] font-bold text-blue">Redefinir senha</button>
                <button onClick={() => excluir(p.id)} className="text-[11.5px] font-bold text-red">Excluir</button>
              </div>
              {verDadosId === p.id && <DadosFichaPreview pai={p} />}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProfessoresCadastro({ filaImpressao, setFilaImpressao }: {
  filaImpressao: CredencialProfessor[]
  setFilaImpressao: Dispatch<SetStateAction<CredencialProfessor[]>>
}) {
  const { data: professores, reload } = usePolling<Professor[]>(async () => api.get('/professores'), 15000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 30000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 30000, [])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [turmaIds, setTurmaIds] = useState<string[]>([])
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [atuaNoIntegral, setAtuaNoIntegral] = useState(false)
  const [turmasIntegral, setTurmasIntegral] = useState<string[]>([])
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const ultimoCliqueVinculo = useRef<Record<string, number>>({})

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editTurmaIds, setEditTurmaIds] = useState<string[]>([])
  const [editVinculos, setEditVinculos] = useState<Vinculo[]>([])
  const [editAtuaNoIntegral, setEditAtuaNoIntegral] = useState(false)
  const [editTurmasIntegral, setEditTurmasIntegral] = useState<string[]>([])
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const ultimoCliqueVinculoEdicao = useRef<Record<string, number>>({})

  function alternarTurmaIntegral(turmaId: string) {
    setTurmasIntegral((prev) => (prev.includes(turmaId) ? prev.filter((t) => t !== turmaId) : [...prev, turmaId]))
  }
  function alternarTurmaIntegralEdicao(turmaId: string) {
    setEditTurmasIntegral((prev) => (prev.includes(turmaId) ? prev.filter((t) => t !== turmaId) : [...prev, turmaId]))
  }

  const turmaNomes = (p: Professor) =>
    p.turmaIds
      .map((tid) => {
        const t = turmas?.find((x) => x.id === tid)
        if (!t) return null
        const nomesMaterias = p.vinculos.filter((v) => v.turmaId === tid).map((v) => materias?.find((m) => m.id === v.materiaId)?.nome).filter(Boolean)
        return nomesMaterias.length ? `${t.nome} (${nomesMaterias.join(', ')})` : t.nome
      })
      .filter(Boolean)
      .join(', ')

  const alternarTurma = (turma: Turma) => toggleTurmaHandler(turma, turmaIds, setTurmaIds, setVinculos)
  const alternarVinculo = (turmaId: string, materiaId: string) => toggleVinculoHandler(turmaId, materiaId, ultimoCliqueVinculo, setVinculos)

  const alternarTurmaEdicao = (turma: Turma) => toggleTurmaHandler(turma, editTurmaIds, setEditTurmaIds, setEditVinculos)
  const alternarVinculoEdicao = (turmaId: string, materiaId: string) => toggleVinculoHandler(turmaId, materiaId, ultimoCliqueVinculoEdicao, setEditVinculos)

  async function salvar() {
    setSalvando(true)
    try {
      await api.post('/professores', { nome, telefone, turmaIds, vinculos, atuaNoIntegral, turmasIntegral, senha })
      setFilaImpressao((prev) => [...prev, { nome, telefone, texto: senha, rotulo: 'Senha' }])
      setNome('')
      setTelefone('')
      setTurmaIds([])
      setVinculos([])
      setAtuaNoIntegral(false)
      setTurmasIntegral([])
      setSenha('')
      setMostrarForm(false)
      reload()
    } finally {
      setSalvando(false)
    }
  }

  function editar(p: Professor) {
    setEditandoId(p.id)
    setEditTurmaIds([...p.turmaIds])
    setEditVinculos([...p.vinculos])
    setEditAtuaNoIntegral(p.atuaNoIntegral)
    setEditTurmasIntegral([...(p.turmasIntegral ?? [])])
  }

  function cancelarEdicao() {
    setEditandoId(null)
  }

  async function salvarEdicao() {
    if (!editandoId) return
    setSalvandoEdicao(true)
    try {
      await api.patch(`/professores/${editandoId}`, {
        turmaIds: editTurmaIds,
        vinculos: editVinculos,
        atuaNoIntegral: editAtuaNoIntegral,
        turmasIntegral: editTurmasIntegral,
      })
      setEditandoId(null)
      reload()
    } finally {
      setSalvandoEdicao(false)
    }
  }

  async function redefinirSenha(p: Professor) {
    const novaSenha = prompt('Digite a nova senha (mínimo 6 caracteres):')
    if (!novaSenha) return
    if (novaSenha.length < 6) return alert('A senha precisa ter pelo menos 6 caracteres.')
    await api.patch(`/professores/${p.id}`, { novaSenha })
    setFilaImpressao((prev) => [...prev, { nome: p.nome, telefone: p.telefone, texto: novaSenha, rotulo: 'Senha' }])
    alert('Senha redefinida. Informe a nova senha à professora.')
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esse professor(a)?')) return
    await api.delete(`/professores/${id}`)
    reload()
  }

  async function alternarBloqueio(p: Professor) {
    if (p.bloqueadoEm) {
      await api.patch(`/professores/${p.id}`, { bloqueadoEm: null })
    } else {
      if (!confirm(`Bloquear o acesso de ${p.nome}? O login dela(e) para de funcionar imediatamente, mas o cadastro e o histórico continuam intactos.`)) return
      await api.patch(`/professores/${p.id}`, { bloqueadoEm: new Date().toISOString() })
    }
    reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setMostrarForm((v) => !v)} variant={mostrarForm ? 'ghost' : 'primary'}>
        {mostrarForm ? 'Cancelar' : 'Novo professor(a)'}
      </Button>

      {mostrarForm && (
        <Card>
          <SectionLabel>Novo professor(a)</SectionLabel>
          <div className="mt-2.5 flex flex-col gap-2.5">
            <input autoComplete="off" className={inputCls} placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
            <input autoComplete="off" inputMode="numeric" className={inputCls} placeholder="Telefone (com DDD)" value={telefone} onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))} />
            <SeletorTurmasEMaterias turmas={turmas} materias={materias} turmaIds={turmaIds} vinculos={vinculos} onToggleTurma={alternarTurma} onToggleVinculo={alternarVinculo} />
            <label className="flex items-center gap-2 text-[12.5px] font-semibold">
              <input type="checkbox" checked={atuaNoIntegral} onChange={(e) => setAtuaNoIntegral(e.target.checked)} />
              Também atua no Integral (Fund. I/II)
            </label>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">Turmas onde cobre o Integral (acesso restrito: rotina, fotos e lições)</p>
              <SeletorTurmasIntegral turmas={turmas} turmaIds={turmasIntegral} onToggle={alternarTurmaIntegral} />
            </div>
            <div className="flex gap-2">
              <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="Senha inicial" value={senha} onChange={(e) => setSenha(e.target.value)} />
              <button type="button" onClick={() => setSenha(gerarSenhaAleatoria())} className="whitespace-nowrap rounded-lg bg-paper-sunken px-3 text-[12px] font-bold text-ink">
                Gerar senha
              </button>
            </div>
            <Button disabled={!nome || !telefone || !turmaIds.length || senha.length < 6 || salvando} onClick={salvar}>
              {salvando ? 'Salvando...' : 'Cadastrar professor(a)'}
            </Button>
          </div>
        </Card>
      )}

      {!!filaImpressao.length && (
        <Card className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold">{filaImpressao.length} credencial(is) pronta(s) pra imprimir</span>
          <div className="flex gap-3">
            <button
              onClick={() => imprimirEtiquetas('Credenciais — Professores', filaImpressao.map((c) => ({ titulo: c.nome, linhas: [{ label: 'Acesso', valor: `Tel ${c.telefone} · ${c.rotulo}: ${c.texto}` }] })))}
              className="text-[11.5px] font-bold text-blue"
            >
              Imprimir etiquetas ({filaImpressao.length})
            </button>
            <button onClick={() => setFilaImpressao([])} className="text-[11.5px] font-bold text-muted">Limpar fila</button>
          </div>
        </Card>
      )}

      <div>
        <SectionLabel>Professores cadastrados</SectionLabel>
        {!professores?.length && <EmptyState>Nenhum professor cadastrado.</EmptyState>}
        <div className="mt-2 flex flex-col gap-2">
          {professores?.map((p) => (
            <Card key={p.id}>
              {editandoId === p.id ? (
                <div className="flex flex-col gap-2.5">
                  <p className="text-[13px] font-bold">Editando turmas e matérias de {p.nome}</p>
                  <SeletorTurmasEMaterias turmas={turmas} materias={materias} turmaIds={editTurmaIds} vinculos={editVinculos} onToggleTurma={alternarTurmaEdicao} onToggleVinculo={alternarVinculoEdicao} />
                  <label className="flex items-center gap-2 text-[12.5px] font-semibold">
                    <input type="checkbox" checked={editAtuaNoIntegral} onChange={(e) => setEditAtuaNoIntegral(e.target.checked)} />
                    Também atua no Integral (Fund. I/II)
                  </label>
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">Turmas onde cobre o Integral (acesso restrito: rotina, fotos e lições)</p>
                    <SeletorTurmasIntegral turmas={turmas} turmaIds={editTurmasIntegral} onToggle={alternarTurmaIntegralEdicao} />
                  </div>
                  <div className="mt-1 flex gap-3">
                    <Button disabled={!editTurmaIds.length || salvandoEdicao} onClick={salvarEdicao}>
                      {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                    <button onClick={cancelarEdicao} className="text-[11.5px] font-bold text-muted">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold">{p.nome}</span>
                    {p.atuaNoIntegral && <Pill tone="blue">Integral</Pill>}
                    {!!p.turmasIntegral?.length && <Pill tone="amber">Cobertura Integral</Pill>}
                    {p.bloqueadoEm && <Pill tone="red">Bloqueado</Pill>}
                  </div>
                  <p className="mt-1 text-[11.5px] text-muted">{p.telefone} · Turmas: {turmaNomes(p) || '—'}</p>
                  {!!p.turmasIntegral?.length && (
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      Cobertura Integral: {p.turmasIntegral.map((tid) => turmas?.find((t) => t.id === tid)?.nome).filter(Boolean).join(', ')}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button onClick={() => editar(p)} className="text-[11.5px] font-bold text-blue">Editar</button>
                    <button onClick={() => redefinirSenha(p)} className="text-[11.5px] font-bold text-blue">Redefinir senha</button>
                    <button onClick={() => alternarBloqueio(p)} className={`text-[11.5px] font-bold ${p.bloqueadoEm ? 'text-green-dark' : 'text-amber'}`}>
                      {p.bloqueadoEm ? 'Reativar login' : 'Suspender login'}
                    </button>
                    <button onClick={() => excluir(p.id)} className="text-[11.5px] font-bold text-red">Excluir</button>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
