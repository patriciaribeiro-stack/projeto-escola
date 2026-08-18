import { useSession } from '../../session'
import { LicoesTab } from '../pais/MeuFilho'

export default function AlunoLicoes() {
  const { alunoLogado } = useSession()
  if (!alunoLogado) return null
  return <LicoesTab alunoId={alunoLogado.id} turmaId={alunoLogado.turmaId} podeEnviarAnexo />
}
