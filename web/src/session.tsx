import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, SESSION_STORAGE_KEY } from './api'
import type { Aluno, Pai, Professor, Role, Substituto } from './types'

interface Session {
  token: string
  role: Role
  personaId: string
  nome: string
}

interface SessionContextValue {
  session: Session | null
  pai: Pai | null
  professor: Professor | null
  substituto: Substituto | null
  alunoLogado: Aluno | null
  nomeAutor: string | null
  aluno: Aluno | null
  filhos: Aluno[]
  selecionarFilho: (id: string) => void
  login: (telefone: string, senha: string) => Promise<Session>
  ativar: (telefone: string, codigoAcesso: string, senha: string) => Promise<Session>
  logout: () => void
  refreshPai: () => Promise<void>
  loadingDetail: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [pai, setPai] = useState<Pai | null>(null)
  const [professor, setProfessor] = useState<Professor | null>(null)
  const [substituto, setSubstituto] = useState<Substituto | null>(null)
  const [alunoLogado, setAlunoLogado] = useState<Aluno | null>(null)
  const [filhos, setFilhos] = useState<Aluno[]>([])
  const [alunoAtivoId, setAlunoAtivoId] = useState<string | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const aluno = filhos.find((a) => a.id === alunoAtivoId) ?? filhos[0] ?? null
  const nomeAutor = substituto ? substituto.nomeAtual : session?.nome ?? null

  async function loadDetail() {
    if (!session) {
      setPai(null)
      setProfessor(null)
      setSubstituto(null)
      setAlunoLogado(null)
      setFilhos([])
      return
    }
    setLoadingDetail(true)
    try {
      if (session.role === 'pai') {
        const detail = await api.get<Pai>(`/pais/${session.personaId}`)
        setPai(detail)
        const listaFilhos = await Promise.all(detail.alunoIds.map((id) => api.get<Aluno>(`/alunos/${id}`)))
        setFilhos(listaFilhos)
        setAlunoAtivoId((atual) => (atual && listaFilhos.some((a) => a.id === atual) ? atual : listaFilhos[0]?.id ?? null))
      } else if (session.role === 'professor') {
        const detail = await api.get<Professor>(`/professores/${session.personaId}`)
        setProfessor(detail)
      } else if (session.role === 'substituto') {
        const detail = await api.get<Substituto>(`/substitutos/${session.personaId}`)
        setSubstituto(detail)
      } else if (session.role === 'aluno') {
        const detail = await api.get<Aluno>(`/alunos/${session.personaId}`)
        setAlunoLogado(detail)
      }
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => {
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  function salvarSessao(result: Session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result))
    setSession(result)
  }

  const login = async (telefone: string, senha: string) => {
    const result = await api.post<Session>('/sessions', { telefone, senha })
    salvarSessao(result)
    return result
  }

  const ativar = async (telefone: string, codigoAcesso: string, senha: string) => {
    const result = await api.post<Session>('/sessions/ativar', { telefone, codigoAcesso, senha })
    salvarSessao(result)
    return result
  }

  const logout = () => {
    api.post('/sessions/logout').catch(() => {})
    localStorage.removeItem(SESSION_STORAGE_KEY)
    setSession(null)
  }

  const value = useMemo(
    () => ({
      session, pai, professor, substituto, alunoLogado, nomeAutor, aluno, filhos,
      selecionarFilho: setAlunoAtivoId,
      login, ativar, logout, refreshPai: loadDetail, loadingDetail,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, pai, professor, substituto, alunoLogado, nomeAutor, aluno, filhos, loadingDetail],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession deve ser usado dentro de SessionProvider')
  return ctx
}
