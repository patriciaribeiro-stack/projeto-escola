import { useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../api'
import { usePolling } from '../../usePolling'
import { Button, Card, EmptyState, Pill, SectionLabel } from '../../components/ui'
import { imprimirEtiquetas, gerarSenhaAleatoria, type BlocoEtiqueta } from './CadastrosPessoas'
import { inputCls } from './formHelpers'

type Pessoa = { id: string; nome: string; telefone: string; bloqueadoEm: string | null }
type Credencial = { nome: string; telefone: string; texto: string; rotulo: string }


function EquipeSecao({
  titulo,
  rotuloNovo,
  rotuloExcluir,
  dicaNome,
  endpoint,
  setFilaImpressao,
}: {
  titulo: string
  rotuloNovo: string
  rotuloExcluir: string
  dicaNome: string
  endpoint: string
  setFilaImpressao: Dispatch<SetStateAction<Credencial[]>>
}) {
  const { data: pessoas, reload } = usePolling<Pessoa[]>(async () => api.get(endpoint), 15000, [])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await api.post(endpoint, { nome, telefone, senha })
      setFilaImpressao((prev) => [...prev, { nome, telefone, texto: senha, rotulo: 'Senha' }])
      setNome('')
      setTelefone('')
      setSenha('')
      setMostrarForm(false)
      reload()
    } finally {
      setSalvando(false)
    }
  }

  function editar(p: Pessoa) {
    setEditandoId(p.id)
    setEditNome(p.nome)
    setEditTelefone(p.telefone)
  }

  function cancelarEdicao() {
    setEditandoId(null)
  }

  async function salvarEdicao() {
    if (!editandoId) return
    setSalvandoEdicao(true)
    try {
      await api.patch(`${endpoint}/${editandoId}`, { nome: editNome, telefone: editTelefone })
      setEditandoId(null)
      reload()
    } finally {
      setSalvandoEdicao(false)
    }
  }

  async function redefinirSenha(p: Pessoa) {
    const novaSenha = prompt('Digite a nova senha (mínimo 6 caracteres):')
    if (!novaSenha) return
    if (novaSenha.length < 6) return alert('A senha precisa ter pelo menos 6 caracteres.')
    await api.patch(`${endpoint}/${p.id}`, { novaSenha })
    setFilaImpressao((prev) => [...prev, { nome: p.nome, telefone: p.telefone, texto: novaSenha, rotulo: 'Senha' }])
    alert('Senha redefinida. Informe a nova senha à pessoa.')
  }

  async function excluir(id: string) {
    if (!confirm(`Excluir ${rotuloExcluir}?`)) return
    await api.delete(`${endpoint}/${id}`)
    reload()
  }

  async function alternarBloqueio(p: Pessoa) {
    if (p.bloqueadoEm) {
      await api.patch(`${endpoint}/${p.id}`, { bloqueadoEm: null })
    } else {
      if (!confirm(`Bloquear o acesso de ${p.nome}? O login para de funcionar imediatamente, mas o cadastro e o histórico continuam intactos.`)) return
      await api.patch(`${endpoint}/${p.id}`, { bloqueadoEm: new Date().toISOString() })
    }
    reload()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>{titulo}</SectionLabel>
        <Button className="w-auto px-3.5 py-2 text-[12.5px]" onClick={() => setMostrarForm((v) => !v)} variant={mostrarForm ? 'ghost' : 'primary'}>
          {mostrarForm ? 'Cancelar' : rotuloNovo}
        </Button>
      </div>

      {mostrarForm && (
        <Card>
          <SectionLabel>{rotuloNovo}</SectionLabel>
          <div className="mt-2.5 flex flex-col gap-2.5">
            <input autoComplete="off" className={inputCls} placeholder={dicaNome} value={nome} onChange={(e) => setNome(e.target.value)} />
            <input autoComplete="off" inputMode="numeric" className={inputCls} placeholder="Telefone (com DDD)" value={telefone} onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))} />
            <div className="flex gap-2">
              <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="Senha inicial" value={senha} onChange={(e) => setSenha(e.target.value)} />
              <button type="button" onClick={() => setSenha(gerarSenhaAleatoria())} className="whitespace-nowrap rounded-lg bg-paper-sunken px-3 text-[12px] font-bold text-ink">
                Gerar senha
              </button>
            </div>
            <Button disabled={!nome || !telefone || senha.length < 6 || salvando} onClick={salvar}>
              {salvando ? 'Salvando...' : rotuloNovo}
            </Button>
          </div>
        </Card>
      )}

      {!pessoas?.length && <EmptyState>Nenhum cadastro ainda.</EmptyState>}
      <div className="flex flex-col gap-2">
        {pessoas?.map((p) => (
          <Card key={p.id}>
            {editandoId === p.id ? (
              <div className="flex flex-col gap-2.5">
                <input autoComplete="off" className={inputCls} placeholder={dicaNome} value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                <input autoComplete="off" inputMode="numeric" className={inputCls} placeholder="Telefone (com DDD)" value={editTelefone} onChange={(e) => setEditTelefone(e.target.value.replace(/\D/g, ''))} />
                <div className="mt-1 flex gap-3">
                  <Button disabled={!editNome || !editTelefone || salvandoEdicao} onClick={salvarEdicao}>
                    {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                  <button onClick={cancelarEdicao} className="text-[11.5px] font-bold text-muted">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold">{p.nome}</span>
                  {p.bloqueadoEm && <Pill tone="red">Bloqueado</Pill>}
                </div>
                <p className="mt-1 text-[11.5px] text-muted">{p.telefone}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <button onClick={() => editar(p)} className="text-[11.5px] font-bold text-blue">Editar</button>
                  <button onClick={() => redefinirSenha(p)} className="text-[11.5px] font-bold text-blue">Redefinir senha</button>
                  <button onClick={() => alternarBloqueio(p)} className={`text-[11.5px] font-bold ${p.bloqueadoEm ? 'text-green-dark' : 'text-amber'}`}>
                    {p.bloqueadoEm ? 'Reativar login' : 'Suspender login'}
                  </button>
                  <button onClick={() => excluir(p.id)} className="text-[11.5px] font-bold text-red">Excluir</button>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

export function CadastrosEquipe() {
  const [filaImpressao, setFilaImpressao] = useState<Credencial[]>([])

  const blocos: BlocoEtiqueta[] = filaImpressao.map((c) => ({
    titulo: c.nome,
    linhas: [{ label: 'Acesso', valor: `Tel ${c.telefone} · ${c.rotulo}: ${c.texto}` }],
  }))

  return (
    <div className="flex flex-col gap-5">
      {!!filaImpressao.length && (
        <Card className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold">{filaImpressao.length} credencial(is) pronta(s) pra imprimir</span>
          <div className="flex gap-3">
            <button onClick={() => imprimirEtiquetas('Credenciais — Acessos', blocos)} className="text-[11.5px] font-bold text-blue">
              Imprimir etiquetas ({filaImpressao.length})
            </button>
            <button onClick={() => setFilaImpressao([])} className="text-[11.5px] font-bold text-muted">Limpar fila</button>
          </div>
        </Card>
      )}

      <EquipeSecao
        titulo="Coordenação"
        rotuloNovo="Novo acesso"
        rotuloExcluir="essa coordenadora"
        dicaNome="Nome completo"
        endpoint="/coordenadores"
        setFilaImpressao={setFilaImpressao}
      />
      <EquipeSecao
        titulo="Secretaria"
        rotuloNovo="Novo acesso"
        rotuloExcluir="essa secretária"
        dicaNome="Nome completo"
        endpoint="/secretarios"
        setFilaImpressao={setFilaImpressao}
      />
      <EquipeSecao
        titulo="Recepção"
        rotuloNovo="Novo acesso"
        rotuloExcluir="essa recepcionista"
        dicaNome="Nome completo"
        endpoint="/recepcionistas"
        setFilaImpressao={setFilaImpressao}
      />
      <EquipeSecao
        titulo="Monitor do Integral"
        rotuloNovo="Novo acesso"
        rotuloExcluir="esse(a) monitor(a)"
        dicaNome="Nome completo"
        endpoint="/monitores-integral"
        setFilaImpressao={setFilaImpressao}
      />
      <EquipeSecao
        titulo="Professor(a) eventual"
        rotuloNovo="Novo acesso"
        rotuloExcluir="esse(a) professor(a) eventual"
        dicaNome="Nome do(a) professor(a) eventual"
        endpoint="/substitutos"
        setFilaImpressao={setFilaImpressao}
      />
    </div>
  )
}
