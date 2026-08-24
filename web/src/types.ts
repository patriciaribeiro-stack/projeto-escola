export type Role = 'pai' | 'professor' | 'coordenacao' | 'secretaria' | 'integral' | 'substituto' | 'aluno' | 'recepcao'

export type Segmento = 'infantil' | 'fundamental_1' | 'fundamental_2'
export type Periodo = 'integral' | 'meio_periodo'

export interface Turma {
  id: string
  nome: string
  segmento: Segmento
  serie?: number
  idadeMinima?: number
}

export interface ConfiguracaoMatricula {
  dataCorteDia: number
  dataCorteMes: number
}

export type TipoDiaNaoLetivo = 'feriado' | 'recesso'

export interface DiaNaoLetivo {
  id: string
  data: string
  tipo: TipoDiaNaoLetivo
  descricao: string
}

export interface Materia {
  id: string
  nome: string
}

export interface UnidadeLivro {
  id: string
  materiaId: string
  serie: number
  numero: number
  titulo: string
  paginaInicio?: number
  paginaFim?: number
}

export interface ConteudoDia {
  id: string
  turmaId: string
  materiaId: string
  data: string
  autor: string
  descricao: string
  unidadeConcluidaId: string | null
  criadoEm: string
}

export interface Aluno {
  id: string
  nome: string
  turmaId: string
  iniciais: string
  periodo: Periodo
  criadoEm: string
  vistoPelaCoordenacaoEm: string | null
  cpf?: string
  rg?: string
  orgaoEmissorRg?: string
  dataEmissaoRg?: string
  certidaoNascimento?: string
  dataNascimento?: string
  sexo?: 'M' | 'F' | 'outro'
  ra?: string
  numeroMatricula?: string
  naturalidade?: string
  uf?: string
  nacionalidade?: string
  escolasAnteriores?: string
  inicioNaEscola?: string
  irmaosNaEscola?: number
  telefones?: { numero: string; etiqueta: string }[]
  observacoes?: string
  fichaMedica?: FichaMedica
  login: string | null
  bloqueadoEm: string | null
}

export interface FichaMedica {
  alergias: { nome: string; comoSeManifesta: string; conduta: string }[]
  medicacoes: { nome: string; observacao: string }[]
  condicoesObservacoes: string
  planoSaude: { nome: string; numeroInscricao: string; telefone: string }
  medicoReferencia: { nome: string; telefone: string }
  emergencia: { nomeContato: string; telefoneContato: string; hospitalPreferencia: string }
  autorizaEmergencia: boolean
  revisadoEm: string | null
}

export interface Endereco {
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  cep: string
}

export interface Pai {
  id: string
  nome: string
  telefone: string
  alunoIds: string[]
  codigoAcesso: string | null
  consentimentoEm: string | null
  fichaAtualizadaEm: string | null
  cpf?: string
  rg?: string
  orgaoEmissorRg?: string
  dataEmissaoRg?: string
  email?: string
  certidaoNascimento?: string
  dataNascimento?: string
  sexo?: 'M' | 'F' | 'outro'
  tipo?: string
  naturalidade?: string
  uf?: string
  nacionalidade?: string
  profissao?: string
  observacoes?: string
  endereco?: Endereco
  fotoNome?: string
  fotoTipo?: string
  fotoDataUrl?: string
  responsavelFinanceiro?: boolean
}

export interface Professor {
  id: string
  nome: string
  telefone: string
  turmaIds: string[]
  vinculos: { turmaId: string; materiaId: string }[]
  atuaNoIntegral: boolean
  bloqueadoEm: string | null
}

export interface Substituto {
  id: string
  nome: string
  telefone: string
  turmaAtualId: string | null
  nomeAtual: string | null
  bloqueadoEm: string | null
}

export interface Coordenador {
  id: string
  nome: string
  telefone: string
  bloqueadoEm: string | null
}

export interface Secretario {
  id: string
  nome: string
  telefone: string
  bloqueadoEm: string | null
}

export interface Recepcionista {
  id: string
  nome: string
  telefone: string
  bloqueadoEm: string | null
}

export interface MonitorIntegral {
  id: string
  nome: string
  telefone: string
  bloqueadoEm: string | null
}

export type SemanarioEstado = 'rascunho' | 'aguardando_aprovacao' | 'aprovado' | 'alteracao_necessaria'

export interface SemanarioAula {
  id: string
  aula: string
  conteudo: string
  metodologia: string
  atividadesDeCasa: string | null
}

export interface SemanarioDia {
  id: string
  data: string
  aulas: SemanarioAula[]
  recursos: string | null
  concluidoEm: string | null
}

export interface Semanario {
  id: string
  turmaId: string
  professorId: string
  professorNome: string
  anoLetivo: number
  trimestre: 1 | 2 | 3
  mes: number
  semanaDoMes: 1 | 2 | 3 | 4
  objetivos: string
  estado: SemanarioEstado
  comentarioCoordenacao: string | null
  avaliadoPor: string | null
  avaliadoEm: string | null
  criadoEm: string
  atualizadoEm: string
  dias: SemanarioDia[]
}

export interface Aviso {
  id: string
  turmaId: string
  autor: string
  texto: string
  criadoEm: string
}

export interface FotoRotina {
  id: string
  publicacaoId: string
  turmaId: string
  autor: string
  legenda: string
  fotoNome: string
  fotoTipo: string
  fotoDataUrl: string
  criadoEm: string
}

export type StatusRefeicao = 'comeu_bem' | 'comeu_pouco' | 'nao_quis' | 'nao_oferecido'

export interface RefeicaoRegistro {
  status: StatusRefeicao
  observacao: string | null
  itensAceitos: string[] | null
  registradoEm: string
}

export interface SonoRegistro {
  dormiuAs: string | null
  acordouAs: string | null
}

export type HigienizacaoTipo = 'troca' | 'evacuacao' | 'escape'

export interface HigienizacaoRegistro {
  id: string
  horario: string
  tipo: HigienizacaoTipo
  observacao: string | null
}

export interface Rotina {
  id: string
  alunoId: string
  data: string
  lancheManha: RefeicaoRegistro | null
  almoco: RefeicaoRegistro | null
  lancheTarde: RefeicaoRegistro | null
  sono: SonoRegistro | null
  higienizacoes: HigienizacaoRegistro[]
  aulas: string[]
}

export interface Licao {
  id: string
  turmaId: string
  materiaId: string | null
  titulo: string
  descricao: string
  entrega: string
  criadaEm: string
  autor: string
  anexoNome: string | null
  anexoTipo: string | null
  anexoDataUrl: string | null
  aceitaEntregaPdf: boolean
}

export type LicaoEstado = 'pendente' | 'certo' | 'fora_padrao' | 'faltou' | 'vai_para_casa'

export interface LicaoStatus {
  id: string
  licaoId: string
  alunoId: string
  estado: LicaoEstado
  atualizadoEm: string
  entregaAnexoNome: string | null
  entregaAnexoTipo: string | null
  entregaAnexoDataUrl: string | null
  entregaEm: string | null
  observacaoIntegral: string | null
  observacaoIntegralEm: string | null
}

export type OcorrenciaEstado =
  | 'aguardando_liberacao'
  | 'aguardando_resposta'
  | 'ciente'
  | 'medicacao_autorizada'
  | 'indo_buscar'
  | 'em_acompanhamento'
  | 'escalonada'
  | 'rejeitada'
  | 'resolvida'

export interface Ocorrencia {
  id: string
  alunoId: string
  tipo: string
  descricao: string
  gravidade: 'leve' | 'moderada' | 'grave'
  registradoPor: string
  registradoEm: string
  estado: OcorrenciaEstado
  respostaPaiEm: string | null
  medicacaoNome: string | null
  medicacaoDosagem: string | null
  previsaoChegada: string | null
  medicarAteChegada: boolean
  lembreteEnviadoEm: string | null
  escalonadoEm: string | null
  resolvidoEm: string | null
  atestadoAnexado: boolean
  avaliadoPor: string | null
  avaliadoEm: string | null
  vistoPelaCoordenacaoEm: string | null
  prazoLembreteEm: string
  prazoEscalonamentoEm: string
  perguntaEvolucaoEm?: string | null
  respostaEvolucaoTexto?: string | null
  respostaEvolucaoEm?: string | null
  respostaEvolucaoVistaPeloPaiEm?: string | null
}

export type OcorrenciaGeralEstado = 'pendente_aprovacao' | 'aprovada' | 'rejeitada'

export interface OcorrenciaGeral {
  id: string
  alunoId: string
  turmaId: string
  titulo: string
  descricao: string
  registradoPor: string
  registradoEm: string
  estado: OcorrenciaGeralEstado
  avaliadoPor: string | null
  avaliadoEm: string | null
  cientePor: string | null
  cienteEm: string | null
  vistoPelaCoordenacaoEm: string | null
}

export type VisitaStatus = 'pendente' | 'confirmada' | 'cancelada' | 'realizada'

export interface VisitaAgendada {
  id: string
  data: string
  horario: string
  responsavel: string
  telefone: string
  crianca: string | null
  segmento: string
  observacoes: string | null
  status: VisitaStatus
  criadoEm: string
}

export interface AtividadeAvaliativa {
  id: string
  turmaId: string
  materiaId: string
  autor: string
  data: string
  valor: string
  conteudo: string
  criadoEm: string
  vistoPelaCoordenacaoEm: string | null
  provaAnexoNome: string | null
  provaAnexoTipo: string | null
  provaAnexoDataUrl: string | null
  provaLiberadaParaImpressao: boolean
  provaLiberadaEm: string | null
  provaLiberadaPor: string | null
  provaImpressaEm: string | null
  provaImpressaPor: string | null
}

export interface MedicacaoAdministracao {
  data: string
  horario: string
  administradoEm: string
  administradoPor: string
}

export interface MedicacaoAgendada {
  id: string
  alunoId: string
  nomeMedicamento: string
  dosagem: string
  horarios: string[]
  dataInicio: string
  dataFim: string
  observacoes: string | null
  receitaAnexoNome: string | null
  receitaAnexoTipo: string | null
  receitaAnexoDataUrl: string | null
  registradoPor: string
  criadoEm: string
  vistoPelaCoordenacaoEm: string | null
  ativo: boolean
  administracoes: MedicacaoAdministracao[]
  lembretesEnviados: string[]
}

export type AtendimentoEstado = 'rascunho' | 'aguardando_assinatura' | 'assinado'

export interface Atendimento {
  id: string
  alunoId: string
  paiId: string
  coordenadoraId: string
  coordenadoraNome: string
  data: string
  criadoEm: string
  atualizadoEm: string
  audioNome: string | null
  audioTipo: string | null
  audioDataUrl: string | null
  transcricao: string | null
  resumo: string | null
  resumoGeradoPorIA: boolean
  estado: AtendimentoEstado
  enviadoParaAssinaturaEm: string | null
  assinaturaDataUrl: string | null
  assinadoEm: string | null
}

export type EventoTipo = 'gratuito' | 'pago'

export interface Evento {
  id: string
  titulo: string
  descricao: string
  data: string
  tipo: EventoTipo
  valor: number
  exigeTermo: boolean
  termoTexto: string | null
  criadoEm: string
  turmaId: string
}

export type PresencaEventoEstado = 'pendente' | 'confirmado' | 'recusado'
export type PagamentoEventoEstado = 'nao_aplicavel' | 'pendente' | 'realizado'

export interface EventoResposta {
  id: string
  eventoId: string
  alunoId: string
  presenca: PresencaEventoEstado
  termoAssinado: boolean
  termoAssinadoEm: string | null
  termoAssinaturaDataUrl: string | null
  pagamento: PagamentoEventoEstado
}

export type AchadoEstado = 'reportado' | 'encontrado'

export interface AchadoPerdido {
  id: string
  alunoId: string
  descricao: string
  fotoNome: string | null
  fotoTipo: string | null
  fotoDataUrl: string | null
  estado: AchadoEstado
  criadoEm: string
}

export interface CardapioDia {
  id: string
  data: string
  descricao: string
  itens: string[]
}


export interface Presenca {
  id: string
  turmaId: string
  alunoId: string
  data: string
  materiaId: string | null
  aula: number
  presente: boolean
}

export interface Relatorio {
  id: string
  alunoId: string | null
  turmaId: string
  autor: string
  texto: string
  aulas: string[]
  criadoEm: string
}

export interface Acesso {
  id: string
  nome: string
  papel: Role
  horario: string
}

export interface Atividade {
  id: string
  quando: string
  role: Role
  personaId: string
  nome: string
  metodo: string
  rota: string
  resumo: string
}

export interface Atestado {
  id: string
  alunoId: string
  motivo: string
  dataInicio: string
  dataFim: string
  criadoEm: string
  arquivoNome: string | null
  arquivoTipo: string | null
  arquivoDataUrl: string | null
}

export interface SaidaAntecipada {
  id: string
  alunoId: string
  turmaId: string
  data: string
  horario: string
  motivo: string | null
  criadoPor: string
  criadoEm: string
}

export interface EditHistorico {
  id: string
  entidade: string
  entidadeId: string
  resumo: string
  autor: string
  data: string
}

