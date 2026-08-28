import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno, Ocorrencia, Rotina, Turma } from '../../types'
import { Button, Card, CategoriaChip, Pill, SectionLabel, timeAgo } from '../../components/ui'
import { IconCross, IconArrowLeft } from '../../components/Icons'
import { inputCls } from '../shared/formHelpers'
import { TabGroup, type TabOption } from '../../components/TabGroup'

type Tab = 'rotina' | 'saude'

const TABS: TabOption<Tab>[] = [
  { key: 'saude', label: 'Saúde' },
  { key: 'rotina', label: 'Rotina' },
]

export default function AlunoDetalhe() {
  const { alunoId } = useParams()
  const { data: aluno } = usePolling<Aluno>(async () => api.get(`/alunos/${alunoId}`), 30000, [alunoId])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const [tab, setTab] = useState<Tab>('saude')

  if (!aluno) return null

  const turma = turmas?.find((t) => t.id === aluno.turmaId)
  const ehFundamental = turma?.segmento === 'fundamental_1' || turma?.segmento === 'fundamental_2'

  return (
    <div className="flex flex-col gap-4">
      <Link to="/professor/turma" className="flex items-center gap-1 text-[12px] font-bold text-muted">
        <IconArrowLeft className="h-4 w-4" /> Turma
      </Link>
      <div className="font-display text-lg font-bold">{aluno.nome}</div>

      {!ehFundamental && <TabGroup tabs={TABS} value={tab} onChange={setTab} />}

      {(ehFundamental || tab === 'saude') && <SaudeProfessor alunoId={aluno.id} />}
      {!ehFundamental && tab === 'rotina' && <RotinaProfessor alunoId={aluno.id} />}
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  comeu_bem: 'Comeu bem', comeu_pouco: 'Comeu pouco', nao_quis: 'Não quis comer', nao_oferecido: 'Não foi oferecido',
}

function RotinaProfessor({ alunoId }: { alunoId: string }) {
  const hoje = new Date().toISOString().slice(0, 10)
  const { data } = usePolling<Rotina[]>(async () => api.get(`/rotinas${qs({ alunoId, data: hoje })}`), 10000, [alunoId])
  const rotina = data?.[0]
  if (!rotina) return <p className="text-[12.5px] text-muted">Ainda não registrada hoje — use "Postar → Rotina do dia".</p>
  return (
    <div className="flex flex-col gap-2.5">
      <Card><SectionLabel>Lanche da manhã</SectionLabel><p className="mt-1 text-[13px]">{rotina.lancheManha ? STATUS_LABEL[rotina.lancheManha.status] : 'Não registrado'}</p></Card>
      <Card><SectionLabel>Almoço</SectionLabel><p className="mt-1 text-[13px]">{rotina.almoco ? STATUS_LABEL[rotina.almoco.status] : 'Não registrado'}</p></Card>
      <Card><SectionLabel>Lanche da tarde</SectionLabel><p className="mt-1 text-[13px]">{rotina.lancheTarde ? STATUS_LABEL[rotina.lancheTarde.status] : 'Não registrado'}</p></Card>
      <Card>
        <SectionLabel>Sono</SectionLabel>
        <p className="mt-1 text-[13px]">
          {!rotina.sono?.dormiuAs && 'Ainda não dormiu'}
          {rotina.sono?.dormiuAs && !rotina.sono.acordouAs && `Dormiu às ${rotina.sono.dormiuAs}`}
          {rotina.sono?.dormiuAs && rotina.sono.acordouAs && `Dormiu às ${rotina.sono.dormiuAs} · Acordou às ${rotina.sono.acordouAs}`}
        </p>
      </Card>
      <Card><SectionLabel>Higiene</SectionLabel><p className="mt-1 text-[13px]">{rotina.higienizacoes.length} registro(s) hoje</p></Card>
    </div>
  )
}

function SaudeProfessor({ alunoId }: { alunoId: string }) {
  const { nomeAutor } = useSession()
  const { data: ocorrencias, reload } = usePolling<Ocorrencia[]>(async () => api.get(`/ocorrencias${qs({ alunoId })}`), 4000, [alunoId])
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [gravidade, setGravidade] = useState<'leve' | 'moderada' | 'grave'>('leve')
  const [enviando, setEnviando] = useState(false)

  const ativas = ocorrencias?.filter((o) => o.estado !== 'resolvida') ?? []

  async function registrar() {
    setEnviando(true)
    try {
      await api.post('/ocorrencias', { alunoId, tipo, descricao, gravidade, registradoPor: nomeAutor })
      setTipo('')
      setDescricao('')
      setAberto(false)
      reload()
    } finally {
      setEnviando(false)
    }
  }

  async function marcarRetorno(id: string) {
    await api.patch(`/ocorrencias/${id}/resolver`)
    reload()
  }

  return (
    <div className="flex flex-col gap-3">
      <CategoriaChip categoria="saude" icon={IconCross}>Saúde</CategoriaChip>
      {ativas.map((ativa) => (
        <Card key={ativa.id} accent="saude">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold">{ativa.tipo}</span>
            {ativa.estado === 'aguardando_liberacao' && <Pill tone="amber" dot>Aguardando liberação da coordenação</Pill>}
            {ativa.estado === 'aguardando_resposta' && <Pill tone="red" dot>Aguardando pai</Pill>}
            {ativa.estado === 'escalonada' && <Pill tone="red" dot>Com a coordenação</Pill>}
            {ativa.estado === 'indo_buscar' && <Pill tone="red" dot>Responsável vai buscar</Pill>}
            {(ativa.estado === 'ciente' || ativa.estado === 'medicacao_autorizada') && <Pill tone="red" dot>Pai respondeu</Pill>}
          </div>
          <p className="mt-1 text-[12.5px] text-muted">{ativa.descricao}</p>
          {ativa.estado === 'indo_buscar' && (
            <p className="mt-1 text-[11.5px] font-semibold text-red">
              Chega às {ativa.previsaoChegada}
              {ativa.medicarAteChegada && ` · medicar até chegar: ${ativa.medicacaoNome} — ${ativa.medicacaoDosagem}`}
            </p>
          )}
          <Button className="mt-3" variant="secondary" onClick={() => marcarRetorno(ativa.id)}>
            {ativa.estado === 'indo_buscar' ? 'Responsável retirou o aluno — marcar resolvida' : 'Aluno retornou à sala — marcar resolvida'}
          </Button>
        </Card>
      ))}
      {!aberto ? (
        <Button onClick={() => setAberto(true)}>Registrar ocorrência de saúde</Button>
      ) : (
        <Card>
          <div className="flex flex-col gap-2.5">
            <input autoComplete="off" className={inputCls} placeholder="Tipo (ex: dor de cabeça, febre, queda)" value={tipo} onChange={(e) => setTipo(e.target.value)} />
            <textarea autoComplete="off" className={inputCls} rows={3} placeholder="Descrição do ocorrido" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            <div className="flex gap-2">
              {(['leve', 'moderada', 'grave'] as const).map((g) => (
                <button key={g} onClick={() => setGravidade(g)} className={`flex-1 rounded-lg py-2 text-[12px] font-bold capitalize ${gravidade === g ? 'bg-blue text-white' : 'bg-paper-sunken text-muted'}`}>
                  {g}
                </button>
              ))}
            </div>
            <Button disabled={!tipo || !descricao || enviando} onClick={registrar}>
              {enviando ? 'Enviando...' : 'Notificar o responsável agora'}
            </Button>
          </div>
        </Card>
      )}

      {!!ocorrencias?.filter((o) => o.estado === 'resolvida').length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Histórico</SectionLabel>
          {ocorrencias.filter((o) => o.estado === 'resolvida').map((o) => (
            <Card key={o.id} accent="saude">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold">{o.tipo}</span>
                <Pill tone="green">Resolvida</Pill>
              </div>
              <p className="mt-1 text-[11px] text-faint">{timeAgo(o.registradoEm)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
