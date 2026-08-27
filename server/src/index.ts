import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import webpush from 'web-push'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { nanoid } from 'nanoid'
import { loadDb } from './db.ts'
import type { Role, LicaoEstado, OcorrenciaEstado, SessaoAtiva, VisitaStatus, AtividadeAvaliativa, PushSubscricao, MedicacaoAgendada, Atendimento, ProvaTrimestral } from './types.ts'

declare global {
  namespace Express {
    interface Request {
      sessao?: SessaoAtiva
    }
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const id = () => nanoid(10)
const now = () => new Date().toISOString()
const gerarToken = () => nanoid(24)
const gerarCodigoAcesso = () => String(Math.floor(100000 + Math.random() * 900000))

function semSenha<T extends { senhaHash?: string | null }>(item: T) {
  const { senhaHash, ...resto } = item
  return resto
}

// Prazo até a coordenação ser avisada automaticamente se ninguém responder.
const LEMBRETE_MS = 5 * 60_000
const ESCALONA_MS = 10 * 60_000

const db = await loadDb()

if (!db.data.vapid) {
  db.data.vapid = webpush.generateVAPIDKeys()
  await db.write()
}
webpush.setVapidDetails('mailto:contato@colegiovitalbrazil.com.br', db.data.vapid.publicKey, db.data.vapid.privateKey)

async function enviarParaLista(subs: PushSubscricao[], payload: { titulo: string; corpo: string; url?: string }) {
  if (!subs.length) return
  const body = JSON.stringify(payload)
  let mudou = false
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body)
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        db.data.pushSubscricoes = db.data.pushSubscricoes.filter((x) => x.id !== s.id)
        mudou = true
      }
    }
  }
  if (mudou) await db.write()
}

async function enviarPushPara(role: Role, personaId: string, payload: { titulo: string; corpo: string; url?: string }) {
  await enviarParaLista(db.data.pushSubscricoes.filter((s) => s.role === role && s.personaId === personaId), payload)
}

async function enviarPushParaPapel(role: Role, payload: { titulo: string; corpo: string; url?: string }) {
  await enviarParaLista(db.data.pushSubscricoes.filter((s) => s.role === role), payload)
}

function paisDoAluno(alunoId: string) {
  return db.data.pais.filter((p) => p.alunoIds.includes(alunoId))
}

async function enviarPushParaPaisDoAluno(alunoId: string, payload: { titulo: string; corpo: string; url?: string }) {
  for (const pai of paisDoAluno(alunoId)) {
    await enviarPushPara('pai', pai.id, payload)
  }
}

async function enviarPushParaPaisDaTurma(turmaId: string, payload: { titulo: string; corpo: string; url?: string }) {
  const alunosDaTurma = db.data.alunos.filter((a) => a.turmaId === turmaId)
  const paisJaAvisados = new Set<string>()
  for (const aluno of alunosDaTurma) {
    for (const pai of paisDoAluno(aluno.id)) {
      if (paisJaAvisados.has(pai.id)) continue
      paisJaAvisados.add(pai.id)
      await enviarPushPara('pai', pai.id, payload)
    }
  }
}

async function enviarPushParaProfessoresDaTurma(turmaId: string, payload: { titulo: string; corpo: string; url?: string }) {
  for (const professor of db.data.professores.filter((p) => p.turmaIds.includes(turmaId))) {
    await enviarPushPara('professor', professor.id, payload)
  }
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '60mb' }))

const send404 = (res: express.Response) => res.status(404).json({ erro: 'não encontrado' })

function personaBloqueada(role: Role, personaId: string): boolean {
  if (role === 'professor') return !!db.data.professores.find((p) => p.id === personaId)?.bloqueadoEm
  if (role === 'coordenacao') return !!db.data.coordenadores.find((p) => p.id === personaId)?.bloqueadoEm
  if (role === 'secretaria') return !!db.data.secretarios.find((p) => p.id === personaId)?.bloqueadoEm
  if (role === 'recepcao') return !!db.data.recepcionistas.find((p) => p.id === personaId)?.bloqueadoEm
  if (role === 'integral') return !!db.data.monitoresIntegral.find((p) => p.id === personaId)?.bloqueadoEm
  if (role === 'substituto') return !!db.data.substitutos.find((p) => p.id === personaId)?.bloqueadoEm
  if (role === 'aluno') return !!db.data.alunos.find((p) => p.id === personaId)?.bloqueadoEm
  return false
}

// ---------- Autenticação ----------
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/sessions') || req.path.startsWith('/api/publico/')) return next()
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const sessao = token ? db.data.sessoesAtivas.find((s) => s.token === token) : undefined
  if (!sessao) return res.status(401).json({ erro: 'não autenticado' })
  if (personaBloqueada(sessao.role, sessao.personaId)) {
    return res.status(401).json({ erro: 'Este acesso foi bloqueado. Fale com a coordenação.' })
  }
  req.sessao = sessao
  next()
})

// ---------- Permissões por papel ----------
// Antes disso, qualquer sessão válida (inclusive de pai ou aluno) conseguia chamar
// qualquer rota de escrita da API — o app só escondia os botões errados na tela.
// Esse middleware bloqueia escrita (POST/PATCH/PUT/DELETE) fora do papel esperado.
// GET continua liberado pra qualquer sessão válida, como sempre foi.
function casamPadrao(padrao: string, caminho: string): Record<string, string> | null {
  const p = padrao.split('/').filter(Boolean)
  const c = caminho.split('/').filter(Boolean)
  if (p.length !== c.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i]!.startsWith(':')) params[p[i]!.slice(1)] = c[i]!
    else if (p[i] !== c[i]) return null
  }
  return params
}

type RegraPermissao = Role[] | ((req: express.Request, params: Record<string, string>) => boolean)

const TODOS_OS_PAPEIS: Role[] = ['pai', 'professor', 'coordenacao', 'secretaria', 'recepcao', 'integral', 'substituto', 'aluno']

const donoOuPapel = (papeis: Role[]) => (req: express.Request, params: Record<string, string>) =>
  papeis.includes(req.sessao!.role) || (req.sessao!.role === 'pai' && req.sessao!.personaId === params.id)

const PERMISSOES: Record<string, RegraPermissao> = {
  // Configuração de matrícula, calendário e livro didático — secretaria (calendário/config) e coordenação (livro didático)
  'PATCH /api/configuracao': ['secretaria'],
  'POST /api/turmas': ['secretaria'],
  'PATCH /api/turmas/:id': ['secretaria'],
  'DELETE /api/turmas/:id': ['secretaria'],
  'POST /api/materias': ['secretaria'],
  'DELETE /api/materias/:id': ['secretaria'],
  'POST /api/dias-nao-letivos': ['secretaria'],
  'DELETE /api/dias-nao-letivos/:id': ['secretaria'],
  'POST /api/unidades-livro': ['recepcao'],
  'DELETE /api/unidades-livro/:id': ['recepcao'],
  'POST /api/conteudos-dia': ['professor', 'substituto', 'coordenacao'],
  'DELETE /api/conteudos-dia/:id': ['professor', 'substituto', 'coordenacao'],

  // Cadastro de pessoas — exclusivo da secretaria, exceto o que é autoatendimento do próprio responsável
  'POST /api/alunos': ['secretaria'],
  'PATCH /api/alunos/:id': ['secretaria'],
  'PATCH /api/alunos/:id/acesso': ['secretaria'],
  'PATCH /api/alunos/:id/responsaveis': ['secretaria'],
  'POST /api/alunos/marcar-vistos': ['coordenacao'],
  'DELETE /api/alunos/:id': ['secretaria'],
  'POST /api/pais': ['secretaria'],
  'PATCH /api/pais/:id': donoOuPapel(['secretaria']),
  'PATCH /api/pais/:id/consentimento': donoOuPapel(['secretaria']),
  'DELETE /api/pais/:id': ['secretaria'],

  // Equipe — cadastro é da secretaria; coordenação só atribui o substituto do dia
  'POST /api/professores': ['secretaria'],
  'PATCH /api/professores/:id': ['secretaria'],
  'DELETE /api/professores/:id': ['secretaria'],
  'POST /api/coordenadores': ['secretaria'],
  'PATCH /api/coordenadores/:id': ['secretaria'],
  'DELETE /api/coordenadores/:id': ['secretaria'],
  'POST /api/secretarios': ['secretaria'],
  'PATCH /api/secretarios/:id': ['secretaria'],
  'DELETE /api/secretarios/:id': ['secretaria'],
  'POST /api/recepcionistas': ['secretaria'],
  'PATCH /api/recepcionistas/:id': ['secretaria'],
  'DELETE /api/recepcionistas/:id': ['secretaria'],
  'POST /api/monitores-integral': ['secretaria'],
  'PATCH /api/monitores-integral/:id': ['secretaria'],
  'DELETE /api/monitores-integral/:id': ['secretaria'],
  'POST /api/substitutos': ['secretaria'],
  'PATCH /api/substitutos/:id': ['secretaria', 'coordenacao'],
  'DELETE /api/substitutos/:id': ['secretaria'],

  // Semanário — professor escreve e envia, coordenação avalia
  'POST /api/semanarios': ['professor'],
  'PATCH /api/semanarios/:id': ['professor'],
  'DELETE /api/semanarios/:id': ['professor'],
  'PATCH /api/semanarios/:id/enviar': ['professor'],
  'PATCH /api/semanarios/:id/aprovar': ['coordenacao'],
  'PATCH /api/semanarios/:id/solicitar-alteracao': ['coordenacao'],

  // Mural da turma — quem dá aula posta (professor, substituto, coordenação)
  'POST /api/avisos': ['professor', 'substituto', 'coordenacao'],
  'PATCH /api/avisos/:id': ['professor', 'substituto', 'coordenacao'],
  'POST /api/fotos': ['professor', 'substituto', 'coordenacao'],
  'DELETE /api/fotos/:publicacaoId': ['professor', 'substituto', 'coordenacao'],

  // Rotina do dia (refeição, sono, higiene, aulas) — sala de aula e integral
  'PATCH /api/rotinas/refeicao': ['professor', 'substituto', 'coordenacao', 'integral'],
  'POST /api/rotinas/refeicao/bulk': ['professor', 'substituto', 'coordenacao', 'integral'],
  'PATCH /api/rotinas/sono/dormiu': ['professor', 'substituto', 'coordenacao', 'integral'],
  'PATCH /api/rotinas/sono/acordou': ['professor', 'substituto', 'coordenacao', 'integral'],
  'POST /api/rotinas/higienizacao': ['professor', 'substituto', 'coordenacao', 'integral'],
  'PATCH /api/rotinas/aulas': ['professor', 'substituto', 'coordenacao', 'integral'],
  'POST /api/rotinas/aulas/bulk': ['professor', 'substituto', 'coordenacao', 'integral'],

  // Lição de casa — quem dá aula cria/edita; a entrega é do responsável; observação do integral é do integral
  'POST /api/licoes': ['professor', 'substituto', 'coordenacao'],
  'PATCH /api/licoes/:id': ['professor', 'substituto', 'coordenacao'],
  'DELETE /api/licoes/:id': ['professor', 'substituto', 'coordenacao'],
  'PATCH /api/licao-status/:id': ['professor', 'substituto', 'coordenacao', 'integral'],
  'PATCH /api/licao-status/:id/observacao-integral': ['integral', 'professor'],
  'PATCH /api/licao-status/:id/entrega': ['pai'],

  // Ocorrências de saúde — sala de aula registra, coordenação libera/avalia, família responde
  'POST /api/ocorrencias': ['professor', 'substituto', 'coordenacao'],
  'POST /api/ocorrencias/marcar-vistas': ['coordenacao'],
  'PATCH /api/ocorrencias/:id/liberar': ['coordenacao'],
  'PATCH /api/ocorrencias/:id/rejeitar': ['coordenacao'],
  'PATCH /api/ocorrencias/:id/responder': ['pai'],
  'PATCH /api/ocorrencias/:id/resolver': ['professor', 'substituto', 'coordenacao'],
  'PATCH /api/ocorrencias/:id/perguntar-evolucao': ['pai'],
  'PATCH /api/ocorrencias/:id/responder-evolucao': ['coordenacao'],
  'PATCH /api/ocorrencias/:id/marcar-evolucao-vista': ['pai'],
  'PATCH /api/ocorrencias/:id/atestado': ['pai'],
  'DELETE /api/ocorrencias/:id': ['coordenacao'],

  // Ocorrências gerais (comportamento) — sala de aula registra, coordenação aprova, família toma ciência
  'POST /api/ocorrencias-gerais': ['professor', 'substituto', 'coordenacao'],
  'PATCH /api/ocorrencias-gerais/:id/ciente': ['pai'],
  'POST /api/ocorrencias-gerais/marcar-vistas': ['coordenacao'],
  'PATCH /api/ocorrencias-gerais/:id/aprovar': ['coordenacao'],
  'PATCH /api/ocorrencias-gerais/:id/rejeitar': ['coordenacao'],
  'DELETE /api/ocorrencias-gerais/:id': ['coordenacao'],

  // Medicação agendada — responsável envia, recepção administra e vê, coordenação acompanha
  'POST /api/medicacoes': ['pai'],
  'PATCH /api/medicacoes/:id': ['pai', 'recepcao'],
  'DELETE /api/medicacoes/:id': ['pai'],
  'POST /api/medicacoes/:id/administrar': ['recepcao'],
  'POST /api/medicacoes/marcar-vistas': ['coordenacao', 'recepcao'],

  // Saída antecipada e atestado — pedido do responsável
  'POST /api/saidas-antecipadas': ['pai'],
  'DELETE /api/saidas-antecipadas/:id': ['pai'],
  'POST /api/atestados': ['pai'],
  'POST /api/atestados/marcar-vistos': ['coordenacao'],

  // Visitas agendadas pelo site público — recepção administra
  'PATCH /api/visitas/:id': ['recepcao'],

  // Atividades avaliativas (provas) — quem dá aula agenda, coordenação libera, recepção imprime
  'POST /api/atividades-avaliativas': ['professor', 'substituto', 'coordenacao'],
  'DELETE /api/atividades-avaliativas/:id': ['professor', 'substituto', 'coordenacao'],
  'POST /api/atividades-avaliativas/marcar-vistas': ['coordenacao'],
  'PATCH /api/atividades-avaliativas/:id/liberar-impressao': ['coordenacao'],
  'PATCH /api/atividades-avaliativas/:id/marcar-impressa': ['recepcao'],

  // Provas trimestrais — coordenação monta o calendário, quem dá aula anexa o arquivo,
  // coordenação aprova/pede alteração, recepção marca como impressa. Nunca chega pros pais.
  'POST /api/provas-trimestrais': ['coordenacao'],
  'DELETE /api/provas-trimestrais/:id': ['coordenacao'],
  'PATCH /api/provas-trimestrais/:id/anexar': ['professor', 'substituto', 'coordenacao'],
  'PATCH /api/provas-trimestrais/:id/aprovar': ['coordenacao'],
  'PATCH /api/provas-trimestrais/:id/solicitar-alteracao': ['coordenacao'],
  'PATCH /api/provas-trimestrais/:id/marcar-impressa': ['recepcao'],

  // Atendimentos — só a coordenação registra; assinar é exclusivo do responsável dono do atendimento
  'POST /api/atendimentos': ['coordenacao'],
  'PATCH /api/atendimentos/:id': ['coordenacao'],
  'PATCH /api/atendimentos/:id/enviar-para-assinatura': ['coordenacao'],
  'PATCH /api/atendimentos/:id/assinar': (req, params) => {
    const atendimento = db.data.atendimentos.find((x) => x.id === params.id)
    return !!atendimento && req.sessao!.role === 'pai' && atendimento.paiId === req.sessao!.personaId
  },
  'DELETE /api/atendimentos/:id': ['coordenacao'],

  // Eventos — coordenação organiza, família confirma presença/termo, coordenação baixa pagamento
  'POST /api/eventos': ['coordenacao'],
  'PATCH /api/eventos/:id': ['coordenacao'],
  'PATCH /api/evento-respostas/:id/presenca': ['pai'],
  'PATCH /api/evento-respostas/:id/termo': ['pai'],
  'PATCH /api/evento-respostas/:id/pagamento': ['coordenacao'],

  // Achados e perdidos — família reporta, coordenação baixa como encontrado
  'POST /api/achados': ['pai'],
  'PATCH /api/achados/:id': ['coordenacao'],

  // Cardápio do almoço — secretaria e recepção
  'POST /api/cardapio': ['secretaria', 'recepcao'],
  'DELETE /api/cardapio/:id': ['secretaria', 'recepcao'],

  // Presença e relatórios de turma — quem dá aula
  'POST /api/presencas/bulk': ['professor', 'substituto'],
  'POST /api/relatorios': ['professor', 'substituto', 'coordenacao'],

  // Notificações push — qualquer sessão autenticada pode ativar/desativar no próprio aparelho
  'POST /api/push/inscrever': TODOS_OS_PAPEIS,
  'POST /api/push/desinscrever': TODOS_OS_PAPEIS,
}

app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/sessions') || req.path.startsWith('/api/publico/')) return next()
  if (req.method === 'GET') return next()
  for (const chave of Object.keys(PERMISSOES)) {
    const espaco = chave.indexOf(' ')
    const metodo = chave.slice(0, espaco)
    const padrao = chave.slice(espaco + 1)
    if (metodo !== req.method) continue
    const params = casamPadrao(padrao, req.path)
    if (!params) continue
    const regra = PERMISSOES[chave]!
    const liberado = typeof regra === 'function' ? regra(req, params) : regra.includes(req.sessao!.role)
    if (!liberado) return res.status(403).json({ erro: 'Esse acesso não tem permissão para essa ação.' })
    return next()
  }
  // Rota de escrita sem regra cadastrada: nega por padrão em vez de liberar por descuido.
  return res.status(403).json({ erro: 'Esse acesso não tem permissão para essa ação.' })
})

// ---------- Registro de atividades ----------
function resolverNomeDaSessao(sessao: SessaoAtiva): string {
  const busca = <T extends { id: string; nome: string }>(lista: T[]) => lista.find((p) => p.id === sessao.personaId)?.nome
  switch (sessao.role) {
    case 'professor': return busca(db.data.professores) ?? 'Professor(a)'
    case 'coordenacao': return busca(db.data.coordenadores) ?? 'Coordenação'
    case 'secretaria': return busca(db.data.secretarios) ?? 'Secretaria'
    case 'recepcao': return busca(db.data.recepcionistas) ?? 'Recepção'
    case 'integral': return busca(db.data.monitoresIntegral) ?? 'Monitor(a) do Integral'
    case 'substituto': return busca(db.data.substitutos) ?? 'Professor(a) eventual'
    case 'pai': return busca(db.data.pais) ?? 'Responsável'
    case 'aluno': return busca(db.data.alunos) ?? 'Aluno(a)'
  }
}

const ROTA_LABEL: Record<string, string> = {
  '/api/turmas': 'turma',
  '/api/turmas/:id': 'turma',
  '/api/materias': 'matéria',
  '/api/materias/:id': 'matéria',
  '/api/dias-nao-letivos': 'dia não letivo',
  '/api/dias-nao-letivos/:id': 'dia não letivo',
  '/api/unidades-livro': 'unidade do livro didático',
  '/api/unidades-livro/:id': 'unidade do livro didático',
  '/api/conteudos-dia': 'conteúdo do dia',
  '/api/conteudos-dia/:id': 'conteúdo do dia',
  '/api/alunos': 'aluno',
  '/api/alunos/:id': 'aluno',
  '/api/pais': 'responsável',
  '/api/pais/:id': 'responsável',
  '/api/professores': 'professor(a)',
  '/api/professores/:id': 'professor(a)',
  '/api/coordenadores': 'coordenador(a)',
  '/api/coordenadores/:id': 'coordenador(a)',
  '/api/secretarios': 'secretário(a)',
  '/api/secretarios/:id': 'secretário(a)',
  '/api/recepcionistas': 'recepcionista',
  '/api/recepcionistas/:id': 'recepcionista',
  '/api/monitores-integral': 'monitor(a) do integral',
  '/api/monitores-integral/:id': 'monitor(a) do integral',
  '/api/substitutos': 'professor(a) eventual',
  '/api/substitutos/:id': 'professor(a) eventual',
  '/api/semanarios': 'semanário',
  '/api/semanarios/:id': 'semanário',
  '/api/avisos': 'aviso',
  '/api/avisos/:id': 'aviso',
  '/api/licoes': 'lição de casa',
  '/api/licoes/:id': 'lição de casa',
  '/api/eventos': 'evento',
  '/api/eventos/:id': 'evento',
  '/api/achados': 'item de achados e perdidos',
  '/api/achados/:id': 'item de achados e perdidos',
  '/api/cardapio': 'cardápio',
  '/api/cardapio/:id': 'cardápio',
  '/api/relatorios': 'relatório',
  '/api/atestados': 'atestado',
  '/api/saidas-antecipadas': 'saída antecipada',
  '/api/saidas-antecipadas/:id': 'saída antecipada',
  '/api/atividades-avaliativas': 'atividade avaliativa',
  '/api/atividades-avaliativas/:id': 'atividade avaliativa',
  '/api/provas-trimestrais': 'prova trimestral',
  '/api/provas-trimestrais/:id': 'prova trimestral',
  '/api/atendimentos': 'atendimento',
  '/api/atendimentos/:id': 'atendimento',
  '/api/medicacoes': 'medicação',
  '/api/medicacoes/:id': 'medicação',
}

function extrairRotulo(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  const b = body as Record<string, unknown>
  const campo = b.titulo ?? b.nome ?? b.texto ?? b.tipo ?? b.descricao
  if (typeof campo !== 'string' || !campo) return ''
  return campo.length > 60 ? `${campo.slice(0, 57)}...` : campo
}

const RESUMOS_ESPECIFICOS: Record<string, (req: express.Request) => string> = {
  'PATCH /api/alunos/:id/acesso': () => 'Alterou o login do aluno',
  'PATCH /api/alunos/:id/responsaveis': () => 'Alterou os responsáveis do aluno',
  'POST /api/alunos/marcar-vistos': () => 'Marcou matrículas como vistas',
  'POST /api/atestados/marcar-vistos': () => 'Marcou atestados como vistos',
  'PATCH /api/pais/:id/consentimento': () => 'Registrou consentimento do responsável',
  'PATCH /api/semanarios/:id/enviar': () => 'Enviou o semanário para aprovação',
  'PATCH /api/semanarios/:id/aprovar': () => 'Aprovou o semanário',
  'PATCH /api/semanarios/:id/solicitar-alteracao': () => 'Solicitou alteração no semanário',
  'POST /api/fotos': (req) => `Publicou fotos da turma${req.body?.legenda ? `: "${req.body.legenda}"` : ''}`,
  'DELETE /api/fotos/:publicacaoId': () => 'Removeu publicação de fotos',
  'PATCH /api/rotinas/refeicao': (req) => `Registrou refeição (${req.body?.campo ?? 'refeição'})`,
  'POST /api/rotinas/refeicao/bulk': (req) => `Aplicou refeição (${req.body?.campo ?? 'refeição'}) pra toda a turma`,
  'PATCH /api/rotinas/sono/dormiu': () => 'Registrou horário de dormir',
  'PATCH /api/rotinas/sono/acordou': () => 'Registrou horário de acordar',
  'POST /api/rotinas/higienizacao': (req) => `Registrou higiene (${req.body?.tipo ?? ''})`,
  'PATCH /api/rotinas/aulas': () => 'Registrou aula do dia',
  'POST /api/rotinas/aulas/bulk': () => 'Registrou aula do dia pra toda a turma',
  'PATCH /api/licao-status/:id': () => 'Atualizou status de entrega da lição',
  'PATCH /api/licao-status/:id/entrega': () => 'Enviou entrega da lição de casa',
  'PATCH /api/licao-status/:id/observacao-integral': () => 'Registrou observação de lição feita no integral',
  'POST /api/ocorrencias': (req) => `Registrou ocorrência de saúde: "${req.body?.tipo ?? ''}"`,
  'PATCH /api/ocorrencias/:id/responder': () => 'Respondeu ocorrência de saúde',
  'POST /api/ocorrencias/marcar-vistas': () => 'Marcou ocorrências de saúde como vistas',
  'PATCH /api/ocorrencias/:id/resolver': () => 'Resolveu ocorrência de saúde',
  'PATCH /api/ocorrencias/:id/perguntar-evolucao': () => 'Perguntou sobre a evolução de ocorrência de saúde',
  'PATCH /api/ocorrencias/:id/responder-evolucao': () => 'Respondeu sobre a evolução de ocorrência de saúde',
  'PATCH /api/ocorrencias/:id/atestado': () => 'Anexou atestado à ocorrência',
  'POST /api/ocorrencias-gerais': (req) => `Registrou ocorrência geral: "${req.body?.titulo ?? ''}"`,
  'PATCH /api/ocorrencias-gerais/:id/ciente': () => 'Confirmou ciência de ocorrência geral',
  'POST /api/ocorrencias-gerais/marcar-vistas': () => 'Marcou ocorrências gerais como vistas',
  'PATCH /api/ocorrencias-gerais/:id/aprovar': () => 'Aprovou ocorrência geral',
  'PATCH /api/ocorrencias-gerais/:id/rejeitar': () => 'Rejeitou ocorrência geral',
  'POST /api/saidas-antecipadas': () => 'Registrou saída antecipada',
  'PATCH /api/evento-respostas/:id/presenca': () => 'Confirmou presença no evento',
  'PATCH /api/evento-respostas/:id/termo': () => 'Assinou termo do evento',
  'PATCH /api/evento-respostas/:id/pagamento': () => 'Registrou pagamento do evento',
  'POST /api/presencas/bulk': () => 'Lançou presença da turma',
  'POST /api/atividades-avaliativas': (req) => `Agendou atividade avaliativa: "${req.body?.conteudo ?? ''}"`,
  'POST /api/push/inscrever': () => 'Ativou notificações push nesse aparelho',
  'POST /api/medicacoes': (req) => `Enviou medicamento pra escola: "${req.body?.nomeMedicamento ?? ''}"`,
  'POST /api/medicacoes/:id/administrar': (req) => `Marcou medicação como administrada às ${req.body?.horario ?? ''}`,
  'PATCH /api/atividades-avaliativas/:id/liberar-impressao': () => 'Liberou prova para impressão',
  'PATCH /api/atividades-avaliativas/:id/marcar-impressa': () => 'Marcou prova como impressa',
  'PATCH /api/provas-trimestrais/:id/anexar': () => 'Anexou o arquivo da prova trimestral',
  'PATCH /api/provas-trimestrais/:id/aprovar': () => 'Aprovou e liberou a prova trimestral para impressão',
  'PATCH /api/provas-trimestrais/:id/solicitar-alteracao': () => 'Solicitou alteração na prova trimestral',
  'PATCH /api/provas-trimestrais/:id/marcar-impressa': () => 'Marcou prova trimestral como impressa',
  'POST /api/atendimentos': () => 'Registrou um atendimento',
  'PATCH /api/atendimentos/:id/enviar-para-assinatura': () => 'Enviou relatório de atendimento pra assinatura',
  'PATCH /api/atendimentos/:id/assinar': () => 'Assinou o relatório de atendimento',
}

function gerarResumo(metodo: string, rota: string, req: express.Request): string {
  const chave = `${metodo} ${rota}`
  const especifico = RESUMOS_ESPECIFICOS[chave]
  if (especifico) return especifico(req)
  const entidade = ROTA_LABEL[rota]
  if (entidade) {
    const verbo = metodo === 'POST' ? 'Cadastrou' : metodo === 'DELETE' ? 'Excluiu' : 'Atualizou'
    const rotulo = extrairRotulo(req.body)
    return `${verbo} ${entidade}${rotulo ? `: "${rotulo}"` : ''}`
  }
  return chave
}

app.use((req, res, next) => {
  res.on('finish', () => {
    if (req.method === 'GET' || !req.path.startsWith('/api/') || req.path.startsWith('/api/sessions')) return
    if (res.statusCode >= 300 || !req.sessao) return
    const sessao = req.sessao
    const rota = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path
    db.data.atividades.unshift({
      id: id(),
      quando: now(),
      role: sessao.role,
      personaId: sessao.personaId,
      nome: resolverNomeDaSessao(sessao),
      metodo: req.method,
      rota,
      resumo: gerarResumo(req.method, rota, req),
    })
    db.write()
  })
  next()
})

app.post('/api/sessions', async (req, res) => {
  const { telefone, senha } = req.body as { telefone?: string; senha?: string }
  if (!telefone || !senha) return res.status(400).json({ erro: 'telefone e senha são obrigatórios' })

  const pai = db.data.pais.find((p) => p.telefone === telefone)
  const professor = !pai ? db.data.professores.find((p) => p.telefone === telefone) : undefined
  const coordenador = !pai && !professor ? db.data.coordenadores.find((c) => c.telefone === telefone) : undefined
  const secretario = !pai && !professor && !coordenador ? db.data.secretarios.find((s) => s.telefone === telefone) : undefined
  const recepcionista = !pai && !professor && !coordenador && !secretario
    ? db.data.recepcionistas.find((r) => r.telefone === telefone) : undefined
  const monitorIntegral = !pai && !professor && !coordenador && !secretario && !recepcionista
    ? db.data.monitoresIntegral.find((m) => m.telefone === telefone) : undefined
  const substituto = !pai && !professor && !coordenador && !secretario && !recepcionista && !monitorIntegral
    ? db.data.substitutos.find((s) => s.telefone === telefone) : undefined
  const aluno = !pai && !professor && !coordenador && !secretario && !recepcionista && !monitorIntegral && !substituto
    ? db.data.alunos.find((a) => a.login === telefone) : undefined

  if (professor?.bloqueadoEm || coordenador?.bloqueadoEm || secretario?.bloqueadoEm || recepcionista?.bloqueadoEm || monitorIntegral?.bloqueadoEm || substituto?.bloqueadoEm || aluno?.bloqueadoEm) {
    return res.status(403).json({ erro: 'Este acesso foi bloqueado. Fale com a coordenação.' })
  }

  let role: Role | null = null
  let personaId = ''
  let nome = ''
  let senhaHash: string | null = null
  if (pai) { role = 'pai'; personaId = pai.id; nome = pai.nome; senhaHash = pai.senhaHash }
  else if (professor) { role = 'professor'; personaId = professor.id; nome = professor.nome; senhaHash = professor.senhaHash }
  else if (coordenador) { role = 'coordenacao'; personaId = coordenador.id; nome = coordenador.nome; senhaHash = coordenador.senhaHash }
  else if (secretario) { role = 'secretaria'; personaId = secretario.id; nome = secretario.nome; senhaHash = secretario.senhaHash }
  else if (recepcionista) { role = 'recepcao'; personaId = recepcionista.id; nome = recepcionista.nome; senhaHash = recepcionista.senhaHash }
  else if (monitorIntegral) { role = 'integral'; personaId = monitorIntegral.id; nome = monitorIntegral.nome; senhaHash = monitorIntegral.senhaHash }
  else if (substituto) { role = 'substituto'; personaId = substituto.id; nome = substituto.nome; senhaHash = substituto.senhaHash }
  else if (aluno) { role = 'aluno'; personaId = aluno.id; nome = aluno.nome; senhaHash = aluno.senhaHash }

  if (!role || !senhaHash || !(await bcrypt.compare(senha, senhaHash))) {
    return res.status(401).json({ erro: 'telefone ou senha inválidos' })
  }

  const token = gerarToken()
  db.data.sessoesAtivas.push({ token, role, personaId, criadoEm: now() })
  db.data.acessos.unshift({ id: id(), nome, papel: role, horario: now() })
  db.data.atividades.unshift({ id: id(), quando: now(), role, personaId, nome, metodo: 'POST', rota: '/api/sessions', resumo: 'Entrou no sistema' })
  await db.write()
  res.json({ token, role, personaId, nome })
})

app.post('/api/sessions/ativar', async (req, res) => {
  const { telefone, codigoAcesso, senha } = req.body as { telefone?: string; codigoAcesso?: string; senha?: string }
  if (!telefone || !codigoAcesso || !senha) return res.status(400).json({ erro: 'telefone, código e senha são obrigatórios' })
  if (senha.length < 6) return res.status(400).json({ erro: 'a senha precisa ter pelo menos 6 caracteres' })

  const pai = db.data.pais.find((p) => p.telefone === telefone && p.codigoAcesso === codigoAcesso)
  if (!pai) return res.status(400).json({ erro: 'telefone ou código de matrícula inválidos' })

  pai.senhaHash = await bcrypt.hash(senha, 10)
  pai.codigoAcesso = null
  const token = gerarToken()
  db.data.sessoesAtivas.push({ token, role: 'pai', personaId: pai.id, criadoEm: now() })
  db.data.acessos.unshift({ id: id(), nome: pai.nome, papel: 'pai', horario: now() })
  db.data.atividades.unshift({ id: id(), quando: now(), role: 'pai', personaId: pai.id, nome: pai.nome, metodo: 'POST', rota: '/api/sessions/ativar', resumo: 'Entrou no sistema' })
  await db.write()
  res.json({ token, role: 'pai', personaId: pai.id, nome: pai.nome })
})

app.post('/api/sessions/logout', async (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  if (token) {
    db.data.sessoesAtivas = db.data.sessoesAtivas.filter((s) => s.token !== token)
    await db.write()
  }
  res.status(204).end()
})

// ---------- Configuração ----------
app.get('/api/configuracao', (_req, res) => res.json(db.data.configuracao))

app.patch('/api/configuracao', async (req, res) => {
  Object.assign(db.data.configuracao, req.body)
  await db.write()
  res.json(db.data.configuracao)
})

// ---------- Turmas ----------
// Ordem pedagógica (não alfabética) — Berçário, Maternal, Jardim, Pré, depois 1º ao 9º ano.
// Baseada no nome em vez de "serie" porque esse campo não é preenchido de forma
// confiável no cadastro hoje (a maioria das turmas está com serie undefined).
const ORDEM_INFANTIL: [RegExp, number][] = [
  [/ber[çc]ári?o/i, 0],
  [/maternal\s*(i|1)\b/i, 1],
  [/maternal\s*(ii|2)\b/i, 2],
  [/jardim\s*(i|1)\b/i, 3],
  [/jardim\s*(ii|2)\b/i, 4],
  [/pr[ée]\s*(i|1)\b/i, 5],
  [/pr[ée]\s*(ii|2)\b/i, 6],
  [/jardim/i, 3],
  [/pr[ée]/i, 5],
  [/maternal/i, 1],
]
function turmaRank(t: { nome: string; segmento: string }): number {
  if (t.segmento === 'infantil') {
    for (const [re, rank] of ORDEM_INFANTIL) if (re.test(t.nome)) return rank
    return 50
  }
  const m = t.nome.match(/(\d+)/)
  return m ? 100 + Number(m[1]) : 200
}
function ordenarTurmas<T extends { nome: string; segmento: string }>(turmas: T[]): T[] {
  return [...turmas].sort((a, b) => turmaRank(a) - turmaRank(b) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

app.get('/api/turmas', (_req, res) => res.json(ordenarTurmas(db.data.turmas)))

app.post('/api/turmas', async (req, res) => {
  const item = { id: id(), ...req.body }
  db.data.turmas.push(item)
  await db.write()
  res.status(201).json(item)
})

app.patch('/api/turmas/:id', async (req, res) => {
  const item = db.data.turmas.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  Object.assign(item, req.body)
  await db.write()
  res.json(item)
})

app.delete('/api/turmas/:id', async (req, res) => {
  db.data.turmas = db.data.turmas.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Matérias ----------
app.get('/api/materias', (_req, res) => res.json([...db.data.materias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))))

app.post('/api/materias', async (req, res) => {
  const item = { id: id(), ...req.body }
  db.data.materias.push(item)
  await db.write()
  res.status(201).json(item)
})

app.patch('/api/materias/:id', async (req, res) => {
  const item = db.data.materias.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  Object.assign(item, req.body)
  await db.write()
  res.json(item)
})

app.delete('/api/materias/:id', async (req, res) => {
  db.data.materias = db.data.materias.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Calendário letivo ----------
app.get('/api/dias-nao-letivos', (_req, res) => {
  res.json([...db.data.diasNaoLetivos].sort((a, b) => a.data.localeCompare(b.data)))
})

app.post('/api/dias-nao-letivos', async (req, res) => {
  const item = { id: id(), ...req.body }
  db.data.diasNaoLetivos.push(item)
  await db.write()
  res.status(201).json(item)
})

app.delete('/api/dias-nao-letivos/:id', async (req, res) => {
  db.data.diasNaoLetivos = db.data.diasNaoLetivos.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Livro didático (unidades + conteúdo do dia) ----------
app.get('/api/unidades-livro', (req, res) => {
  const { materiaId, serie } = req.query as { materiaId?: string; serie?: string }
  let out = db.data.unidadesLivro
  if (materiaId) out = out.filter((u) => u.materiaId === materiaId)
  if (serie) out = out.filter((u) => u.serie === Number(serie))
  res.json([...out].sort((a, b) => a.numero - b.numero))
})

app.post('/api/unidades-livro', async (req, res) => {
  const item = { id: id(), ...req.body }
  db.data.unidadesLivro.push(item)
  await db.write()
  res.status(201).json(item)
})

app.delete('/api/unidades-livro/:id', async (req, res) => {
  db.data.unidadesLivro = db.data.unidadesLivro.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

app.get('/api/conteudos-dia', (req, res) => {
  const { turmaId, materiaId, data } = req.query as { turmaId?: string; materiaId?: string; data?: string }
  let out = db.data.conteudosDia
  if (turmaId) out = out.filter((c) => c.turmaId === turmaId)
  if (materiaId) out = out.filter((c) => c.materiaId === materiaId)
  if (data) out = out.filter((c) => c.data === data)
  res.json(out)
})

app.post('/api/conteudos-dia', async (req, res) => {
  const item = { id: id(), criadoEm: now(), ...req.body }
  db.data.conteudosDia.push(item)
  await db.write()
  res.status(201).json(item)
})

app.delete('/api/conteudos-dia/:id', async (req, res) => {
  db.data.conteudosDia = db.data.conteudosDia.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Alunos ----------
app.get('/api/alunos', (req, res) => {
  const { turmaId } = req.query as { turmaId?: string }
  let out = db.data.alunos
  if (turmaId) out = out.filter((a) => a.turmaId === turmaId)
  res.json([...out].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(semSenha))
})

app.get('/api/alunos/:id', (req, res) => {
  const a = db.data.alunos.find((x) => x.id === req.params.id)
  if (!a) return send404(res)
  res.json(semSenha(a))
})

app.post('/api/alunos', async (req, res) => {
  const { responsavelIds, ...campos } = req.body
  const item = { id: id(), criadoEm: now(), vistoPelaCoordenacaoEm: null, login: null, senhaHash: null, bloqueadoEm: null, ...campos }
  db.data.alunos.push(item)
  for (const paiId of responsavelIds ?? []) {
    const pai = db.data.pais.find((p) => p.id === paiId)
    if (pai && !pai.alunoIds.includes(item.id)) pai.alunoIds.push(item.id)
  }
  await db.write()
  res.status(201).json(semSenha(item))
})

app.patch('/api/alunos/:id', async (req, res) => {
  const item = db.data.alunos.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  Object.assign(item, req.body)
  await db.write()
  res.json(semSenha(item))
})

app.patch('/api/alunos/:id/acesso', async (req, res) => {
  const item = db.data.alunos.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { senha, novaSenha, ...campos } = req.body as { senha?: string; novaSenha?: string; [k: string]: unknown }
  Object.assign(item, campos)
  if (senha) item.senhaHash = await bcrypt.hash(senha, 10)
  if (novaSenha) item.senhaHash = await bcrypt.hash(novaSenha, 10)
  await db.write()
  res.json(semSenha(item))
})

app.patch('/api/alunos/:id/responsaveis', async (req, res) => {
  const aluno = db.data.alunos.find((x) => x.id === req.params.id)
  if (!aluno) return send404(res)
  const { responsavelIds } = req.body as { responsavelIds: string[] }
  for (const pai of db.data.pais) {
    const deveTer = responsavelIds.includes(pai.id)
    const tem = pai.alunoIds.includes(aluno.id)
    if (deveTer && !tem) pai.alunoIds.push(aluno.id)
    if (!deveTer && tem) pai.alunoIds = pai.alunoIds.filter((aid) => aid !== aluno.id)
  }
  await db.write()
  res.json({ ok: true, responsavelIds })
})

app.post('/api/alunos/marcar-vistos', async (req, res) => {
  const { ids } = req.body as { ids: string[] }
  for (const aluno of db.data.alunos) {
    if (ids.includes(aluno.id)) aluno.vistoPelaCoordenacaoEm = now()
  }
  await db.write()
  res.json({ ok: true })
})

app.delete('/api/alunos/:id', async (req, res) => {
  db.data.alunos = db.data.alunos.filter((x) => x.id !== req.params.id)
  for (const pai of db.data.pais) {
    if (pai.alunoIds.includes(req.params.id)) pai.alunoIds = pai.alunoIds.filter((aid) => aid !== req.params.id)
  }
  await db.write()
  res.status(204).end()
})

// ---------- Pais ----------
app.get('/api/pais', (_req, res) => res.json([...db.data.pais].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(semSenha)))

app.get('/api/pais/:id', (req, res) => {
  const p = db.data.pais.find((x) => x.id === req.params.id)
  if (!p) return send404(res)
  res.json(semSenha(p))
})

app.post('/api/pais', async (req, res) => {
  const item = {
    id: id(),
    alunoIds: [],
    senhaHash: null,
    codigoAcesso: gerarCodigoAcesso(),
    consentimentoEm: null,
    fichaAtualizadaEm: null,
    ...req.body,
  }
  db.data.pais.push(item)
  await db.write()
  res.status(201).json(semSenha(item))
})

app.patch('/api/pais/:id', async (req, res) => {
  const item = db.data.pais.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { novaSenha, gerarNovoCodigo, ...campos } = req.body as { novaSenha?: string; gerarNovoCodigo?: boolean; [k: string]: unknown }
  Object.assign(item, campos)
  if (novaSenha) item.senhaHash = await bcrypt.hash(novaSenha, 10)
  if (gerarNovoCodigo) item.codigoAcesso = gerarCodigoAcesso()
  await db.write()
  res.json(semSenha(item))
})

app.delete('/api/pais/:id', async (req, res) => {
  db.data.pais = db.data.pais.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

app.patch('/api/pais/:id/consentimento', async (req, res) => {
  const item = db.data.pais.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.consentimentoEm = now()
  await db.write()
  res.json(semSenha(item))
})

// ---------- Professores ----------
app.get('/api/professores', (_req, res) => res.json([...db.data.professores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(semSenha)))

app.get('/api/professores/:id', (req, res) => {
  const p = db.data.professores.find((x) => x.id === req.params.id)
  if (!p) return send404(res)
  res.json(semSenha(p))
})

app.post('/api/professores', async (req, res) => {
  const { senha, ...campos } = req.body
  const item = { id: id(), turmaIds: [], vinculos: [], atuaNoIntegral: false, bloqueadoEm: null, ...campos, senhaHash: await bcrypt.hash(senha, 10) }
  db.data.professores.push(item)
  await db.write()
  res.status(201).json(semSenha(item))
})

app.patch('/api/professores/:id', async (req, res) => {
  const item = db.data.professores.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { novaSenha, ...campos } = req.body as { novaSenha?: string; [k: string]: unknown }
  Object.assign(item, campos)
  if (novaSenha) item.senhaHash = await bcrypt.hash(novaSenha, 10)
  await db.write()
  res.json(semSenha(item))
})

app.delete('/api/professores/:id', async (req, res) => {
  db.data.professores = db.data.professores.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Coordenadores ----------
app.get('/api/coordenadores', (_req, res) => res.json(db.data.coordenadores.map(semSenha)))

app.post('/api/coordenadores', async (req, res) => {
  const { senha, ...campos } = req.body
  const item = { id: id(), bloqueadoEm: null, ...campos, senhaHash: await bcrypt.hash(senha, 10) }
  db.data.coordenadores.push(item)
  await db.write()
  res.status(201).json(semSenha(item))
})

app.patch('/api/coordenadores/:id', async (req, res) => {
  const item = db.data.coordenadores.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { novaSenha, ...campos } = req.body as { novaSenha?: string; [k: string]: unknown }
  Object.assign(item, campos)
  if (novaSenha) item.senhaHash = await bcrypt.hash(novaSenha, 10)
  await db.write()
  res.json(semSenha(item))
})

app.delete('/api/coordenadores/:id', async (req, res) => {
  db.data.coordenadores = db.data.coordenadores.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Secretarios ----------
app.get('/api/secretarios', (_req, res) => res.json(db.data.secretarios.map(semSenha)))

app.post('/api/secretarios', async (req, res) => {
  const { senha, ...campos } = req.body
  const item = { id: id(), bloqueadoEm: null, ...campos, senhaHash: await bcrypt.hash(senha, 10) }
  db.data.secretarios.push(item)
  await db.write()
  res.status(201).json(semSenha(item))
})

app.patch('/api/secretarios/:id', async (req, res) => {
  const item = db.data.secretarios.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { novaSenha, ...campos } = req.body as { novaSenha?: string; [k: string]: unknown }
  Object.assign(item, campos)
  if (novaSenha) item.senhaHash = await bcrypt.hash(novaSenha, 10)
  await db.write()
  res.json(semSenha(item))
})

app.delete('/api/secretarios/:id', async (req, res) => {
  db.data.secretarios = db.data.secretarios.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Recepção ----------
app.get('/api/recepcionistas', (_req, res) => res.json(db.data.recepcionistas.map(semSenha)))

app.post('/api/recepcionistas', async (req, res) => {
  const { senha, ...campos } = req.body
  const item = { id: id(), bloqueadoEm: null, ...campos, senhaHash: await bcrypt.hash(senha, 10) }
  db.data.recepcionistas.push(item)
  await db.write()
  res.status(201).json(semSenha(item))
})

app.patch('/api/recepcionistas/:id', async (req, res) => {
  const item = db.data.recepcionistas.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { novaSenha, ...campos } = req.body as { novaSenha?: string; [k: string]: unknown }
  Object.assign(item, campos)
  if (novaSenha) item.senhaHash = await bcrypt.hash(novaSenha, 10)
  await db.write()
  res.json(semSenha(item))
})

app.delete('/api/recepcionistas/:id', async (req, res) => {
  db.data.recepcionistas = db.data.recepcionistas.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Monitores do Integral ----------
app.get('/api/monitores-integral', (_req, res) => res.json(db.data.monitoresIntegral.map(semSenha)))

app.post('/api/monitores-integral', async (req, res) => {
  const { senha, ...campos } = req.body
  const item = { id: id(), bloqueadoEm: null, ...campos, senhaHash: await bcrypt.hash(senha, 10) }
  db.data.monitoresIntegral.push(item)
  await db.write()
  res.status(201).json(semSenha(item))
})

app.patch('/api/monitores-integral/:id', async (req, res) => {
  const item = db.data.monitoresIntegral.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { novaSenha, ...campos } = req.body as { novaSenha?: string; [k: string]: unknown }
  Object.assign(item, campos)
  if (novaSenha) item.senhaHash = await bcrypt.hash(novaSenha, 10)
  await db.write()
  res.json(semSenha(item))
})

app.delete('/api/monitores-integral/:id', async (req, res) => {
  db.data.monitoresIntegral = db.data.monitoresIntegral.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Substitutos ----------
app.get('/api/substitutos', (_req, res) => res.json(db.data.substitutos.map(semSenha)))

app.get('/api/substitutos/:id', (req, res) => {
  const s = db.data.substitutos.find((x) => x.id === req.params.id)
  if (!s) return send404(res)
  res.json(semSenha(s))
})

app.post('/api/substitutos', async (req, res) => {
  const { senha, ...campos } = req.body
  const item = { id: id(), turmaAtualId: null, nomeAtual: null, bloqueadoEm: null, ...campos, senhaHash: await bcrypt.hash(senha, 10) }
  db.data.substitutos.push(item)
  await db.write()
  res.status(201).json(semSenha(item))
})

app.patch('/api/substitutos/:id', async (req, res) => {
  const item = db.data.substitutos.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { novaSenha, ...campos } = req.body as { novaSenha?: string; [k: string]: unknown }
  Object.assign(item, campos)
  if (novaSenha) item.senhaHash = await bcrypt.hash(novaSenha, 10)
  await db.write()
  res.json(semSenha(item))
})

app.delete('/api/substitutos/:id', async (req, res) => {
  db.data.substitutos = db.data.substitutos.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Semanários ----------
app.get('/api/semanarios', (req, res) => {
  const { turmaId, professorId, estado, anoLetivo, trimestre, mes, semanaDoMes } = req.query as {
    turmaId?: string; professorId?: string; estado?: string
    anoLetivo?: string; trimestre?: string; mes?: string; semanaDoMes?: string
  }
  let out = db.data.semanarios
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  if (professorId) out = out.filter((x) => x.professorId === professorId)
  if (estado) out = out.filter((x) => x.estado === estado)
  if (anoLetivo) out = out.filter((x) => x.anoLetivo === Number(anoLetivo))
  if (trimestre) out = out.filter((x) => x.trimestre === Number(trimestre))
  if (mes) out = out.filter((x) => x.mes === Number(mes))
  if (semanaDoMes) out = out.filter((x) => x.semanaDoMes === Number(semanaDoMes))
  res.json(out)
})

app.post('/api/semanarios', async (req, res) => {
  const item = {
    id: id(), criadoEm: now(), atualizadoEm: now(), estado: 'rascunho' as const,
    comentarioCoordenacao: null, avaliadoPor: null, avaliadoEm: null, dias: [],
    ...req.body,
  }
  db.data.semanarios.push(item)
  await db.write()
  res.status(201).json(item)
})

app.patch('/api/semanarios/:id', async (req, res) => {
  const item = db.data.semanarios.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  Object.assign(item, req.body, { atualizadoEm: now() })
  await db.write()
  res.json(item)
})

app.patch('/api/semanarios/:id/enviar', async (req, res) => {
  const item = db.data.semanarios.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.estado = 'aguardando_aprovacao'
  item.comentarioCoordenacao = null
  item.atualizadoEm = now()
  await db.write()
  res.json(item)
  await enviarPushParaPapel('coordenacao', { titulo: 'Semanário enviado', corpo: `${item.professorNome} enviou o semanário da turma para aprovação.`, url: '/coordenacao/turma' })
})

app.patch('/api/semanarios/:id/aprovar', async (req, res) => {
  const item = db.data.semanarios.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.estado = 'aprovado'
  item.avaliadoPor = req.body.avaliadoPor ?? null
  item.avaliadoEm = now()
  item.atualizadoEm = now()
  await db.write()
  res.json(item)
  await enviarPushPara('professor', item.professorId, { titulo: 'Semanário aprovado', corpo: 'A coordenação aprovou seu semanário.', url: '/professor/semanario' })
})

app.patch('/api/semanarios/:id/solicitar-alteracao', async (req, res) => {
  const item = db.data.semanarios.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.estado = 'alteracao_necessaria'
  item.comentarioCoordenacao = req.body.comentario ?? null
  item.avaliadoPor = req.body.avaliadoPor ?? null
  item.avaliadoEm = now()
  item.atualizadoEm = now()
  await db.write()
  res.json(item)
  await enviarPushPara('professor', item.professorId, { titulo: 'Alteração pedida no semanário', corpo: 'A coordenação pediu uma alteração no seu semanário.', url: '/professor/semanario' })
})

app.delete('/api/semanarios/:id', async (req, res) => {
  db.data.semanarios = db.data.semanarios.filter((x) => x.id !== req.params.id)
  await db.write()
  res.status(204).end()
})

// ---------- Feed de avisos ----------
app.get('/api/avisos', (req, res) => {
  const { turmaId } = req.query as { turmaId?: string }
  let out = db.data.avisos
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  res.json([...out].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
})

app.post('/api/avisos', async (req, res) => {
  const item = { id: id(), criadoEm: now(), ...req.body }
  db.data.avisos.unshift(item)
  await db.write()
  res.status(201).json(item)
  await enviarPushParaPaisDaTurma(item.turmaId, { titulo: 'Novo aviso da turma', corpo: item.texto, url: '/pais' })
})

app.patch('/api/avisos/:id', async (req, res) => {
  const item = db.data.avisos.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const autor = req.body.autor ?? 'Coordenação'
  if (req.body.texto && req.body.texto !== item.texto) {
    logEdit('aviso', item.id, `Texto do aviso alterado`, autor)
    item.texto = req.body.texto
  }
  await db.write()
  res.json(item)
})

// ---------- Fotos da rotina (turma) ----------
app.get('/api/fotos', (req, res) => {
  const { turmaId } = req.query as { turmaId?: string }
  let out = db.data.fotos
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  res.json([...out].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
})

const LIMITE_FOTOS_POR_LOTE = 20

app.post('/api/fotos', async (req, res) => {
  const { turmaId, autor, legenda, fotos } = req.body as {
    turmaId: string
    autor: string
    legenda: string
    fotos: { fotoNome: string; fotoTipo: string; fotoDataUrl: string }[]
  }
  if (!Array.isArray(fotos) || !fotos.length) {
    return res.status(400).json({ erro: 'envie ao menos uma foto' })
  }
  const publicacaoId = id()
  const criadoEm = now()
  const novasFotos = fotos.slice(0, LIMITE_FOTOS_POR_LOTE).map((f) => ({
    id: id(),
    publicacaoId,
    turmaId,
    autor,
    legenda,
    fotoNome: f.fotoNome,
    fotoTipo: f.fotoTipo,
    fotoDataUrl: f.fotoDataUrl,
    criadoEm,
  }))
  // Publicar um novo lote substitui só o lote anterior da mesma turma E do mesmo autor
  // (numa turma de Fund. II com vários professores, cada um só substitui as próprias fotos).
  db.data.fotos = db.data.fotos.filter((x) => !(x.turmaId === turmaId && x.autor === autor))
  db.data.fotos.push(...novasFotos)
  await db.write()
  res.status(201).json(novasFotos)
  await enviarPushParaPaisDaTurma(turmaId, { titulo: 'Novas fotos da turma', corpo: legenda || 'Novas fotos da rotina foram publicadas.', url: '/pais' })
})

app.delete('/api/fotos/:publicacaoId', async (req, res) => {
  db.data.fotos = db.data.fotos.filter((x) => x.publicacaoId !== req.params.publicacaoId)
  await db.write()
  res.status(204).end()
})

// ---------- Rotina individual ----------
app.get('/api/rotinas', (req, res) => {
  const { alunoId, data } = req.query as { alunoId?: string; data?: string }
  let out = db.data.rotinas
  if (alunoId) out = out.filter((x) => x.alunoId === alunoId)
  if (data) out = out.filter((x) => x.data === data)
  res.json(out)
})

function getOrCreateRotina(alunoId: string, data: string) {
  let item = db.data.rotinas.find((x) => x.alunoId === alunoId && x.data === data)
  if (!item) {
    item = { id: id(), alunoId, data, lancheManha: null, almoco: null, lancheTarde: null, sono: null, higienizacoes: [], aulas: [] }
    db.data.rotinas.push(item)
  }
  return item
}

const CAMPOS_REFEICAO = ['lancheManha', 'almoco', 'lancheTarde'] as const

app.patch('/api/rotinas/refeicao', async (req, res) => {
  const { alunoId, data, campo, status, observacao, itensAceitos } = req.body as {
    alunoId: string; data: string; campo: (typeof CAMPOS_REFEICAO)[number]; status: string; observacao?: string; itensAceitos?: string[]
  }
  if (!CAMPOS_REFEICAO.includes(campo)) return res.status(400).json({ erro: 'campo inválido' })
  const item = getOrCreateRotina(alunoId, data)
  item[campo] = { status, observacao: observacao ?? null, itensAceitos: itensAceitos ?? null, registradoEm: now() } as any
  await db.write()
  res.json(item)
})

app.post('/api/rotinas/refeicao/bulk', async (req, res) => {
  const { turmaId, data, campo, status, observacao } = req.body as {
    turmaId: string; data: string; campo: (typeof CAMPOS_REFEICAO)[number]; status: string; observacao?: string
  }
  if (!CAMPOS_REFEICAO.includes(campo)) return res.status(400).json({ erro: 'campo inválido' })
  const alunosTurma = db.data.alunos.filter((a) => a.turmaId === turmaId)
  for (const aluno of alunosTurma) {
    const item = getOrCreateRotina(aluno.id, data)
    item[campo] = { status, observacao: observacao ?? null, itensAceitos: null, registradoEm: now() } as any
  }
  await db.write()
  res.json({ ok: true, aplicadoA: alunosTurma.length })
})

app.patch('/api/rotinas/sono/dormiu', async (req, res) => {
  const { alunoId, data, horario } = req.body as { alunoId: string; data: string; horario: string }
  const item = getOrCreateRotina(alunoId, data)
  item.sono = { dormiuAs: horario, acordouAs: null }
  await db.write()
  res.json(item)
})

app.patch('/api/rotinas/sono/acordou', async (req, res) => {
  const { alunoId, data, horario } = req.body as { alunoId: string; data: string; horario: string }
  const item = getOrCreateRotina(alunoId, data)
  if (!item.sono) return res.status(409).json({ erro: 'Esse aluno ainda não tem registro de que dormiu hoje.' })
  item.sono.acordouAs = horario
  await db.write()
  res.json(item)
})

app.post('/api/rotinas/higienizacao', async (req, res) => {
  const { alunoId, data, tipo, observacao } = req.body as { alunoId: string; data: string; tipo: string; observacao?: string }
  const item = getOrCreateRotina(alunoId, data)
  item.higienizacoes.push({ id: id(), horario: now(), tipo: tipo as any, observacao: observacao ?? null })
  await db.write()
  res.json(item)
})

app.patch('/api/rotinas/aulas', async (req, res) => {
  const { alunoId, data, aulas } = req.body as { alunoId: string; data: string; aulas: string[] }
  const item = getOrCreateRotina(alunoId, data)
  item.aulas = aulas
  await db.write()
  res.json(item)
})

app.post('/api/rotinas/aulas/bulk', async (req, res) => {
  const { turmaId, data, aulas } = req.body as { turmaId: string; data: string; aulas: string[] }
  const alunosTurma = db.data.alunos.filter((a) => a.turmaId === turmaId)
  for (const aluno of alunosTurma) {
    const item = getOrCreateRotina(aluno.id, data)
    item.aulas = aulas
  }
  await db.write()
  res.json({ ok: true, aplicadoA: alunosTurma.length })
})

// ---------- Lições de casa ----------
app.get('/api/licoes', (req, res) => {
  const { turmaId } = req.query as { turmaId?: string }
  let out = db.data.licoes
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  res.json([...out].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)))
})

app.post('/api/licoes', async (req, res) => {
  const licao = { id: id(), criadaEm: now(), materiaId: null, anexoNome: null, anexoTipo: null, anexoDataUrl: null, aceitaEntregaPdf: true, ...req.body }
  db.data.licoes.unshift(licao)
  const turma = db.data.alunos.filter((a) => a.turmaId === licao.turmaId)
  for (const aluno of turma) {
    db.data.licaoStatus.push({
      id: id(), licaoId: licao.id, alunoId: aluno.id, estado: 'pendente', atualizadoEm: now(),
      entregaAnexoNome: null, entregaAnexoTipo: null, entregaAnexoDataUrl: null, entregaEm: null,
      observacaoIntegral: null, observacaoIntegralEm: null,
    })
  }
  await db.write()
  res.status(201).json(licao)
  await enviarPushParaPaisDaTurma(licao.turmaId, { titulo: 'Nova lição de casa', corpo: licao.titulo, url: '/pais/filho' })
})

app.patch('/api/licoes/:id', async (req, res) => {
  const item = db.data.licoes.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const autor = req.body.autor ?? 'Coordenação'
  const campos: (keyof typeof item)[] = ['titulo', 'descricao', 'entrega']
  for (const campo of campos) {
    if (req.body[campo] !== undefined && req.body[campo] !== item[campo]) {
      logEdit('licao', item.id, `Campo "${campo}" alterado de "${item[campo]}" para "${req.body[campo]}"`, autor)
      ;(item as any)[campo] = req.body[campo]
    }
  }
  await db.write()
  res.json(item)
})

app.delete('/api/licoes/:id', async (req, res) => {
  db.data.licoes = db.data.licoes.filter((x) => x.id !== req.params.id)
  db.data.licaoStatus = db.data.licaoStatus.filter((x) => x.licaoId !== req.params.id)
  await db.write()
  res.status(204).end()
})

app.get('/api/licao-status', (req, res) => {
  const { alunoId, licaoId, turmaId } = req.query as { alunoId?: string; licaoId?: string; turmaId?: string }
  let out = db.data.licaoStatus
  if (alunoId) out = out.filter((x) => x.alunoId === alunoId)
  if (licaoId) out = out.filter((x) => x.licaoId === licaoId)
  if (turmaId) {
    const licaoIds = new Set(db.data.licoes.filter((l) => l.turmaId === turmaId).map((l) => l.id))
    out = out.filter((x) => licaoIds.has(x.licaoId))
  }
  res.json(out)
})

app.patch('/api/licao-status/:id', async (req, res) => {
  const item = db.data.licaoStatus.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const estado = req.body.estado as LicaoEstado
  const autor = req.body.autor
  if (autor && autor.startsWith('Coordenação') && estado !== item.estado) {
    logEdit('licaoStatus', item.id, `Status alterado de "${item.estado}" para "${estado}"`, autor)
  }
  item.estado = estado
  item.atualizadoEm = now()
  await db.write()
  res.json(item)
})

app.patch('/api/licao-status/:id/observacao-integral', async (req, res) => {
  const item = db.data.licaoStatus.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { observacaoIntegral } = req.body as { observacaoIntegral: string }
  item.observacaoIntegral = observacaoIntegral
  item.observacaoIntegralEm = now()
  await db.write()
  res.json(item)
})

app.patch('/api/licao-status/:id/entrega', async (req, res) => {
  const item = db.data.licaoStatus.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { entregaAnexoNome, entregaAnexoTipo, entregaAnexoDataUrl } = req.body as {
    entregaAnexoNome?: string | null; entregaAnexoTipo?: string | null; entregaAnexoDataUrl?: string | null
  }
  item.entregaAnexoNome = entregaAnexoNome ?? null
  item.entregaAnexoTipo = entregaAnexoTipo ?? null
  item.entregaAnexoDataUrl = entregaAnexoDataUrl ?? null
  item.entregaEm = now()
  await db.write()
  res.json(item)
  const licao = db.data.licoes.find((l) => l.id === item.licaoId)
  const aluno = db.data.alunos.find((a) => a.id === item.alunoId)
  if (licao) {
    await enviarPushParaProfessoresDaTurma(licao.turmaId, { titulo: 'Lição de casa entregue', corpo: `${aluno?.nome ?? 'Um aluno'} entregou "${licao.titulo}".`, url: '/professor/postar' })
  }
})

// ---------- Ocorrências de saúde ----------
function ocorrenciaComPrazo(o: (typeof db.data.ocorrencias)[number]) {
  const baseMs = new Date(o.avaliadoEm ?? o.registradoEm).getTime()
  return {
    ...o,
    prazoLembreteEm: new Date(baseMs + LEMBRETE_MS).toISOString(),
    prazoEscalonamentoEm: new Date(baseMs + ESCALONA_MS).toISOString(),
  }
}

app.get('/api/ocorrencias', (req, res) => {
  const { alunoId, ativas } = req.query as { alunoId?: string; ativas?: string }
  let out = db.data.ocorrencias
  if (alunoId) out = out.filter((x) => x.alunoId === alunoId)
  if (ativas === 'true') out = out.filter((x) => x.estado !== 'resolvida' && x.estado !== 'rejeitada')
  // Enquanto não liberada pela coordenação (ou se descartada), a família não deve saber que existe.
  if (req.sessao?.role === 'pai') out = out.filter((x) => x.estado !== 'aguardando_liberacao' && x.estado !== 'rejeitada')
  res.json([...out].sort((a, b) => b.registradoEm.localeCompare(a.registradoEm)).map(ocorrenciaComPrazo))
})

app.post('/api/ocorrencias', async (req, res) => {
  const criadaPelaCoordenacao = req.sessao?.role === 'coordenacao'
  const item = {
    id: id(), registradoEm: now(),
    estado: (criadaPelaCoordenacao ? 'aguardando_resposta' : 'aguardando_liberacao') as OcorrenciaEstado,
    respostaPaiEm: null, medicacaoNome: null, medicacaoDosagem: null,
    previsaoChegada: null, medicarAteChegada: false, lembreteEnviadoEm: null,
    escalonadoEm: null, resolvidoEm: null, atestadoAnexado: false,
    avaliadoPor: null, avaliadoEm: criadaPelaCoordenacao ? now() : null,
    vistoPelaCoordenacaoEm: null,
    ...req.body,
  }
  db.data.ocorrencias.unshift(item)
  await db.write()
  res.status(201).json(ocorrenciaComPrazo(item))
  if (item.estado === 'aguardando_liberacao') {
    await enviarPushParaPapel('coordenacao', { titulo: 'Ocorrência de saúde', corpo: `${item.tipo} — aguardando sua liberação.`, url: '/coordenacao/notificacoes?sub=saude' })
  } else {
    await enviarPushParaPaisDoAluno(item.alunoId, { titulo: 'Ocorrência de saúde', corpo: item.tipo, url: '/pais/filho' })
  }
})

app.post('/api/ocorrencias/marcar-vistas', async (req, res) => {
  const { ids } = req.body as { ids: string[] }
  for (const item of db.data.ocorrencias) {
    if (ids.includes(item.id)) item.vistoPelaCoordenacaoEm = now()
  }
  await db.write()
  res.json({ ok: true })
})

app.patch('/api/ocorrencias/:id/liberar', async (req, res) => {
  const item = db.data.ocorrencias.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.estado = 'aguardando_resposta'
  item.avaliadoPor = req.body.avaliadoPor ?? null
  item.avaliadoEm = now()
  await db.write()
  res.json(ocorrenciaComPrazo(item))
  await enviarPushParaPaisDoAluno(item.alunoId, { titulo: 'Ocorrência de saúde', corpo: item.tipo, url: '/pais/filho' })
})

app.patch('/api/ocorrencias/:id/rejeitar', async (req, res) => {
  const item = db.data.ocorrencias.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.estado = 'rejeitada'
  item.avaliadoPor = req.body.avaliadoPor ?? null
  item.avaliadoEm = now()
  await db.write()
  res.json(ocorrenciaComPrazo(item))
})

app.patch('/api/ocorrencias/:id/responder', async (req, res) => {
  const item = db.data.ocorrencias.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { tipo, medicacaoNome, medicacaoDosagem, previsaoChegada, medicarAteChegada } = req.body as {
    tipo: 'ciente' | 'medicacao' | 'buscar'; medicacaoNome?: string; medicacaoDosagem?: string
    previsaoChegada?: string; medicarAteChegada?: boolean
  }
  item.estado = tipo === 'medicacao' ? 'medicacao_autorizada' : tipo === 'buscar' ? 'indo_buscar' : 'ciente'
  item.respostaPaiEm = now()
  item.vistoPelaCoordenacaoEm = null
  if (tipo === 'medicacao') {
    item.medicacaoNome = medicacaoNome ?? null
    item.medicacaoDosagem = medicacaoDosagem ?? null
  }
  if (tipo === 'buscar') {
    item.previsaoChegada = previsaoChegada ?? null
    item.medicarAteChegada = !!medicarAteChegada
    if (medicarAteChegada) {
      item.medicacaoNome = medicacaoNome ?? null
      item.medicacaoDosagem = medicacaoDosagem ?? null
    }
  }
  await db.write()
  res.json(ocorrenciaComPrazo(item))
  await enviarPushParaPapel('coordenacao', { titulo: 'Ocorrência de saúde respondida', corpo: `O responsável respondeu sobre ${item.tipo}.`, url: '/coordenacao/notificacoes?sub=saude' })
})

app.patch('/api/ocorrencias/:id/resolver', async (req, res) => {
  const item = db.data.ocorrencias.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.estado = 'resolvida'
  item.resolvidoEm = now()
  await db.write()
  res.json(ocorrenciaComPrazo(item))
})

app.patch('/api/ocorrencias/:id/perguntar-evolucao', async (req, res) => {
  const item = db.data.ocorrencias.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.perguntaEvolucaoEm = now()
  item.respostaEvolucaoTexto = null
  item.respostaEvolucaoEm = null
  await db.write()
  res.json(ocorrenciaComPrazo(item))
  await enviarPushParaPapel('coordenacao', { titulo: 'Pergunta sobre evolução', corpo: `O responsável perguntou sobre a evolução de: ${item.tipo}`, url: '/coordenacao/notificacoes?sub=saude' })
})

app.patch('/api/ocorrencias/:id/responder-evolucao', async (req, res) => {
  const item = db.data.ocorrencias.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { texto } = req.body as { texto: string }
  item.respostaEvolucaoTexto = texto
  item.respostaEvolucaoEm = now()
  item.respostaEvolucaoVistaPeloPaiEm = null
  await db.write()
  res.json(ocorrenciaComPrazo(item))
  await enviarPushParaPaisDoAluno(item.alunoId, { titulo: 'Resposta sobre evolução', corpo: `A coordenação respondeu sobre ${item.tipo}.`, url: '/pais/filho' })
})

app.patch('/api/ocorrencias/:id/marcar-evolucao-vista', async (req, res) => {
  const item = db.data.ocorrencias.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.respostaEvolucaoVistaPeloPaiEm = now()
  await db.write()
  res.json(ocorrenciaComPrazo(item))
})

app.delete('/api/ocorrencias/:id', async (req, res) => {
  const antes = db.data.ocorrencias.length
  db.data.ocorrencias = db.data.ocorrencias.filter((x) => x.id !== req.params.id)
  if (db.data.ocorrencias.length === antes) return send404(res)
  await db.write()
  res.status(204).end()
})

app.patch('/api/ocorrencias/:id/atestado', async (req, res) => {
  const item = db.data.ocorrencias.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.atestadoAnexado = true
  await db.write()
  res.json(ocorrenciaComPrazo(item))
})

// ---------- Ocorrências gerais (não são de saúde — passam por aprovação da coordenação) ----------
app.get('/api/ocorrencias-gerais', (req, res) => {
  const { alunoId, turmaId, estado } = req.query as { alunoId?: string; turmaId?: string; estado?: string }
  let out = db.data.ocorrenciasGerais
  if (alunoId) out = out.filter((x) => x.alunoId === alunoId)
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  if (estado) out = out.filter((x) => x.estado === estado)
  res.json([...out].sort((a, b) => b.registradoEm.localeCompare(a.registradoEm)))
})

app.post('/api/ocorrencias-gerais', async (req, res) => {
  const item = {
    id: id(), registradoEm: now(), estado: 'pendente_aprovacao' as const,
    avaliadoPor: null, avaliadoEm: null, cientePor: null, cienteEm: null, vistoPelaCoordenacaoEm: null,
    registradoPorRole: req.sessao?.role ?? null, registradoPorPersonaId: req.sessao?.personaId ?? null,
    ...req.body,
  }
  db.data.ocorrenciasGerais.unshift(item)
  await db.write()
  res.status(201).json(item)
  await enviarPushParaPapel('coordenacao', { titulo: 'Ocorrência geral', corpo: `${item.titulo} — aguardando aprovação.`, url: '/coordenacao/notificacoes?sub=gerais' })
})

app.patch('/api/ocorrencias-gerais/:id/ciente', async (req, res) => {
  const item = db.data.ocorrenciasGerais.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.cientePor = req.body.cientePor ?? null
  item.cienteEm = now()
  item.vistoPelaCoordenacaoEm = null
  await db.write()
  res.json(item)
})

app.post('/api/ocorrencias-gerais/marcar-vistas', async (req, res) => {
  const { ids } = req.body as { ids: string[] }
  for (const item of db.data.ocorrenciasGerais) {
    if (ids.includes(item.id)) item.vistoPelaCoordenacaoEm = now()
  }
  await db.write()
  res.json({ ok: true })
})

app.patch('/api/ocorrencias-gerais/:id/aprovar', async (req, res) => {
  const item = db.data.ocorrenciasGerais.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.estado = 'aprovada'
  item.avaliadoPor = req.body.avaliadoPor ?? null
  item.avaliadoEm = now()
  await db.write()
  res.json(item)
  await enviarPushParaPaisDoAluno(item.alunoId, { titulo: 'Nova ocorrência', corpo: item.titulo, url: '/pais/filho' })
})

app.patch('/api/ocorrencias-gerais/:id/rejeitar', async (req, res) => {
  const item = db.data.ocorrenciasGerais.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.estado = 'rejeitada'
  item.avaliadoPor = req.body.avaliadoPor ?? null
  item.avaliadoEm = now()
  await db.write()
  res.json(item)
  if (item.registradoPorRole && item.registradoPorPersonaId) {
    await enviarPushPara(item.registradoPorRole, item.registradoPorPersonaId, { titulo: 'Ocorrência rejeitada', corpo: `A coordenação rejeitou: "${item.titulo}".`, url: '/professor/acompanhar' })
  }
})

app.delete('/api/ocorrencias-gerais/:id', async (req, res) => {
  const antes = db.data.ocorrenciasGerais.length
  db.data.ocorrenciasGerais = db.data.ocorrenciasGerais.filter((x) => x.id !== req.params.id)
  if (db.data.ocorrenciasGerais.length === antes) return send404(res)
  await db.write()
  res.status(204).end()
})

// ---------- Medicação agendada (remédio enviado pelo responsável) ----------
app.get('/api/medicacoes', (req, res) => {
  const { alunoId } = req.query as { alunoId?: string }
  let out = db.data.medicacoes
  if (alunoId) out = out.filter((x) => x.alunoId === alunoId)
  res.json([...out].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
})

app.post('/api/medicacoes', async (req, res) => {
  const item: MedicacaoAgendada = {
    id: id(),
    criadoEm: now(),
    vistoPelaCoordenacaoEm: null,
    ativo: true,
    administracoes: [],
    lembretesEnviados: [],
    ...req.body,
  }
  db.data.medicacoes.push(item)
  await db.write()
  res.status(201).json(item)
  await enviarPushParaPapel('coordenacao', { titulo: 'Novo medicamento enviado', corpo: `${item.nomeMedicamento} — ver horários de administração.`, url: '/coordenacao/notificacoes?sub=medicacao' })
  await enviarPushParaPapel('recepcao', { titulo: 'Novo medicamento enviado', corpo: `${item.nomeMedicamento} — ver horários de administração.`, url: '/recepcao/medicacao' })
})

app.patch('/api/medicacoes/:id', async (req, res) => {
  const item = db.data.medicacoes.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  Object.assign(item, req.body)
  await db.write()
  res.json(item)
})

app.delete('/api/medicacoes/:id', async (req, res) => {
  const antes = db.data.medicacoes.length
  db.data.medicacoes = db.data.medicacoes.filter((x) => x.id !== req.params.id)
  if (db.data.medicacoes.length === antes) return send404(res)
  await db.write()
  res.status(204).end()
})

app.post('/api/medicacoes/marcar-vistas', async (req, res) => {
  const { ids } = req.body as { ids: string[] }
  for (const item of db.data.medicacoes) {
    if (ids.includes(item.id)) item.vistoPelaCoordenacaoEm = now()
  }
  await db.write()
  res.json({ ok: true })
})

app.post('/api/medicacoes/:id/administrar', async (req, res) => {
  const item = db.data.medicacoes.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { data, horario, administradoPor } = req.body as { data: string; horario: string; administradoPor: string }
  if (!item.administracoes.some((a) => a.data === data && a.horario === horario)) {
    item.administracoes.push({ data, horario, administradoEm: now(), administradoPor })
  }
  await db.write()
  res.json(item)
  await enviarPushParaPaisDoAluno(item.alunoId, {
    titulo: 'Medicação administrada',
    corpo: `${item.nomeMedicamento} foi dado às ${horario}.`,
    url: '/pais/filho',
  })
})

// ---------- Notificações push ----------
app.get('/api/push/chave-publica', (_req, res) => {
  res.json({ publicKey: db.data.vapid?.publicKey ?? '' })
})

app.post('/api/push/inscrever', async (req, res) => {
  if (!req.sessao) return res.status(401).json({ erro: 'não autenticado' })
  const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } }
  db.data.pushSubscricoes = db.data.pushSubscricoes.filter((s) => s.endpoint !== endpoint)
  db.data.pushSubscricoes.push({ id: id(), role: req.sessao.role, personaId: req.sessao.personaId, endpoint, keys, criadoEm: now() })
  await db.write()
  res.status(201).json({ ok: true })
})

app.post('/api/push/desinscrever', async (req, res) => {
  const { endpoint } = req.body as { endpoint: string }
  db.data.pushSubscricoes = db.data.pushSubscricoes.filter((s) => s.endpoint !== endpoint)
  await db.write()
  res.json({ ok: true })
})

// Loop de escalonamento automático
setInterval(async () => {
  let changed = false
  const t = Date.now()
  for (const o of db.data.ocorrencias) {
    if (o.estado !== 'aguardando_resposta') continue
    const registradoMs = new Date(o.avaliadoEm ?? o.registradoEm).getTime()
    if (!o.lembreteEnviadoEm && t - registradoMs > LEMBRETE_MS) {
      o.lembreteEnviadoEm = now()
      changed = true
    }
    if (t - registradoMs > ESCALONA_MS) {
      o.estado = 'escalonada'
      o.escalonadoEm = now()
      changed = true
    }
  }
  if (changed) await db.write()
}, 5000)

// Loop de lembrete de medicação — avisa 5 minutos antes do horário de cada dose
const MEDICACAO_LEMBRETE_MIN = 5
setInterval(async () => {
  const agora = new Date()
  const hoje = agora.toISOString().slice(0, 10)
  let changed = false
  for (const m of db.data.medicacoes) {
    if (!m.ativo || hoje < m.dataInicio || hoje > m.dataFim) continue
    for (const horario of m.horarios) {
      const chave = `${hoje}|${horario}`
      if (m.lembretesEnviados.includes(chave)) continue
      if (m.administracoes.some((a) => a.data === hoje && a.horario === horario)) continue
      const [h, min] = horario.split(':').map(Number)
      const horarioDose = new Date(agora)
      horarioDose.setHours(h, min, 0, 0)
      const faltamMin = (horarioDose.getTime() - agora.getTime()) / 60_000
      if (faltamMin > 0 && faltamMin <= MEDICACAO_LEMBRETE_MIN) {
        m.lembretesEnviados.push(chave)
        changed = true
        const aluno = db.data.alunos.find((a) => a.id === m.alunoId)
        const payload = { titulo: 'Hora de medicar', corpo: `${aluno?.nome ?? 'Aluno'} — ${m.nomeMedicamento} às ${horario}`, url: '/coordenacao/notificacoes?sub=medicacao' }
        await enviarPushParaPapel('coordenacao', payload)
        await enviarPushParaPapel('recepcao', { ...payload, url: '/recepcao/medicacao' })
      }
    }
  }
  if (changed) await db.write()
}, 5000)

// Limpeza automática dos arquivos de prova — 4 meses depois da data da atividade,
// o anexo é apagado pra não pesar o banco, mas o registro (matéria, data, conteúdo,
// se foi liberada/impressa) continua pra sempre pro histórico da coordenação.
const QUATRO_MESES_MS = 120 * 24 * 60 * 60 * 1000
async function limparProvasAntigas() {
  const agora = Date.now()
  let changed = false
  for (const a of db.data.atividadesAvaliativas) {
    if (!a.provaAnexoDataUrl) continue
    if (agora - new Date(a.data).getTime() > QUATRO_MESES_MS) {
      a.provaAnexoNome = null
      a.provaAnexoTipo = null
      a.provaAnexoDataUrl = null
      changed = true
    }
  }
  if (changed) await db.write()
}
limparProvasAntigas()
setInterval(limparProvasAntigas, 6 * 60 * 60 * 1000)

// ---------- Atestados médicos ----------
app.get('/api/atestados', (req, res) => {
  const { alunoId } = req.query as { alunoId?: string }
  let out = db.data.atestados
  if (alunoId) out = out.filter((x) => x.alunoId === alunoId)
  res.json([...out].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
})

app.post('/api/atestados', async (req, res) => {
  const item = { id: id(), criadoEm: now(), arquivoNome: null, arquivoTipo: null, arquivoDataUrl: null, vistoPelaCoordenacaoEm: null, ...req.body }
  db.data.atestados.unshift(item)
  const aluno = db.data.alunos.find((a) => a.id === item.alunoId)
  logEdit('atestado', item.id, `Atestado de ${aluno?.nome ?? 'aluno'} notificado à coordenação e aos professores`, 'Sistema')
  await db.write()
  res.status(201).json(item)
  await enviarPushParaPapel('coordenacao', { titulo: 'Atestado médico enviado', corpo: `${aluno?.nome ?? 'Um aluno'} enviou um atestado.`, url: '/coordenacao' })
  if (aluno) await enviarPushParaProfessoresDaTurma(aluno.turmaId, { titulo: 'Atestado médico enviado', corpo: `${aluno.nome} enviou um atestado.`, url: '/professor/turma' })
})

app.post('/api/atestados/marcar-vistos', async (req, res) => {
  const { ids } = req.body as { ids: string[] }
  for (const item of db.data.atestados) {
    if (ids.includes(item.id)) item.vistoPelaCoordenacaoEm = now()
  }
  await db.write()
  res.json({ ok: true })
})

// ---------- Saída antecipada ----------
app.get('/api/saidas-antecipadas', (req, res) => {
  const { alunoId, turmaId, data } = req.query as { alunoId?: string; turmaId?: string; data?: string }
  let out = db.data.saidasAntecipadas
  if (alunoId) out = out.filter((x) => x.alunoId === alunoId)
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  if (data) out = out.filter((x) => x.data === data)
  res.json([...out].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
})

app.post('/api/saidas-antecipadas', async (req, res) => {
  const item = { id: id(), criadoEm: now(), ...req.body }
  db.data.saidasAntecipadas.unshift(item)
  await db.write()
  res.status(201).json(item)
  const aluno = db.data.alunos.find((a) => a.id === item.alunoId)
  const payload = { titulo: 'Saída antecipada', corpo: `${aluno?.nome ?? 'Um aluno'} vai sair mais cedo hoje, às ${item.horario}.`, url: '/coordenacao/registros' }
  await enviarPushParaPapel('coordenacao', payload)
  await enviarPushParaPapel('recepcao', { ...payload, url: '/recepcao' })
  await enviarPushParaProfessoresDaTurma(item.turmaId, { ...payload, url: '/professor/turma' })
})

app.delete('/api/saidas-antecipadas/:id', async (req, res) => {
  const antes = db.data.saidasAntecipadas.length
  db.data.saidasAntecipadas = db.data.saidasAntecipadas.filter((x) => x.id !== req.params.id)
  if (db.data.saidasAntecipadas.length === antes) return send404(res)
  await db.write()
  res.status(204).end()
})

// ---------- Eventos ----------
// ---------- Visitas agendadas (site público) ----------
const VISITA_STATUS_VALIDOS: VisitaStatus[] = ['pendente', 'confirmada', 'cancelada', 'realizada']

app.get('/api/publico/visitas/disponibilidade', (req, res) => {
  const { data } = req.query as { data?: string }
  if (!data) return res.status(400).json({ erro: 'informe a data' })
  const horariosOcupados = db.data.visitas
    .filter((v) => v.data === data && v.status !== 'cancelada')
    .map((v) => v.horario)
  res.json({ horariosOcupados })
})

app.post('/api/publico/visitas', async (req, res) => {
  const { data, horario, responsavel, telefone, crianca, segmento, observacoes } = req.body as Record<string, string | undefined>
  if (!data || !horario || !responsavel?.trim() || !telefone?.trim()) {
    return res.status(400).json({ erro: 'preencha data, horário, responsável e telefone' })
  }
  const ocupado = db.data.visitas.some((v) => v.data === data && v.horario === horario && v.status !== 'cancelada')
  if (ocupado) return res.status(409).json({ erro: 'esse horário acabou de ser reservado por outra pessoa' })

  const visita = {
    id: id(),
    data,
    horario,
    responsavel: responsavel.trim(),
    telefone: telefone.trim(),
    crianca: crianca?.trim() || null,
    segmento: segmento || 'Ainda não sei',
    observacoes: observacoes?.trim() || null,
    status: 'pendente' as const,
    criadoEm: now(),
  }
  db.data.visitas.push(visita)
  await db.write()
  res.status(201).json(visita)
})

app.get('/api/visitas', (req, res) => {
  res.json([...db.data.visitas].sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario)))
})

app.patch('/api/visitas/:id', async (req, res) => {
  const item = db.data.visitas.find((v) => v.id === req.params.id)
  if (!item) return send404(res)
  const { status } = req.body as { status?: string }
  if (!status || !VISITA_STATUS_VALIDOS.includes(status as VisitaStatus)) return res.status(400).json({ erro: 'status inválido' })
  item.status = status as VisitaStatus
  await db.write()
  res.json(item)
})

// ---------- Atividades avaliativas (provas/trabalhos agendados pelo professor) ----------
function semProva<T extends { provaAnexoNome: string | null; provaAnexoTipo: string | null; provaAnexoDataUrl: string | null }>(item: T) {
  const { provaAnexoNome, provaAnexoTipo, provaAnexoDataUrl, ...resto } = item
  return resto
}

app.get('/api/atividades-avaliativas', (req, res) => {
  const { turmaId } = req.query as { turmaId?: string }
  let out = db.data.atividadesAvaliativas
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  const ordenado = [...out].sort((a, b) => a.data.localeCompare(b.data))
  const podeVerProva = req.sessao?.role !== 'pai' && req.sessao?.role !== 'aluno'
  res.json(podeVerProva ? ordenado : ordenado.map(semProva))
})

app.post('/api/atividades-avaliativas', async (req, res) => {
  const item: AtividadeAvaliativa = {
    id: id(),
    criadoEm: now(),
    vistoPelaCoordenacaoEm: null,
    provaAnexoNome: null,
    provaAnexoTipo: null,
    provaAnexoDataUrl: null,
    provaLiberadaParaImpressao: false,
    provaLiberadaEm: null,
    provaLiberadaPor: null,
    provaImpressaEm: null,
    provaImpressaPor: null,
    ...req.body,
  }
  db.data.atividadesAvaliativas.push(item)
  await db.write()
  res.status(201).json(item)
  await enviarPushParaPapel('coordenacao', { titulo: 'Atividade avaliativa agendada', corpo: item.conteudo, url: '/coordenacao?sub=avaliacoes' })
})

app.patch('/api/atividades-avaliativas/:id/liberar-impressao', async (req, res) => {
  const item = db.data.atividadesAvaliativas.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { liberadoPor } = req.body as { liberadoPor?: string }
  item.provaLiberadaParaImpressao = true
  item.provaLiberadaEm = now()
  item.provaLiberadaPor = liberadoPor ?? null
  await db.write()
  res.json(item)
  await enviarPushParaPapel('recepcao', { titulo: 'Prova liberada para impressão', corpo: item.conteudo, url: '/recepcao/impressao' })
})

app.patch('/api/atividades-avaliativas/:id/marcar-impressa', async (req, res) => {
  const item = db.data.atividadesAvaliativas.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { impressoPor } = req.body as { impressoPor?: string }
  item.provaImpressaEm = now()
  item.provaImpressaPor = impressoPor ?? null
  await db.write()
  res.json(item)
})

app.patch('/api/atividades-avaliativas/:id', async (req, res) => {
  const item = db.data.atividadesAvaliativas.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  Object.assign(item, req.body)
  await db.write()
  res.json(item)
})

app.delete('/api/atividades-avaliativas/:id', async (req, res) => {
  const antes = db.data.atividadesAvaliativas.length
  db.data.atividadesAvaliativas = db.data.atividadesAvaliativas.filter((x) => x.id !== req.params.id)
  if (db.data.atividadesAvaliativas.length === antes) return send404(res)
  await db.write()
  res.status(204).end()
})

app.post('/api/atividades-avaliativas/marcar-vistas', async (req, res) => {
  const { ids } = req.body as { ids: string[] }
  for (const item of db.data.atividadesAvaliativas) {
    if (ids.includes(item.id)) item.vistoPelaCoordenacaoEm = now()
  }
  await db.write()
  res.json({ ok: true })
})

// ---------- Provas trimestrais (calendário de provas + aprovação + impressão) ----------
app.get('/api/provas-trimestrais', (req, res) => {
  if (req.sessao?.role === 'pai' || req.sessao?.role === 'aluno') {
    return res.status(403).json({ erro: 'Esse acesso não tem permissão para essa ação.' })
  }
  const { data, turmaId, materiaId, professorId, estado } = req.query as {
    data?: string; turmaId?: string; materiaId?: string; professorId?: string; estado?: string
  }
  let out = db.data.provasTrimestrais
  if (data) out = out.filter((x) => x.data === data)
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  if (materiaId) out = out.filter((x) => x.materiaId === materiaId)
  if (professorId) out = out.filter((x) => x.professorId === professorId)
  if (estado) out = out.filter((x) => x.estado === estado)
  res.json([...out].sort((a, b) => a.data.localeCompare(b.data)))
})

app.post('/api/provas-trimestrais', async (req, res) => {
  const item: ProvaTrimestral = {
    id: id(),
    criadoEm: now(),
    professorId: null,
    professorNome: null,
    arquivoNome: null,
    arquivoTipo: null,
    arquivoDataUrl: null,
    estado: 'aguardando_envio',
    comentarioCoordenacao: null,
    avaliadoPor: null,
    avaliadoEm: null,
    provaImpressaEm: null,
    provaImpressaPor: null,
    ...req.body,
  }
  db.data.provasTrimestrais.push(item)
  await db.write()
  res.status(201).json(item)
})

app.patch('/api/provas-trimestrais/:id/anexar', async (req, res) => {
  const item = db.data.provasTrimestrais.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { arquivoNome, arquivoTipo, arquivoDataUrl, professorId, professorNome } = req.body as {
    arquivoNome: string; arquivoTipo: string; arquivoDataUrl: string; professorId: string; professorNome: string
  }
  item.arquivoNome = arquivoNome
  item.arquivoTipo = arquivoTipo
  item.arquivoDataUrl = arquivoDataUrl
  item.professorId = professorId
  item.professorNome = professorNome
  item.estado = 'aguardando_aprovacao'
  item.comentarioCoordenacao = null
  await db.write()
  res.json(item)
  const turma = db.data.turmas.find((t) => t.id === item.turmaId)
  const materia = db.data.materias.find((m) => m.id === item.materiaId)
  await enviarPushParaPapel('coordenacao', {
    titulo: 'Prova trimestral pra aprovar',
    corpo: `${materia?.nome ?? 'Prova'} — ${turma?.nome ?? ''} — ${professorNome}`,
    url: '/coordenacao?sub=avaliacoes',
  })
})

app.patch('/api/provas-trimestrais/:id/aprovar', async (req, res) => {
  const item = db.data.provasTrimestrais.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { avaliadoPor } = req.body as { avaliadoPor?: string }
  item.estado = 'liberada_impressao'
  item.avaliadoPor = avaliadoPor ?? null
  item.avaliadoEm = now()
  await db.write()
  res.json(item)
  const turma = db.data.turmas.find((t) => t.id === item.turmaId)
  const materia = db.data.materias.find((m) => m.id === item.materiaId)
  await enviarPushParaPapel('recepcao', {
    titulo: 'Prova trimestral liberada para impressão',
    corpo: `${materia?.nome ?? 'Prova'} — ${turma?.nome ?? ''}`,
    url: '/recepcao/provas-trimestrais',
  })
})

app.patch('/api/provas-trimestrais/:id/solicitar-alteracao', async (req, res) => {
  const item = db.data.provasTrimestrais.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { comentario, avaliadoPor } = req.body as { comentario: string; avaliadoPor?: string }
  item.estado = 'alteracao_necessaria'
  item.comentarioCoordenacao = comentario
  item.avaliadoPor = avaliadoPor ?? null
  item.avaliadoEm = now()
  await db.write()
  res.json(item)
  if (item.professorId) {
    const turma = db.data.turmas.find((t) => t.id === item.turmaId)
    const materia = db.data.materias.find((m) => m.id === item.materiaId)
    await enviarPushPara('professor', item.professorId, {
      titulo: 'Prova trimestral precisa de ajuste',
      corpo: `${materia?.nome ?? 'Prova'} — ${turma?.nome ?? ''}: ${comentario}`,
      url: '/professor/provas-trimestrais',
    })
  }
})

app.patch('/api/provas-trimestrais/:id/marcar-impressa', async (req, res) => {
  const item = db.data.provasTrimestrais.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { impressoPor } = req.body as { impressoPor?: string }
  item.estado = 'impressa'
  item.provaImpressaEm = now()
  item.provaImpressaPor = impressoPor ?? null
  await db.write()
  res.json(item)
})

app.delete('/api/provas-trimestrais/:id', async (req, res) => {
  const antes = db.data.provasTrimestrais.length
  db.data.provasTrimestrais = db.data.provasTrimestrais.filter((x) => x.id !== req.params.id)
  if (db.data.provasTrimestrais.length === antes) return send404(res)
  await db.write()
  res.status(204).end()
})

// Limpeza automática dos arquivos de prova trimestral — 1 mês depois de impressa,
// o anexo é apagado pra não pesar o banco, mas o registro continua pro histórico.
const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000
async function limparProvasTrimestraisAntigas() {
  const agora = Date.now()
  let changed = false
  for (const p of db.data.provasTrimestrais) {
    if (!p.provaImpressaEm || !p.arquivoDataUrl) continue
    if (agora - new Date(p.provaImpressaEm).getTime() > TRINTA_DIAS_MS) {
      p.arquivoNome = null
      p.arquivoTipo = null
      p.arquivoDataUrl = null
      changed = true
    }
  }
  if (changed) await db.write()
}
limparProvasTrimestraisAntigas()
setInterval(limparProvasTrimestraisAntigas, 6 * 60 * 60 * 1000)

// ---------- Atendimentos (conversa da coordenação com a família) ----------
app.get('/api/atendimentos', (req, res) => {
  const { alunoId, coordenadoraId, estado } = req.query as { alunoId?: string; coordenadoraId?: string; estado?: string }
  let out = db.data.atendimentos
  if (req.sessao?.role === 'pai') out = out.filter((x) => x.paiId === req.sessao!.personaId)
  if (alunoId) out = out.filter((x) => x.alunoId === alunoId)
  if (coordenadoraId) out = out.filter((x) => x.coordenadoraId === coordenadoraId)
  if (estado) out = out.filter((x) => x.estado === estado)
  res.json([...out].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
})

app.post('/api/atendimentos', async (req, res) => {
  const item: Atendimento = {
    id: id(),
    criadoEm: now(),
    atualizadoEm: now(),
    audioNome: null,
    audioTipo: null,
    audioDataUrl: null,
    transcricao: null,
    resumo: null,
    resumoGeradoPorIA: false,
    estado: 'rascunho',
    enviadoParaAssinaturaEm: null,
    assinaturaDataUrl: null,
    assinadoEm: null,
    ...req.body,
  }
  db.data.atendimentos.unshift(item)
  await db.write()
  res.status(201).json(item)
})

app.patch('/api/atendimentos/:id', async (req, res) => {
  const item = db.data.atendimentos.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  Object.assign(item, req.body, { atualizadoEm: now() })
  await db.write()
  res.json(item)
})

app.patch('/api/atendimentos/:id/enviar-para-assinatura', async (req, res) => {
  const item = db.data.atendimentos.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.estado = 'aguardando_assinatura'
  item.enviadoParaAssinaturaEm = now()
  item.atualizadoEm = now()
  await db.write()
  res.json(item)
  const aluno = db.data.alunos.find((a) => a.id === item.alunoId)
  await enviarPushPara('pai', item.paiId, { titulo: 'Relatório de atendimento pra assinar', corpo: `Relatório da conversa sobre ${aluno?.nome ?? 'seu filho(a)'} com ${item.coordenadoraNome} está esperando sua assinatura.`, url: '/pais/escola?tab=atendimentos' })
})

app.patch('/api/atendimentos/:id/assinar', async (req, res) => {
  const item = db.data.atendimentos.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { assinaturaDataUrl } = req.body as { assinaturaDataUrl: string }
  item.assinaturaDataUrl = assinaturaDataUrl
  item.estado = 'assinado'
  item.assinadoEm = now()
  item.atualizadoEm = now()
  await db.write()
  res.json(item)
  await enviarPushPara('coordenacao', item.coordenadoraId, { titulo: 'Relatório de atendimento assinado', corpo: 'O responsável assinou o relatório de atendimento.', url: '/coordenacao/atendimentos' })
})

app.delete('/api/atendimentos/:id', async (req, res) => {
  const antes = db.data.atendimentos.length
  db.data.atendimentos = db.data.atendimentos.filter((x) => x.id !== req.params.id)
  if (db.data.atendimentos.length === antes) return send404(res)
  await db.write()
  res.status(204).end()
})

app.get('/api/eventos', (req, res) => {
  const { turmaId } = req.query as { turmaId?: string }
  let out = db.data.eventos
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  res.json([...out].sort((a, b) => a.data.localeCompare(b.data)))
})

app.post('/api/eventos', async (req, res) => {
  const valorNum = Number(req.body.valor)
  const evento = { id: id(), criadoEm: now(), ...req.body, valor: Number.isFinite(valorNum) ? valorNum : 0 }
  db.data.eventos.push(evento)
  const alunosTurma = db.data.alunos.filter((a) => a.turmaId === evento.turmaId)
  for (const aluno of alunosTurma) {
    db.data.eventoRespostas.push({
      id: id(), eventoId: evento.id, alunoId: aluno.id, presenca: 'pendente',
      termoAssinado: false, termoAssinadoEm: null, termoAssinaturaDataUrl: null,
      pagamento: evento.tipo === 'pago' ? 'pendente' : 'nao_aplicavel',
    })
  }
  await db.write()
  res.status(201).json(evento)
})

app.patch('/api/eventos/:id', async (req, res) => {
  const item = db.data.eventos.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const autor = req.body.autor ?? 'Coordenação'
  const campos: (keyof typeof item)[] = ['titulo', 'descricao', 'data', 'valor']
  for (const campo of campos) {
    if (req.body[campo] === undefined || req.body[campo] === item[campo]) continue
    const valor = campo === 'valor' ? (Number.isFinite(Number(req.body.valor)) ? Number(req.body.valor) : item.valor) : req.body[campo]
    logEdit('evento', item.id, `Campo "${campo}" alterado`, autor)
    ;(item as any)[campo] = valor
  }
  await db.write()
  res.json(item)
})

app.get('/api/evento-respostas', (req, res) => {
  const { eventoId, alunoId } = req.query as { eventoId?: string; alunoId?: string }
  let out = db.data.eventoRespostas
  if (eventoId) out = out.filter((x) => x.eventoId === eventoId)
  if (alunoId) out = out.filter((x) => x.alunoId === alunoId)
  res.json(out)
})

app.patch('/api/evento-respostas/:id/presenca', async (req, res) => {
  const item = db.data.eventoRespostas.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const evento = db.data.eventos.find((e) => e.id === item.eventoId)
  const { presenca } = req.body as { presenca: 'confirmado' | 'recusado' }
  if (presenca === 'confirmado' && evento?.exigeTermo && !item.termoAssinado) {
    return res.status(409).json({ erro: 'É necessário assinar o termo de autorização antes de confirmar presença.' })
  }
  item.presenca = presenca
  await db.write()
  res.json(item)
  const aluno = db.data.alunos.find((a) => a.id === item.alunoId)
  await enviarPushParaPapel('coordenacao', {
    titulo: presenca === 'confirmado' ? 'Presença confirmada em evento' : 'Presença recusada em evento',
    corpo: `${aluno?.nome ?? 'Um responsável'} — ${evento?.titulo ?? 'evento'}.`,
    url: '/coordenacao?sub=eventos',
  })
})

app.patch('/api/evento-respostas/:id/termo', async (req, res) => {
  const item = db.data.eventoRespostas.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const { termoAssinaturaDataUrl } = req.body as { termoAssinaturaDataUrl?: string }
  item.termoAssinado = true
  item.termoAssinadoEm = now()
  item.termoAssinaturaDataUrl = termoAssinaturaDataUrl ?? null
  await db.write()
  res.json(item)
})

app.patch('/api/evento-respostas/:id/pagamento', async (req, res) => {
  const item = db.data.eventoRespostas.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  item.pagamento = 'realizado'
  await db.write()
  res.json(item)
  const evento = db.data.eventos.find((e) => e.id === item.eventoId)
  await enviarPushParaPaisDoAluno(item.alunoId, { titulo: 'Pagamento confirmado', corpo: `Seu pagamento de "${evento?.titulo ?? 'evento'}" foi registrado.`, url: '/pais/escola' })
})

// ---------- Achados e perdidos ----------
app.get('/api/achados', (_req, res) => {
  res.json([...db.data.achados].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
})

app.post('/api/achados', async (req, res) => {
  const item = { id: id(), criadoEm: now(), estado: 'reportado' as const, fotoNome: null, fotoTipo: null, fotoDataUrl: null, ...req.body }
  db.data.achados.unshift(item)
  await db.write()
  res.status(201).json(item)
})

app.patch('/api/achados/:id', async (req, res) => {
  const item = db.data.achados.find((x) => x.id === req.params.id)
  if (!item) return send404(res)
  const estadoAnterior = item.estado
  item.estado = req.body.estado ?? item.estado
  await db.write()
  res.json(item)
  if (estadoAnterior !== 'encontrado' && item.estado === 'encontrado') {
    await enviarPushParaPaisDoAluno(item.alunoId, { titulo: 'Item encontrado', corpo: `"${item.descricao}" foi encontrado — pode buscar na recepção.`, url: '/pais/escola?tab=achados' })
  }
})

// ---------- Almoço ----------
app.get('/api/cardapio', (req, res) => {
  const { data } = req.query as { data?: string }
  const d = data ?? new Date().toISOString().slice(0, 10)
  const item = db.data.cardapio.find((x) => x.data === d)
  res.json(item ?? null)
})

app.get('/api/cardapio/semana', (_req, res) => res.json(db.data.cardapio))

app.post('/api/cardapio', async (req, res) => {
  const { data, descricao, itens } = req.body as { data: string; descricao: string; itens: string[] }
  let item = db.data.cardapio.find((x) => x.data === data)
  if (item) {
    item.descricao = descricao
    item.itens = itens
  } else {
    item = { id: id(), data, descricao, itens }
    db.data.cardapio.push(item)
  }
  await db.write()
  res.status(201).json(item)
})

app.delete('/api/cardapio/:id', async (req, res) => {
  const antes = db.data.cardapio.length
  db.data.cardapio = db.data.cardapio.filter((x) => x.id !== req.params.id)
  if (db.data.cardapio.length === antes) return send404(res)
  await db.write()
  res.status(204).end()
})

// ---------- Presença ----------
app.get('/api/presencas', (req, res) => {
  const { turmaId, data } = req.query as { turmaId?: string; data?: string }
  let out = db.data.presencas
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  if (data) out = out.filter((x) => x.data === data)
  res.json(out)
})

// Verifica se o aluno faltou o dia inteiro (todas as aulas) no último dia em que teve
// registro antes de "antesDe" — usado pra saber se ele "voltou" de uma ausência.
function foiAusenteNoUltimoDiaAnterior(turmaId: string, alunoId: string, antesDe: string): boolean {
  const registros = db.data.presencas.filter((p) => p.turmaId === turmaId && p.alunoId === alunoId && p.data < antesDe)
  if (!registros.length) return false
  const ultimaData = registros.reduce((max, r) => (r.data > max ? r.data : max), registros[0].data)
  return registros.filter((r) => r.data === ultimaData).every((r) => !r.presente)
}

app.post('/api/presencas/bulk', async (req, res) => {
  const { turmaId, data, materiaId, aula, marcas } = req.body as {
    turmaId: string; data: string; materiaId?: string | null; aula?: number; marcas: { alunoId: string; presente: boolean }[]
  }
  const materiaChave = materiaId ?? null
  const aulaChave = aula ?? 1
  const avisosVolta: string[] = []
  for (const m of marcas) {
    if (m.presente && foiAusenteNoUltimoDiaAnterior(turmaId, m.alunoId, data)) {
      const temFaltouPendente = db.data.licaoStatus.some((s) => s.alunoId === m.alunoId && s.estado === 'faltou')
      if (temFaltouPendente) avisosVolta.push(m.alunoId)
    }
    const item = db.data.presencas.find(
      (p) => p.turmaId === turmaId && p.data === data && p.alunoId === m.alunoId && p.materiaId === materiaChave && p.aula === aulaChave,
    )
    if (item) item.presente = m.presente
    else db.data.presencas.push({ id: id(), turmaId, data, alunoId: m.alunoId, materiaId: materiaChave, aula: aulaChave, presente: m.presente })
  }
  await db.write()
  res.json({ ok: true, avisosVolta })
})

// ---------- Relatórios ----------
app.get('/api/relatorios', (req, res) => {
  const { turmaId, alunoId } = req.query as { turmaId?: string; alunoId?: string }
  let out = db.data.relatorios
  if (turmaId) out = out.filter((x) => x.turmaId === turmaId)
  if (alunoId) out = out.filter((x) => x.alunoId === alunoId)
  res.json([...out].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
})

app.post('/api/relatorios', async (req, res) => {
  const item = { id: id(), criadoEm: now(), aulas: [], ...req.body }
  db.data.relatorios.unshift(item)
  await db.write()
  res.status(201).json(item)
})

// ---------- Acessos (coordenação) ----------
app.get('/api/acessos', (_req, res) => {
  res.json([...db.data.acessos].sort((a, b) => b.horario.localeCompare(a.horario)).slice(0, 50))
})

// ---------- Registro de atividades (coordenação) ----------
// A coordenação só acompanha a equipe -- acessos de pais e alunos não entram nesse registro.
const PAPEIS_NO_REGISTRO_DE_ATIVIDADES: Role[] = ['secretaria', 'recepcao', 'professor', 'coordenacao', 'integral', 'substituto']

app.get('/api/atividades', (req, res) => {
  const { papel, personaId, antes } = req.query as { papel?: Role; personaId?: string; antes?: string }
  let out = db.data.atividades.filter((a) => PAPEIS_NO_REGISTRO_DE_ATIVIDADES.includes(a.role))
  if (papel) out = out.filter((a) => a.role === papel)
  if (personaId) out = out.filter((a) => a.personaId === personaId)
  if (antes) out = out.filter((a) => a.quando < antes)
  res.json([...out].sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 50))
})

// ---------- Histórico de edições ----------
function logEdit(entidade: string, entidadeId: string, resumo: string, autor: string) {
  db.data.historico.unshift({ id: id(), entidade, entidadeId, resumo, autor, data: now() })
}

app.get('/api/historico', (req, res) => {
  const { entidadeId } = req.query as { entidadeId?: string }
  let out = db.data.historico
  if (entidadeId) out = out.filter((x) => x.entidadeId === entidadeId)
  res.json(out)
})

// ---------- Estáticos (build do front) ----------
const distDir = path.join(__dirname, '..', '..', 'web', 'dist')
app.use(express.static(distDir))
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000
app.listen(PORT, () => {
  console.log(`API + app disponíveis em http://localhost:${PORT}`)
})
