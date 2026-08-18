import { useState, type ChangeEvent } from 'react'
import { api, qs } from '../../api'
import { usePolling } from '../../usePolling'
import type { Aluno, Materia, Semanario } from '../../types'
import { Button, Card, SectionLabel, formatDateBR } from '../../components/ui'
import { IconBook, IconCamera, IconEdit, IconBell, IconChevron, IconArrowLeft, IconHome, IconAlert, IconChart } from '../../components/Icons'
import type { Anexo } from '../../components/FileAttach'
import { RotinaHub } from './RotinaHub'
import { FormRelatorio } from './FormRelatorio'
import { FormConteudoDia } from './FormConteudoDia'
import { FormAtividadeAvaliativa } from './AtividadesAvaliativas'
import { Field, Sucesso, inputCls } from './formHelpers'

type Forma = 'licao' | 'foto' | 'relatorio' | 'conteudo' | 'aviso' | 'rotina' | 'ocorrencia' | 'avaliativa' | null

type Secao = { titulo: string; opcoes: { key: Exclude<Forma, null>; label: string; sub: string; icon: typeof IconBook; tone: string }[] }

function construirSecoes(ehCoordenacao: boolean, ehFundamental: boolean, elegivelAvaliativa: boolean): Secao[] {
  const secoes: Secao[] = [
    {
      titulo: 'Comunicação com a turma',
      opcoes: [
        { key: 'aviso' as const, label: 'Aviso geral', sub: 'Mural da turma', icon: IconBell, tone: 'text-red' },
        { key: 'foto' as const, label: 'Foto da rotina', sub: 'Foto da turma', icon: IconCamera, tone: 'text-green' },
        { key: 'licao' as const, label: 'Lição de casa', sub: 'Para toda a turma', icon: IconBook, tone: 'text-blue' },
      ],
    },
    ehFundamental
      ? {
          titulo: 'O dia de hoje',
          opcoes: [
            { key: 'conteudo' as const, label: 'Conteúdo do dia', sub: 'O que foi trabalhado, por matéria — enviado ao(s) responsável(is)', icon: IconEdit, tone: 'text-amber' },
            ...(elegivelAvaliativa
              ? [{ key: 'avaliativa' as const, label: 'Atividade avaliativa', sub: 'Prova ou trabalho valendo nota — data, valor e conteúdo pra estudar', icon: IconChart, tone: 'text-red' }]
              : []),
          ],
        }
      : {
          titulo: 'Rotina do dia',
          opcoes: [
            { key: 'rotina' as const, label: 'Rotina do dia', sub: 'Lanches, almoço, sono, higiene', icon: IconHome, tone: 'text-blue' },
            { key: 'relatorio' as const, label: 'Relatório', sub: 'Resumo do dia e atividades — enviado ao(s) responsável(is)', icon: IconEdit, tone: 'text-amber' },
          ],
        },
  ]
  if (!ehCoordenacao) {
    secoes.push({
      titulo: 'Sobre um aluno',
      opcoes: [
        { key: 'ocorrencia' as const, label: 'Ocorrência geral', sub: 'Queda, item esquecido, comportamento — vai para aprovação da coordenação', icon: IconAlert, tone: 'text-amber' },
      ],
    })
  }
  return secoes
}

export function PostarHub({ turmaId, alunos, autor, ehCoordenacao, ehFundamental, elegivelAvaliativa, serie, materiasDisponiveis, materias }: {
  turmaId: string
  alunos: Aluno[] | null
  autor: string
  ehCoordenacao?: boolean
  ehFundamental?: boolean
  elegivelAvaliativa?: boolean
  serie?: number
  materiasDisponiveis?: Materia[]
  materias?: Materia[]
}) {
  const [forma, setForma] = useState<Forma>(null)
  const secoes = construirSecoes(!!ehCoordenacao, !!ehFundamental, !!elegivelAvaliativa)

  if (!forma) {
    return (
      <div className="flex flex-col gap-4">
        {secoes.map((secao) => (
          <div key={secao.titulo}>
            <SectionLabel>{secao.titulo}</SectionLabel>
            <div className="mt-2 flex flex-col gap-3">
              {secao.opcoes.map((op) => (
                <button key={op.key} onClick={() => setForma(op.key)} className="text-left">
                  <Card className="flex items-center gap-3">
                    <op.icon className={`h-5 w-5 flex-shrink-0 ${op.tone}`} />
                    <span className="flex-1">
                      <div className="text-[13.5px] font-bold">{op.label}</div>
                      <div className="text-[11.5px] text-muted">{op.sub}</div>
                    </span>
                    <IconChevron className="h-4 w-4 text-faint" />
                  </Card>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => setForma(null)} className="flex items-center gap-1 text-[12px] font-bold text-muted">
        <IconArrowLeft className="h-4 w-4" /> Voltar
      </button>
      {forma === 'licao' && <FormLicao turmaId={turmaId} autor={autor} materias={materias ?? []} onDone={() => setForma(null)} />}
      {forma === 'foto' && <FormFoto turmaId={turmaId} autor={autor} onDone={() => setForma(null)} />}
      {forma === 'rotina' && <RotinaHub turmaId={turmaId} alunos={alunos} />}
      {forma === 'relatorio' && alunos && <FormRelatorio turmaId={turmaId} alunos={alunos} autor={autor} onDone={() => setForma(null)} />}
      {forma === 'conteudo' && (
        <FormConteudoDia turmaId={turmaId} serie={serie} autor={autor} materias={materiasDisponiveis ?? []} onDone={() => setForma(null)} />
      )}
      {forma === 'avaliativa' && (
        <FormAtividadeAvaliativa turmaId={turmaId} materiasDisponiveis={materiasDisponiveis ?? []} autor={autor} onDone={() => setForma(null)} />
      )}
      {forma === 'aviso' && <FormAviso turmaId={turmaId} autor={autor} onDone={() => setForma(null)} />}
      {forma === 'ocorrencia' && alunos && <FormOcorrencia turmaId={turmaId} alunos={alunos} autor={autor} onDone={() => setForma(null)} />}
    </div>
  )
}

const TIPOS_MATERIAL_LICAO = ['Livro didático', 'Folha avulsa', 'Caderno', 'Trabalho', 'Eureka', 'Cultura Inglesa']

function FormLicao({ turmaId, autor, materias, onDone }: { turmaId: string; autor: string; materias: Materia[]; onDone: () => void }) {
  const { data: semanarios } = usePolling<Semanario[]>(
    async () => api.get(`/semanarios${qs({ turmaId, estado: 'aprovado' })}`),
    30000,
    [turmaId],
  )
  const hoje = new Date().toISOString().slice(0, 10)
  const sugestoesLicaoDeCasa = (semanarios ?? [])
    .flatMap((s) => s.dias)
    .filter((d) => d.data === hoje)
    .flatMap((d) => d.aulas
      .filter((a) => a.atividadesDeCasa)
      .map((a) => ({ titulo: a.aula || formatDateBR(d.data), texto: a.atividadesDeCasa as string })))

  const [titulo, setTitulo] = useState('')
  const [materiaId, setMateriaId] = useState(materias[0]?.id ?? '')
  const [descricao, setDescricao] = useState('')
  const [entrega, setEntrega] = useState(new Date().toISOString().slice(0, 10))
  const [anexo, setAnexo] = useState<{ nome: string; tipo: string; dataUrl: string } | null>(null)
  const [erroAnexo, setErroAnexo] = useState('')
  const [aceitaEntregaPdf, setAceitaEntregaPdf] = useState(true)
  const [ok, setOk] = useState(false)
  const [publicando, setPublicando] = useState(false)

  async function selecionarArquivo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErroAnexo('')
    if (file.size > 8 * 1024 * 1024) {
      setErroAnexo('Arquivo muito grande — o limite do protótipo é 8MB.')
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setAnexo({ nome: file.name, tipo: file.type, dataUrl })
  }

  async function publicar() {
    setPublicando(true)
    try {
      await api.post('/licoes', {
        turmaId,
        materiaId: materiaId || null,
        titulo,
        descricao,
        entrega,
        autor,
        anexoNome: anexo?.nome ?? null,
        anexoTipo: anexo?.tipo ?? null,
        anexoDataUrl: anexo?.dataUrl ?? null,
        aceitaEntregaPdf,
      })
      setOk(true)
      setTimeout(onDone, 1200)
    } finally {
      setPublicando(false)
    }
  }

  if (ok) return <Sucesso>Lição publicada para a turma — status "Pendente" criado para cada aluno.</Sucesso>

  return (
    <div className="flex flex-col gap-3">
      <Field label="Título">
        <select className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)}>
          <option value="">Selecione</option>
          {TIPOS_MATERIAL_LICAO.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      {!!materias.length && (
        <Field label="Matéria">
          <select className={inputCls} value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Field>
      )}
      {!!sugestoesLicaoDeCasa.length && (
        <div className="flex flex-col gap-1.5 rounded-xl bg-paper-sunken p-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Usar do semanário</span>
          {sugestoesLicaoDeCasa.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setDescricao(s.texto)}
              className="rounded-lg bg-paper-raised px-2.5 py-2 text-left text-[12px]"
            >
              <span className="font-bold">{s.titulo || '(sem título)'}:</span> {s.texto}
            </button>
          ))}
        </div>
      )}
      <Field label="O que fazer"><textarea autoComplete="off" className={inputCls} rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Field>
      <Field label="Entrega"><input autoComplete="off" type="date" className={inputCls} value={entrega} onChange={(e) => setEntrega(e.target.value)} /></Field>
      <Field label="Anexo (opcional)">
        {anexo ? (
          <div className="flex items-center justify-between rounded-xl border border-line bg-paper-raised px-3.5 py-3">
            <span className="truncate text-[13px] font-semibold">{anexo.nome}</span>
            <button type="button" onClick={() => setAnexo(null)} className="ml-2 flex-shrink-0 text-[12px] font-bold text-red">
              Remover
            </button>
          </div>
        ) : (
          <label className={`${inputCls} flex cursor-pointer items-center justify-center text-muted`}>
            Escolher arquivo (PDF, foto, doc — até 8MB)
            <input autoComplete="off" type="file" className="hidden" onChange={selecionarArquivo} />
          </label>
        )}
        {erroAnexo && <p className="mt-1 text-[11.5px] font-semibold text-red">{erroAnexo}</p>}
      </Field>
      <label className="flex items-center gap-2 text-[12.5px] font-semibold">
        <input autoComplete="off" type="checkbox" checked={aceitaEntregaPdf} onChange={(e) => setAceitaEntregaPdf(e.target.checked)} />
        Aceita entrega em PDF (o aluno poderá anexar o PDF feito)
      </label>
      <Button disabled={!titulo || !descricao || publicando || (!!materias.length && !materiaId)} onClick={publicar}>
        {publicando ? 'Publicando...' : 'Publicar para a turma'}
      </Button>
    </div>
  )
}

const MAX_FOTOS_POR_LOTE = 20
const MAX_MB_POR_FOTO = 3

function FormFoto({ turmaId, autor, onDone }: { turmaId: string; autor: string; onDone: () => void }) {
  const [legenda, setLegenda] = useState('')
  const [fotos, setFotos] = useState<Anexo[]>([])
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [publicando, setPublicando] = useState(false)

  async function selecionar(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setErro('')
    const espacoRestante = MAX_FOTOS_POR_LOTE - fotos.length
    if (files.length > espacoRestante) {
      setErro(`Você pode publicar no máximo ${MAX_FOTOS_POR_LOTE} fotos por vez.`)
    }
    const lidas: Anexo[] = []
    for (const file of files.slice(0, espacoRestante)) {
      if (file.size > MAX_MB_POR_FOTO * 1024 * 1024) {
        setErro(`"${file.name}" é maior que ${MAX_MB_POR_FOTO}MB e foi ignorada.`)
        continue
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      lidas.push({ nome: file.name, tipo: file.type, dataUrl })
    }
    setFotos((prev) => [...prev, ...lidas])
  }

  function remover(idx: number) {
    setFotos((prev) => prev.filter((_, i) => i !== idx))
  }

  async function publicar() {
    if (!fotos.length) return
    setPublicando(true)
    try {
      await api.post('/fotos', {
        turmaId,
        autor,
        legenda,
        fotos: fotos.map((f) => ({ fotoNome: f.nome, fotoTipo: f.tipo, fotoDataUrl: f.dataUrl })),
      })
      setOk(true)
      setTimeout(onDone, 1200)
    } finally {
      setPublicando(false)
    }
  }

  if (ok) return <Sucesso>Fotos publicadas no mural da turma — sua publicação de fotos anterior foi substituída.</Sucesso>

  return (
    <div className="flex flex-col gap-3">
      <Field label={`Fotos da turma (até ${MAX_FOTOS_POR_LOTE} — publicar substitui sua publicação de fotos anterior)`}>
        <label className={`flex cursor-pointer items-center justify-center rounded-xl border border-line bg-paper-raised px-3.5 py-3 text-center text-[13.5px] text-muted ${fotos.length >= MAX_FOTOS_POR_LOTE ? 'opacity-50' : ''}`}>
          Escolher fotos
          <input
            autoComplete="off"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={selecionar}
            disabled={fotos.length >= MAX_FOTOS_POR_LOTE}
          />
        </label>
        {erro && <p className="mt-1 text-[11.5px] font-semibold text-red">{erro}</p>}
        {!!fotos.length && (
          <div className="mt-2 flex flex-wrap gap-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative h-16 w-16 flex-shrink-0">
                <img src={f.dataUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => remover(i)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red text-[11px] font-bold text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>
      <Field label="Legenda"><input autoComplete="off" className={inputCls} value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Ex: Brincadeira no parque" /></Field>
      <Button disabled={!legenda || !fotos.length || publicando} onClick={publicar}>
        {publicando ? 'Publicando...' : `Publicar ${fotos.length} foto${fotos.length === 1 ? '' : 's'} no mural`}
      </Button>
    </div>
  )
}

function FormAviso({ turmaId, autor, onDone }: { turmaId: string; autor: string; onDone: () => void }) {
  const [texto, setTexto] = useState('')
  const [ok, setOk] = useState(false)

  async function publicar() {
    await api.post('/avisos', { turmaId, autor, texto })
    setOk(true)
    setTimeout(onDone, 1200)
  }

  if (ok) return <Sucesso>Aviso publicado no mural da turma.</Sucesso>

  return (
    <div className="flex flex-col gap-3">
      <Field label="Mensagem"><textarea autoComplete="off" className={inputCls} rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex: Passeio confirmado para sexta-feira" /></Field>
      <Button disabled={!texto} onClick={publicar}>Publicar aviso</Button>
    </div>
  )
}

function FormOcorrencia({ turmaId, alunos, autor, onDone }: { turmaId: string; alunos: Aluno[]; autor: string; onDone: () => void }) {
  const [alunoId, setAlunoId] = useState(alunos[0]?.id ?? '')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function registrar() {
    setEnviando(true)
    try {
      await api.post('/ocorrencias-gerais', { alunoId, turmaId, titulo, descricao, registradoPor: autor })
      setOk(true)
      setTimeout(onDone, 1200)
    } finally {
      setEnviando(false)
    }
  }

  if (ok) return <Sucesso>Enviada para aprovação da coordenação — os pais só veem depois de aprovada.</Sucesso>

  return (
    <div className="flex flex-col gap-3">
      <Field label="Aluno">
        <select className={inputCls} value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </Field>
      <Field label="Título"><input autoComplete="off" className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: não trouxe o material, briga no recreio" /></Field>
      <Field label="Descrição"><textarea autoComplete="off" className={inputCls} rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que aconteceu" /></Field>
      <Button disabled={!alunoId || !titulo || !descricao || enviando} onClick={registrar}>
        {enviando ? 'Enviando...' : 'Enviar para aprovação da coordenação'}
      </Button>
    </div>
  )
}
