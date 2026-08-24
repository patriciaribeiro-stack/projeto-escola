import { useState } from 'react'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { Aluno, Atendimento, Pai, Turma } from '../../types'
import { Button, Card, EmptyState, Pill, SectionLabel, formatDateBR } from '../../components/ui'
import { inputCls, Field } from '../shared/formHelpers'
import { Gravador } from '../../components/Gravador'

function imprimirAtendimento(atendimento: Atendimento, alunoNome: string, paiNome: string) {
  const janela = window.open('', '_blank')
  if (!janela) return
  const assinaturaHtml = atendimento.assinaturaDataUrl
    ? `<img src="${atendimento.assinaturaDataUrl}" style="height:70px" /><p class="meta">Assinado digitalmente em ${atendimento.assinadoEm ? new Date(atendimento.assinadoEm).toLocaleString('pt-BR') : ''}</p>`
    : `<div style="margin-top:40px; border-top:1px solid #333; width:280px;"></div><p class="meta">Assinatura de ${paiNome}</p>`
  janela.document.write(`<!doctype html>
<html><head><meta charset="utf-8" /><title>Relatório de atendimento — ${alunoNome}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2b26; padding: 32px; }
  .cabecalho { border-bottom: 3px solid #1B7A68; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { font-size: 20px; margin: 0; }
  .meta { color: #667; font-size: 12.5px; margin-top: 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #5c655f; margin: 22px 0 6px; }
  p { font-size: 13.5px; line-height: 1.6; white-space: pre-line; }
</style></head>
<body>
  <div class="cabecalho">
    <h1>Relatório de atendimento</h1>
    <p class="meta">${alunoNome} · Responsável: ${paiNome} · ${formatDateBR(atendimento.data)}</p>
    <p class="meta">Atendido por ${atendimento.coordenadoraNome}</p>
  </div>
  <h2>Resumo da conversa</h2>
  <p>${atendimento.resumo || '(sem resumo registrado)'}</p>
  <h2>Assinatura do responsável</h2>
  ${assinaturaHtml}
</body></html>`)
  janela.document.close()
  janela.focus()
  janela.print()
}

export default function Atendimentos() {
  const { session } = useSession()
  const [criando, setCriando] = useState(false)
  const { data: atendimentos, reload } = usePolling<Atendimento[]>(async () => api.get('/atendimentos'), 8000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const { data: pais } = usePolling<Pai[]>(async () => api.get('/pais'), 60000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])

  const nomeAluno = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'
  const nomePai = (id: string) => pais?.find((p) => p.id === id)?.nome ?? '...'

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setCriando((v) => !v)}>{criando ? 'Cancelar' : '+ Novo atendimento'}</Button>

      {criando && (
        <NovoAtendimento
          alunos={alunos ?? []}
          pais={pais ?? []}
          turmas={turmas ?? []}
          coordenadoraId={session?.personaId ?? ''}
          coordenadoraNome={session?.nome ?? ''}
          onCriado={() => { setCriando(false); reload() }}
        />
      )}

      <SectionLabel>Atendimentos registrados</SectionLabel>
      {!atendimentos?.length && <EmptyState>Nenhum atendimento registrado ainda.</EmptyState>}
      <div className="flex flex-col gap-2.5">
        {atendimentos?.map((a) => (
          <AtendimentoCard
            key={a.id}
            atendimento={a}
            alunoNome={nomeAluno(a.alunoId)}
            paiNome={nomePai(a.paiId)}
            onReload={reload}
          />
        ))}
      </div>
    </div>
  )
}

function NovoAtendimento({ alunos, pais, turmas, coordenadoraId, coordenadoraNome, onCriado }: {
  alunos: Aluno[]
  pais: Pai[]
  turmas: Turma[]
  coordenadoraId: string
  coordenadoraNome: string
  onCriado: () => void
}) {
  const [turmaId, setTurmaId] = useState('')
  const [alunoId, setAlunoId] = useState('')
  const [paiId, setPaiId] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null)
  const [transcricao, setTranscricao] = useState('')
  const [resumo, setResumo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const alunosDaTurma = turmaId ? alunos.filter((a) => a.turmaId === turmaId) : alunos
  const paisDoAluno = alunoId ? pais.filter((p) => p.alunoIds.includes(alunoId)) : []

  function selecionarAluno(id: string) {
    setAlunoId(id)
    const responsaveis = pais.filter((p) => p.alunoIds.includes(id))
    setPaiId(responsaveis[0]?.id ?? '')
  }

  async function salvar() {
    setSalvando(true)
    try {
      await api.post('/atendimentos', {
        alunoId, paiId, coordenadoraId, coordenadoraNome, data,
        audioDataUrl, audioNome: audioDataUrl ? 'atendimento.webm' : null, audioTipo: audioDataUrl ? 'audio/webm' : null,
        transcricao: transcricao || null, resumo: resumo || null,
      })
      onCriado()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <SectionLabel>Novo atendimento</SectionLabel>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Turma">
          <select className={inputCls} value={turmaId} onChange={(e) => { setTurmaId(e.target.value); setAlunoId(''); setPaiId('') }}>
            <option value="">Todas</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </Field>
        <Field label="Data">
          <input autoComplete="off" type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
        </Field>
      </div>

      <Field label="Aluno">
        <select className={inputCls} value={alunoId} onChange={(e) => selecionarAluno(e.target.value)}>
          <option value="">Selecione o aluno</option>
          {alunosDaTurma.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </Field>

      {!!alunoId && (
        <Field label="Responsável presente na conversa">
          {!paisDoAluno.length ? (
            <p className="text-[12px] text-amber">Esse aluno não tem responsável cadastrado com acesso ao app.</p>
          ) : (
            <select className={inputCls} value={paiId} onChange={(e) => setPaiId(e.target.value)}>
              {paisDoAluno.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
        </Field>
      )}

      <Field label="Gravação">
        <Gravador
          audioDataUrl={audioDataUrl}
          onAudioChange={setAudioDataUrl}
          transcricao={transcricao}
          onTranscricaoChange={setTranscricao}
        />
      </Field>

      {!!transcricao && (
        <Field label="Transcrição (editável)">
          <textarea autoComplete="off" className={inputCls} rows={4} value={transcricao} onChange={(e) => setTranscricao(e.target.value)} />
        </Field>
      )}

      <Field label="Resumo do atendimento">
        <textarea
          autoComplete="off"
          className={inputCls}
          rows={5}
          placeholder="Escreva o resumo da conversa — o que foi conversado, encaminhamentos combinados..."
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
        />
      </Field>
      <div className="-mt-1.5 flex items-center gap-2.5">
        {!!transcricao && (
          <button type="button" onClick={() => setResumo(transcricao)} className="text-[11.5px] font-bold text-blue">
            Usar transcrição como base
          </button>
        )}
        <span className="text-[11px] text-faint">Resumo automático por IA em breve</span>
      </div>

      <Button disabled={!alunoId || !paiId || !resumo || salvando} onClick={salvar}>
        {salvando ? 'Salvando...' : 'Salvar rascunho'}
      </Button>
    </Card>
  )
}

const ESTADO_LABEL: Record<Atendimento['estado'], { texto: string; tone: 'muted' | 'amber' | 'green' }> = {
  rascunho: { texto: 'Rascunho', tone: 'muted' },
  aguardando_assinatura: { texto: 'Aguardando assinatura', tone: 'amber' },
  assinado: { texto: 'Assinado', tone: 'green' },
}

function AtendimentoCard({ atendimento, alunoNome, paiNome, onReload }: {
  atendimento: Atendimento
  alunoNome: string
  paiNome: string
  onReload: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const [resumo, setResumo] = useState(atendimento.resumo ?? '')
  const [enviando, setEnviando] = useState(false)
  const estadoInfo = ESTADO_LABEL[atendimento.estado]

  async function salvarEdicao() {
    await api.patch(`/atendimentos/${atendimento.id}`, { resumo })
    onReload()
  }

  async function enviarParaAssinatura() {
    setEnviando(true)
    try {
      await salvarEdicao()
      await api.patch(`/atendimentos/${atendimento.id}/enviar-para-assinatura`, {})
      onReload()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setAberto((v) => !v)}>
        <div>
          <div className="text-[13px] font-bold">{alunoNome}</div>
          <div className="text-[11.5px] text-faint">{formatDateBR(atendimento.data)} · Responsável: {paiNome}</div>
        </div>
        <Pill tone={estadoInfo.tone}>{estadoInfo.texto}</Pill>
      </button>

      {aberto && (
        <div className="mt-3 flex flex-col gap-2.5 border-t border-line pt-3">
          {atendimento.audioDataUrl && <audio controls src={atendimento.audioDataUrl} className="w-full" />}

          {atendimento.estado === 'rascunho' ? (
            <Field label="Resumo do atendimento">
              <textarea autoComplete="off" className={inputCls} rows={5} value={resumo} onChange={(e) => setResumo(e.target.value)} onBlur={salvarEdicao} />
            </Field>
          ) : (
            <div>
              <SectionLabel>Resumo</SectionLabel>
              <p className="mt-1 whitespace-pre-line text-[13px]">{atendimento.resumo}</p>
            </div>
          )}

          {atendimento.transcricao && (
            <details>
              <summary className="cursor-pointer text-[11.5px] font-bold text-blue">Ver transcrição completa</summary>
              <p className="mt-1.5 whitespace-pre-line text-[12.5px] text-muted">{atendimento.transcricao}</p>
            </details>
          )}

          {atendimento.estado === 'assinado' && atendimento.assinaturaDataUrl && (
            <div>
              <SectionLabel>Assinatura do responsável</SectionLabel>
              <img src={atendimento.assinaturaDataUrl} alt="Assinatura" className="mt-1 h-16" />
              <p className="mt-1 text-[11px] text-faint">
                Assinado em {atendimento.assinadoEm ? new Date(atendimento.assinadoEm).toLocaleString('pt-BR') : ''}
              </p>
            </div>
          )}

          {atendimento.estado === 'aguardando_assinatura' && (
            <p className="text-[12px] font-semibold text-amber">Esperando o responsável assinar pelo portal da família.</p>
          )}

          <div className="flex gap-2">
            {atendimento.estado === 'rascunho' && (
              <Button className="flex-1" disabled={!resumo || enviando} onClick={enviarParaAssinatura}>
                {enviando ? 'Enviando...' : 'Enviar para assinatura'}
              </Button>
            )}
            <Button variant="secondary" className="flex-1" onClick={() => imprimirAtendimento(atendimento, alunoNome, paiNome)}>
              Imprimir
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
