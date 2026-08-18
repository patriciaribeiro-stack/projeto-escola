import type { Pai } from '../../types'
import { useSession } from '../../session'
import { EditorFichaResponsavel } from '../shared/FichaResponsavel'

export default function RevisaoFicha({ pai }: { pai: Pai }) {
  const { refreshPai } = useSession()

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-4 px-6 py-10 lg:max-w-xl">
      <div>
        <h1 className="font-display text-lg font-bold">Complete seu cadastro</h1>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
          Antes de continuar, precisamos que você confirme seus dados — endereço, documento e
          contato. É só na primeira vez; depois disso a gente só pede uma confirmação a cada 6
          meses.
        </p>
      </div>
      <EditorFichaResponsavel pai={pai} onSalvo={() => refreshPai()} textoBotao="Confirmar e continuar" />
    </div>
  )
}
