import { useState } from 'react'
import { api } from '../../api'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import type { Pai, Turma } from '../../types'
import { Button, Card, Pill, SectionLabel } from '../../components/ui'
import { EditorFichaResponsavel, precisaLembrarFicha } from '../shared/FichaResponsavel'

function MeusDados({ pai }: { pai: Pai }) {
  const { refreshPai } = useSession()
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const lembrete = precisaLembrarFicha(pai)

  async function confirmarSemMudar() {
    setConfirmando(true)
    try {
      await api.patch(`/pais/${pai.id}`, { fichaAtualizadaEm: new Date().toISOString() })
      await refreshPai()
    } finally {
      setConfirmando(false)
    }
  }

  if (editando) {
    return (
      <div>
        <SectionLabel>Meus dados</SectionLabel>
        <div className="mt-2">
          <EditorFichaResponsavel pai={pai} onSalvo={() => { setEditando(false); refreshPai() }} textoBotao="Salvar alterações" />
          <button onClick={() => setEditando(false)} className="mt-2 text-[12px] font-bold text-muted">Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionLabel>Meus dados</SectionLabel>
      {lembrete && (
        <Card className="mt-2 border-amber bg-amber-light">
          <p className="text-[12.5px] font-semibold text-amber">
            Faz mais de 6 meses desde a última confirmação do seu cadastro — está tudo certo ainda?
          </p>
          <div className="mt-2 flex gap-2">
            <Button className="w-auto px-3 py-2 text-[12px]" disabled={confirmando} onClick={confirmarSemMudar}>
              {confirmando ? 'Confirmando...' : 'Confirmar que nada mudou'}
            </Button>
            <Button variant="ghost" className="w-auto px-3 py-2 text-[12px]" onClick={() => setEditando(true)}>
              Editar
            </Button>
          </div>
        </Card>
      )}
      <Card className="mt-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold">{pai.nome}</div>
            <div className="text-[11.5px] text-muted">{pai.telefone}</div>
          </div>
          <button onClick={() => setEditando(true)} className="text-[12px] font-bold text-blue">Editar</button>
        </div>
      </Card>
    </div>
  )
}

export default function Perfil() {
  const { session, pai, aluno, filhos, selecionarFilho } = useSession()
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const nomeTurma = (turmaId: string) => turmas?.find((t) => t.id === turmaId)?.nome ?? 'Matrícula ativa'

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-light text-[15px] font-bold text-blue">
          {session?.nome
            .split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')}
        </div>
        <div>
          <div className="font-display text-[15px] font-bold">{session?.nome}</div>
          <div className="text-[12px] text-muted">Responsável</div>
        </div>
      </Card>

      {pai && <MeusDados pai={pai} />}

      <div>
        <SectionLabel>Aluno(a)</SectionLabel>
        <div className="mt-2 flex flex-col gap-2">
          {filhos.map((f) => (
            <button key={f.id} onClick={() => selecionarFilho(f.id)} className="text-left">
              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold">{f.nome}</div>
                  <div className="text-[11.5px] text-muted">{nomeTurma(f.turmaId)}</div>
                </div>
                {f.id === aluno?.id && <Pill tone="blue">Selecionado</Pill>}
              </Card>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Autorização de medicação</SectionLabel>
        <Card className="mt-2">
          <p className="text-[12.5px] text-muted">
            O colégio não medica seu filho sem a sua autorização. Fique de olho nas notificações de saúde
            no app — é por ali que você autoriza, na hora, se for preciso.
          </p>
        </Card>
      </div>

      <div>
        <SectionLabel>Notificações</SectionLabel>
        <Card className="mt-2">
          <p className="text-[12.5px] text-muted">
            Por enquanto, os avisos aparecem aqui dentro do app. Quando você instalar o app no celular, as ocorrências
            de saúde também vão te avisar por notificação, mesmo com o celular bloqueado.
          </p>
        </Card>
      </div>
    </div>
  )
}
