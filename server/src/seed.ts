import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import { loadDb } from './db.ts'
import type {
  Turma, Materia, Aluno, Pai, Professor, Coordenador, Secretario, Recepcionista, MonitorIntegral, Substituto, Aviso, FotoRotina,
  Rotina, Licao, LicaoStatus, Ocorrencia, OcorrenciaGeral, Evento, EventoResposta, AchadoPerdido,
  CardapioDia, Relatorio, Acesso,
} from './types.ts'

const SENHA_TESTE = '123456'
const CODIGO_TESTE = '123456'

const id = () => nanoid(10)
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()
const todayStr = () => new Date().toISOString().slice(0, 10)

function svgPlaceholder(corA: string, corB: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${corA}"/><stop offset="1" stop-color="${corB}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const CARDAPIOS = [
  { descricao: 'Arroz, feijão, frango grelhado e salada de alface com tomate', itens: ['Arroz', 'Feijão', 'Frango grelhado', 'Salada de alface com tomate'] },
  { descricao: 'Macarrão ao sugo, carne moída e cenoura refogada', itens: ['Macarrão ao sugo', 'Carne moída', 'Cenoura refogada'] },
  { descricao: 'Arroz, feijão, filé de peixe e purê de batata', itens: ['Arroz', 'Feijão', 'Filé de peixe', 'Purê de batata'] },
  { descricao: 'Estrogonofe de frango com arroz e batata palha', itens: ['Estrogonofe de frango', 'Arroz', 'Batata palha'] },
  { descricao: 'Arroz, feijão, omelete e brócolis no vapor', itens: ['Arroz', 'Feijão', 'Omelete', 'Brócolis no vapor'] },
]

async function main() {
  const db = await loadDb()
  const senhaHashTeste = await bcrypt.hash(SENHA_TESTE, 10)

  const turmaJardim: Turma = { id: 't-jardim2', nome: 'Jardim II', segmento: 'infantil', idadeMinima: 5 }
  const turmaBercario: Turma = { id: 't-bercario', nome: 'Berçário', segmento: 'infantil' }
  const turma5A: Turma = { id: 't-5ano-a', nome: '5º Ano A', segmento: 'fundamental_1', serie: 5, idadeMinima: 10 }

  const materias: Materia[] = [
    { id: 'mat-portugues', nome: 'Português' },
    { id: 'mat-matematica', nome: 'Matemática' },
    { id: 'mat-ciencias', nome: 'Ciências' },
  ]

  const alunos: Aluno[] = [
    {
      id: 'a-lucas', nome: 'Lucas Ribeiro', turmaId: turmaJardim.id, iniciais: 'LR', periodo: 'integral', criadoEm: daysAgo(200), vistoPelaCoordenacaoEm: daysAgo(199),
      login: null, senhaHash: null, bloqueadoEm: null,
      fichaMedica: {
        alergias: [{ nome: 'Amendoim', comoSeManifesta: 'Coceira e inchaço nos lábios', conduta: 'Levar à enfermaria e ligar para os pais imediatamente' }],
        medicacoes: [],
        condicoesObservacoes: '',
        planoSaude: { nome: 'Unimed', numeroInscricao: '123456789', telefone: '08000000000' },
        medicoReferencia: { nome: 'Dra. Patrícia Nunes', telefone: '1133334444' },
        emergencia: { nomeContato: 'Mariana Ribeiro', telefoneContato: '11999990001', hospitalPreferencia: 'Hospital Infantil Sabará' },
        autorizaEmergencia: true,
        revisadoEm: daysAgo(10),
      },
    },
    { id: 'a-maria', nome: 'Maria Souza', turmaId: turmaJardim.id, iniciais: 'MS', periodo: 'meio_periodo', criadoEm: daysAgo(180), vistoPelaCoordenacaoEm: daysAgo(179), login: null, senhaHash: null, bloqueadoEm: null },
    { id: 'a-theo', nome: 'Théo Alves', turmaId: turmaJardim.id, iniciais: 'TA', periodo: 'integral', criadoEm: daysAgo(150), vistoPelaCoordenacaoEm: daysAgo(149), login: null, senhaHash: null, bloqueadoEm: null },
    { id: 'a-sofia', nome: 'Sofia Martins', turmaId: turmaJardim.id, iniciais: 'SM', periodo: 'meio_periodo', criadoEm: daysAgo(100), vistoPelaCoordenacaoEm: daysAgo(99), login: null, senhaHash: null, bloqueadoEm: null },
    { id: 'a-bruno', nome: 'Bruno Duarte', turmaId: turma5A.id, iniciais: 'BD', periodo: 'integral', criadoEm: hoursAgo(2), vistoPelaCoordenacaoEm: null, login: null, senhaHash: null, bloqueadoEm: null },
  ]

  // p-fernanda fica propositalmente sem ativar, pra testar o fluxo de ativação por código.
  // a-lucas tem dois responsáveis (mãe + pai), pra testar múltiplos responsáveis com login próprio.
  const pais: Pai[] = [
    { id: 'p-mariana', nome: 'Mariana Ribeiro', telefone: '11999990001', alunoIds: ['a-lucas'], senhaHash: senhaHashTeste, codigoAcesso: null, consentimentoEm: daysAgo(30), fichaAtualizadaEm: daysAgo(29) },
    {
      id: 'p-fernando', nome: 'Fernando Ribeiro', telefone: '11999990006', alunoIds: ['a-lucas'], senhaHash: senhaHashTeste, codigoAcesso: null, consentimentoEm: daysAgo(5), fichaAtualizadaEm: daysAgo(5),
      cpf: '11122233344', rg: '223344556', sexo: 'M', tipo: 'Pai', responsavelFinanceiro: true,
    },
    { id: 'p-carla', nome: 'Carla Souza', telefone: '11999990002', alunoIds: ['a-maria'], senhaHash: senhaHashTeste, codigoAcesso: null, consentimentoEm: daysAgo(20), fichaAtualizadaEm: daysAgo(19) },
    { id: 'p-rodrigo', nome: 'Rodrigo Alves', telefone: '11999990003', alunoIds: ['a-theo'], senhaHash: senhaHashTeste, codigoAcesso: null, consentimentoEm: daysAgo(15), fichaAtualizadaEm: daysAgo(14) },
    { id: 'p-fernanda', nome: 'Fernanda Martins', telefone: '11999990004', alunoIds: ['a-sofia'], senhaHash: null, codigoAcesso: CODIGO_TESTE, consentimentoEm: null, fichaAtualizadaEm: null },
    { id: 'p-camila', nome: 'Camila Duarte', telefone: '11999990005', alunoIds: ['a-bruno'], senhaHash: senhaHashTeste, codigoAcesso: null, consentimentoEm: daysAgo(10), fichaAtualizadaEm: daysAgo(9) },
  ]

  const professores: Professor[] = [
    { id: 'prof-ana', nome: 'Ana Lima', telefone: '11999990101', turmaIds: [turmaJardim.id], vinculos: [], atuaNoIntegral: false, senhaHash: senhaHashTeste, bloqueadoEm: null },
    { id: 'prof-julia', nome: 'Júlia Prado', telefone: '11999990102', turmaIds: [turmaBercario.id], vinculos: [], atuaNoIntegral: false, senhaHash: senhaHashTeste, bloqueadoEm: null },
    {
      id: 'prof-marcos', nome: 'Marcos Teixeira', telefone: '11999990103', turmaIds: [turma5A.id],
      vinculos: materias.map((m) => ({ turmaId: turma5A.id, materiaId: m.id })),
      atuaNoIntegral: false, senhaHash: senhaHashTeste, bloqueadoEm: null,
    },
  ]

  const coordenadores: Coordenador[] = [
    { id: 'coord-beatriz', nome: 'Beatriz Nunes', telefone: '11999990201', senhaHash: senhaHashTeste, bloqueadoEm: null },
  ]

  const secretarios: Secretario[] = [
    { id: 'sec-fernanda', nome: 'Fernanda Costa', telefone: '11999990301', senhaHash: senhaHashTeste, bloqueadoEm: null },
  ]

  const recepcionistas: Recepcionista[] = [
    { id: 'recepcao-joana', nome: 'Joana Lima', telefone: '11999990601', senhaHash: senhaHashTeste, bloqueadoEm: null },
  ]

  const monitoresIntegral: MonitorIntegral[] = [
    { id: 'integral-patricia', nome: 'Patrícia Gomes', telefone: '11999990401', senhaHash: senhaHashTeste, bloqueadoEm: null },
  ]

  const substitutos: Substituto[] = [
    { id: 'substituto-acesso', nome: 'Acesso Substituta', telefone: '11999990501', senhaHash: senhaHashTeste, turmaAtualId: null, nomeAtual: null, bloqueadoEm: null },
  ]

  const avisos: Aviso[] = [
    { id: id(), turmaId: turmaJardim.id, autor: 'Prof. Ana Lima', texto: 'Passeio ao Zoológico confirmado para sexta-feira. Termo de autorização disponível no app.', criadoEm: hoursAgo(3) },
    { id: id(), turmaId: turmaJardim.id, autor: 'Prof. Ana Lima', texto: 'Semana que vem começamos o projeto de horta — cada criança vai plantar sua mudinha.', criadoEm: daysAgo(1) },
    { id: id(), turmaId: turmaJardim.id, autor: 'Coordenação', texto: 'Reunião de pais marcada para o dia 15/08, às 19h no salão principal.', criadoEm: daysAgo(2) },
  ]

  const publicacaoFotosJardim = id()
  const fotos: FotoRotina[] = [
    { id: id(), publicacaoId: publicacaoFotosJardim, turmaId: turmaJardim.id, autor: 'Prof. Ana Lima', legenda: 'Brincadeira no parque — turma toda', fotoNome: 'parque.svg', fotoTipo: 'image/svg+xml', fotoDataUrl: svgPlaceholder('#2E7D55', '#1D5C78'), criadoEm: hoursAgo(2) },
    { id: id(), publicacaoId: publicacaoFotosJardim, turmaId: turmaJardim.id, autor: 'Prof. Ana Lima', legenda: 'Roda de leitura da tarde', fotoNome: 'leitura.svg', fotoTipo: 'image/svg+xml', fotoDataUrl: svgPlaceholder('#A9701D', '#2E7D55'), criadoEm: hoursAgo(5) },
    { id: id(), publicacaoId: publicacaoFotosJardim, turmaId: turmaJardim.id, autor: 'Prof. Ana Lima', legenda: 'Pintura livre com guache', fotoNome: 'pintura.svg', fotoTipo: 'image/svg+xml', fotoDataUrl: svgPlaceholder('#1D5C78', '#A9701D'), criadoEm: daysAgo(1) },
  ]

  const rotinas: Rotina[] = alunos.map((a) => ({
    id: id(),
    alunoId: a.id,
    data: todayStr(),
    lancheManha: { status: 'comeu_bem', observacao: null, itensAceitos: null, registradoEm: hoursAgo(4) },
    almoco: null,
    lancheTarde: null,
    sono: null,
    higienizacoes: [],
    aulas: ['Roda de conversa', 'Artes — pintura livre', 'Educação física', 'Contação de história'],
  }))

  const licoes: Licao[] = [
    { id: 'lic-mat', turmaId: turmaJardim.id, materiaId: 'mat-matematica', titulo: 'Matemática — contar até 20', descricao: 'Praticar contagem com objetos de casa (grãos, brinquedos, etc.)', entrega: todayStr(), criadaEm: daysAgo(3), autor: 'Prof. Ana Lima', anexoNome: null, anexoTipo: null, anexoDataUrl: null, aceitaEntregaPdf: true },
    { id: 'lic-port', turmaId: turmaJardim.id, materiaId: 'mat-portugues', titulo: 'Português — desenho da família', descricao: 'Desenhar a família e tentar escrever o nome de cada um', entrega: daysAgo(-2).slice(0,10), criadaEm: daysAgo(6), autor: 'Prof. Ana Lima', anexoNome: null, anexoTipo: null, anexoDataUrl: null, aceitaEntregaPdf: true },
    { id: 'lic-artes', turmaId: turmaJardim.id, materiaId: null, titulo: 'Artes — colagem', descricao: 'Colagem livre com papéis coloridos e cola', entrega: daysAgo(3).slice(0,10), criadaEm: daysAgo(9), autor: 'Prof. Ana Lima', anexoNome: null, anexoTipo: null, anexoDataUrl: null, aceitaEntregaPdf: true },
    { id: 'lic-ciencias', turmaId: turmaJardim.id, materiaId: 'mat-ciencias', titulo: 'Ciências — folha da árvore', descricao: 'Trazer uma folha coletada no quintal ou praça para observarmos em sala', entrega: daysAgo(6).slice(0,10), criadaEm: daysAgo(12), autor: 'Prof. Ana Lima', anexoNome: null, anexoTipo: null, anexoDataUrl: null, aceitaEntregaPdf: true },
  ]

  const licaoStatus: LicaoStatus[] = []
  const estadosPorLicaoAluno: Record<string, Record<string, LicaoStatus['estado']>> = {
    'lic-mat': { 'a-lucas': 'pendente', 'a-maria': 'pendente', 'a-theo': 'certo', 'a-sofia': 'pendente' },
    'lic-port': { 'a-lucas': 'certo', 'a-maria': 'certo', 'a-theo': 'certo', 'a-sofia': 'fora_padrao' },
    'lic-artes': { 'a-lucas': 'fora_padrao', 'a-maria': 'certo', 'a-theo': 'certo', 'a-sofia': 'certo' },
    'lic-ciencias': { 'a-lucas': 'faltou', 'a-maria': 'certo', 'a-theo': 'faltou', 'a-sofia': 'certo' },
  }
  for (const licaoId of Object.keys(estadosPorLicaoAluno)) {
    for (const alunoId of Object.keys(estadosPorLicaoAluno[licaoId])) {
      licaoStatus.push({
        id: id(), licaoId, alunoId, estado: estadosPorLicaoAluno[licaoId][alunoId], atualizadoEm: daysAgo(1),
        entregaAnexoNome: null, entregaAnexoTipo: null, entregaAnexoDataUrl: null, entregaEm: null,
        observacaoIntegral: null, observacaoIntegralEm: null,
      })
    }
  }

  const ocorrencias: Ocorrencia[] = [
    {
      id: id(), alunoId: 'a-lucas', tipo: 'Dor de cabeça', descricao: 'Queixou-se de dor de cabeça leve após o parque, sem febre.',
      gravidade: 'leve', registradoPor: 'Prof. Ana Lima', registradoEm: daysAgo(6),
      estado: 'resolvida', respostaPaiEm: daysAgo(6), medicacaoNome: null, medicacaoDosagem: null,
      previsaoChegada: null, medicarAteChegada: false,
      lembreteEnviadoEm: null, escalonadoEm: null, resolvidoEm: daysAgo(6), atestadoAnexado: false,
      avaliadoPor: null, avaliadoEm: daysAgo(6), vistoPelaCoordenacaoEm: daysAgo(6),
    },
  ]

  const ocorrenciasGerais: OcorrenciaGeral[] = [
    {
      id: id(), alunoId: 'a-maria', turmaId: turmaJardim.id, titulo: 'Não trouxe o material de artes',
      descricao: 'Combinado desde segunda-feira, ela disse que esqueceu em casa.',
      registradoPor: 'Prof. Ana Lima', registradoEm: daysAgo(2),
      estado: 'aprovada', avaliadoPor: 'Beatriz Nunes', avaliadoEm: daysAgo(2), cientePor: null, cienteEm: null, vistoPelaCoordenacaoEm: null,
    },
    {
      id: id(), alunoId: 'a-theo', turmaId: turmaJardim.id, titulo: 'Discussão com colega no recreio',
      descricao: 'Théo e outro colega discutiram por causa de um brinquedo. Já foi conversado com as duas crianças.',
      registradoPor: 'Prof. Ana Lima', registradoEm: hoursAgo(3),
      estado: 'pendente_aprovacao', avaliadoPor: null, avaliadoEm: null, cientePor: null, cienteEm: null, vistoPelaCoordenacaoEm: null,
    },
  ]

  const eventos: Evento[] = [
    {
      id: 'ev-reuniao', titulo: 'Reunião de pais', descricao: 'Apresentação do projeto pedagógico do semestre.',
      data: '2026-08-15', tipo: 'gratuito', valor: 0, exigeTermo: false, termoTexto: null,
      criadoEm: daysAgo(2), turmaId: turmaJardim.id,
    },
    {
      id: 'ev-zoo', titulo: 'Passeio ao Zoológico Municipal', descricao: 'Passeio educativo de um dia inteiro, com transporte fretado e lanche incluso.',
      data: '2026-08-02', tipo: 'pago', valor: 45, exigeTermo: true,
      termoTexto: 'Autorizo meu(minha) filho(a) a participar do passeio ao Zoológico Municipal em 02/08/2026, sob responsabilidade da equipe da escola durante o trajeto de ida, permanência no local e retorno. Declaro estar ciente do itinerário e dos horários informados pela coordenação.',
      criadoEm: daysAgo(3), turmaId: turmaJardim.id,
    },
    {
      id: 'ev-familia', titulo: 'Dia da Família', descricao: 'Manhã de brincadeiras e apresentações com as famílias na escola.',
      data: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), tipo: 'gratuito', valor: 0, exigeTermo: false, termoTexto: null,
      criadoEm: daysAgo(4), turmaId: turmaJardim.id,
    },
  ]

  const eventoRespostas: EventoResposta[] = []
  for (const a of alunos) {
    eventoRespostas.push({ id: id(), eventoId: 'ev-reuniao', alunoId: a.id, presenca: 'pendente', termoAssinado: false, termoAssinadoEm: null, termoAssinaturaDataUrl: null, pagamento: 'nao_aplicavel' })
    eventoRespostas.push({ id: id(), eventoId: 'ev-zoo', alunoId: a.id, presenca: 'pendente', termoAssinado: false, termoAssinadoEm: null, termoAssinaturaDataUrl: null, pagamento: 'pendente' })
    eventoRespostas.push({
      id: id(), eventoId: 'ev-familia', alunoId: a.id,
      presenca: a.id === 'a-maria' ? 'confirmado' : 'pendente',
      termoAssinado: false, termoAssinadoEm: null, termoAssinaturaDataUrl: null, pagamento: 'nao_aplicavel',
    })
  }

  const achados: AchadoPerdido[] = [
    { id: id(), alunoId: 'a-lucas', descricao: 'Casaco de moletom azul-marinho com capuz', fotoNome: null, fotoTipo: null, fotoDataUrl: null, estado: 'reportado', criadoEm: hoursAgo(20) },
  ]

  const cardapio: CardapioDia[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.now() + i * 86_400_000)
    const c = CARDAPIOS[i % CARDAPIOS.length]
    return { id: id(), data: d.toISOString().slice(0, 10), descricao: c.descricao, itens: c.itens }
  })

  const relatorios: Relatorio[] = [
    { id: id(), alunoId: null, turmaId: turmaJardim.id, autor: 'Prof. Ana Lima', texto: 'A turma está indo muito bem com a adaptação da rotina de outono — mais interesse em atividades ao ar livre.', aulas: ['Artes', 'Educação Física'], criadoEm: daysAgo(4) },
  ]

  const acessos: Acesso[] = [
    { id: id(), nome: 'Mariana Ribeiro', papel: 'pai', horario: hoursAgo(1) },
    { id: id(), nome: 'Prof. Ana Lima', papel: 'professor', horario: hoursAgo(2) },
    { id: id(), nome: 'Carla Souza', papel: 'pai', horario: hoursAgo(5) },
    { id: id(), nome: 'Beatriz Nunes', papel: 'coordenacao', horario: hoursAgo(6) },
  ]

  db.data.turmas = [turmaJardim, turmaBercario, turma5A]
  db.data.materias = materias
  db.data.alunos = alunos
  db.data.pais = pais
  db.data.professores = professores
  db.data.coordenadores = coordenadores
  db.data.secretarios = secretarios
  db.data.recepcionistas = recepcionistas
  db.data.monitoresIntegral = monitoresIntegral
  db.data.substitutos = substitutos
  db.data.avisos = avisos
  db.data.fotos = fotos
  db.data.rotinas = rotinas
  db.data.licoes = licoes
  db.data.licaoStatus = licaoStatus
  db.data.ocorrencias = ocorrencias
  db.data.ocorrenciasGerais = ocorrenciasGerais
  db.data.eventos = eventos
  db.data.eventoRespostas = eventoRespostas
  db.data.achados = achados
  db.data.cardapio = cardapio
  db.data.presencas = []
  db.data.relatorios = relatorios
  db.data.acessos = acessos
  db.data.historico = []

  await db.write()
  console.log('Seed concluído.')
  console.log('')
  console.log('Credenciais de teste (telefone + senha):')
  console.log(`  Mariana Ribeiro (pai)      11999990001 / ${SENHA_TESTE}`)
  console.log(`  Carla Souza (pai)          11999990002 / ${SENHA_TESTE}`)
  console.log(`  Rodrigo Alves (pai)        11999990003 / ${SENHA_TESTE}`)
  console.log(`  Fernando Ribeiro (pai, 2º responsável de a-lucas) 11999990006 / ${SENHA_TESTE}`)
  console.log(`  Camila Duarte (pai)        11999990005 / ${SENHA_TESTE}`)
  console.log(`  Ana Lima (professora)      11999990101 / ${SENHA_TESTE}`)
  console.log(`  Júlia Prado (professora)   11999990102 / ${SENHA_TESTE}`)
  console.log(`  Marcos Teixeira (prof. regente, 5º Ano A) 11999990103 / ${SENHA_TESTE}`)
  console.log(`  Beatriz Nunes (coord.)     11999990201 / ${SENHA_TESTE}`)
  console.log(`  Fernanda Costa (secret.)   11999990301 / ${SENHA_TESTE}`)
  console.log(`  Joana Lima (recepção)      11999990601 / ${SENHA_TESTE}`)
  console.log(`  Patrícia Gomes (integral)  11999990401 / ${SENHA_TESTE}`)
  console.log(`  Acesso Substituta          11999990501 / ${SENHA_TESTE}`)
  console.log('')
  console.log(`Conta ainda não ativada, para testar o fluxo de ativação:`)
  console.log(`  Fernanda Martins (pai)     telefone 11999990004 / código ${CODIGO_TESTE}`)
}

main()
