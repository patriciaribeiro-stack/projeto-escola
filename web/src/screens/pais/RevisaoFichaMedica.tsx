import type { Aluno } from '../../types'
import { useSession } from '../../session'
import { EditorFichaMedica } from '../shared/FichaMedica'

export default function RevisaoFichaMedica({ aluno }: { aluno: Aluno }) {
  const { refreshPai } = useSession()

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-4 px-6 py-10 lg:max-w-xl">
      <div>
        <h1 className="font-display text-lg font-bold">Ficha médica de {aluno.nome}</h1>
      </div>
      <EditorFichaMedica aluno={aluno} onSalvo={() => refreshPai()} textoBotao="Confirmar e continuar" />
    </div>
  )
}
