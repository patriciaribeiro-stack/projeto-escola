import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../session'
import type { Role } from '../types'
import { Button } from '../components/ui'

const roleHome: Record<Role, string> = {
  pai: '/pais',
  professor: '/professor',
  coordenacao: '/coordenacao',
  secretaria: '/secretaria',
  recepcao: '/recepcao',
  integral: '/integral',
  substituto: '/substituto',
  aluno: '/aluno',
}

const inputCls = 'rounded-xl border border-line bg-paper-raised px-3.5 py-3 text-[14px] outline-none focus:border-blue'

type Modo = 'entrar' | 'ativar'

export default function Login() {
  const [modo, setModo] = useState<Modo>('entrar')
  const { login, ativar } = useSession()
  const navigate = useNavigate()

  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [codigoAcesso, setCodigoAcesso] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar() {
    setErro('')
    setEnviando(true)
    try {
      const result = await login(telefone, senha)
      navigate(roleHome[result.role])
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  async function ativarConta() {
    setErro('')
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    if (senha !== confirmarSenha) return setErro('As senhas não coincidem.')
    setEnviando(true)
    try {
      await ativar(telefone, codigoAcesso, senha)
      navigate(roleHome.pai)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="bg-paper-textured flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3 rounded-2xl bg-navy px-5 py-3.5 shadow-[0_0_0_0.5px_rgba(0,0,0,.06)]">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white">
          <span className="font-display text-[13px] font-bold text-navy">VB</span>
        </div>
        <span className="font-display text-[15px] font-bold text-white">Colégio Vital Brazil</span>
      </div>

      <div className="flex w-full max-w-[400px] flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-6 shadow-[0_0_0_0.5px_rgba(0,0,0,.06)]">
        <input
          autoComplete="off"
          className={inputCls}
          placeholder="Telefone ou nome de acesso"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        {modo === 'entrar' && (
          <input
            autoComplete="off"
            type="password"
            className={inputCls}
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        )}

        {modo === 'ativar' && (
          <>
            <input
              autoComplete="off"
              inputMode="numeric"
              className={inputCls}
              placeholder="Código de matrícula"
              value={codigoAcesso}
              onChange={(e) => setCodigoAcesso(e.target.value.replace(/\D/g, ''))}
            />
            <input
              autoComplete="off"
              type="password"
              className={inputCls}
              placeholder="Escolha uma senha (mín. 6 caracteres)"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <input
              autoComplete="off"
              type="password"
              className={inputCls}
              placeholder="Confirme a senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
            />
          </>
        )}

        {erro && <p className="text-[12.5px] font-semibold text-red">{erro}</p>}

        <Button
          disabled={enviando || !telefone || !senha || (modo === 'ativar' && (!codigoAcesso || !confirmarSenha))}
          onClick={modo === 'entrar' ? entrar : ativarConta}
        >
          {enviando ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : 'Ativar acesso'}
        </Button>

        <button
          type="button"
          onClick={() => {
            setModo(modo === 'entrar' ? 'ativar' : 'entrar')
            setErro('')
            setSenha('')
            setConfirmarSenha('')
          }}
          className="mt-1 text-center text-[12.5px] font-semibold text-blue"
        >
          {modo === 'entrar' ? 'Recebi um código de matrícula da escola' : '← Já tenho senha, voltar ao login'}
        </button>
      </div>
    </div>
  )
}
