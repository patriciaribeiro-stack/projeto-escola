import { useEffect, useRef, useState } from 'react'
import { IconMic } from './Icons'

function suportaGravacao(): boolean {
  return !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined'
}

function reconhecimentoDeVozDisponivel(): boolean {
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

function formatTempo(segundos: number) {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0')
  const s = Math.floor(segundos % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function Gravador({
  audioDataUrl,
  onAudioChange,
  transcricao,
  onTranscricaoChange,
}: {
  audioDataUrl: string | null
  onAudioChange: (dataUrl: string | null) => void
  transcricao: string
  onTranscricaoChange: (texto: string) => void
}) {
  const [gravando, setGravando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [interim, setInterim] = useState('')
  const [avisoTranscricao, setAvisoTranscricao] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const gravandoRef = useRef(false)
  const falhasSeguidasRef = useRef(0)
  const ultimoInicioRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcricaoRef = useRef(transcricao)
  transcricaoRef.current = transcricao

  const gravacaoOk = suportaGravacao()
  const vozOk = reconhecimentoDeVozDisponivel()

  useEffect(() => () => pararTudo(), []) // eslint-disable-line react-hooks/exhaustive-deps

  function pararTudo() {
    gravandoRef.current = false
    recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    recognitionRef.current?.stop()
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  // No Android o reconhecimento de voz encerra sozinho depois de um
  // silêncio (mesmo com continuous:true) — sem isso a transcrição para
  // de funcionar pouco depois de começar, embora a gravação continue.
  function iniciarReconhecimento() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event: any) => {
      falhasSeguidasRef.current = 0
      let finalTexto = ''
      let interimTexto = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const texto = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTexto += texto + ' '
        else interimTexto += texto
      }
      if (finalTexto) onTranscricaoChange((transcricaoRef.current ? transcricaoRef.current + ' ' : '') + finalTexto.trim())
      setInterim(interimTexto)
    }
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setAvisoTranscricao('Esse celular bloqueou o reconhecimento de voz — grave normalmente e escreva o resumo depois.')
      } else if (event.error === 'audio-capture') {
        setAvisoTranscricao('Esse celular não permite gravar áudio e transcrever ao mesmo tempo — a gravação continua normalmente, mas escreva o resumo depois.')
      }
      // 'no-speech' e 'aborted' são esperados (silêncio, ou paramos de propósito) — o onend cuida de retomar.
    }
    recognition.onend = () => {
      if (!gravandoRef.current) return
      // Silêncio normal reinicia depois de vários segundos — só conta como
      // falha de verdade quando termina quase instantaneamente (sinal de
      // que o celular não deixou o reconhecimento nem começar).
      const duracaoMs = Date.now() - ultimoInicioRef.current
      falhasSeguidasRef.current = duracaoMs < 1200 ? falhasSeguidasRef.current + 1 : 0
      if (falhasSeguidasRef.current > 6) {
        setAvisoTranscricao('A transcrição automática parou de responder nesse celular — grave normalmente e escreva o resumo depois.')
        return
      }
      try {
        ultimoInicioRef.current = Date.now()
        recognition.start()
      } catch {
        // já estava rodando — ignora, o próximo onend tenta de novo
      }
    }
    ultimoInicioRef.current = Date.now()
    recognition.start()
    recognitionRef.current = recognition
  }

  async function iniciar() {
    setErro(null)
    setAvisoTranscricao(null)
    falhasSeguidasRef.current = 0
    try {
      // Inicia o reconhecimento de voz antes de pedir o microfone pro
      // MediaRecorder — em alguns Android, pedir os dois ao mesmo tempo
      // (ou o MediaRecorder primeiro) faz o reconhecimento falhar.
      gravandoRef.current = true
      if (vozOk) iniciarReconhecimento()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        onAudioChange(dataUrl)
      }
      recorder.start()
      recorderRef.current = recorder

      setSegundos(0)
      intervalRef.current = setInterval(() => setSegundos((s) => s + 1), 1000)
      setGravando(true)
    } catch {
      gravandoRef.current = false
      recognitionRef.current?.stop()
      setErro('Não consegui acessar o microfone. Verifique a permissão do navegador.')
    }
  }

  function parar() {
    pararTudo()
    setGravando(false)
    setInterim('')
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  if (!gravacaoOk) {
    return (
      <div className="rounded-xl bg-amber-light px-3.5 py-3 text-[12.5px] font-semibold text-amber">
        Esse navegador não suporta gravação de áudio. Tente pelo Chrome ou Edge.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {!gravando ? (
        <button
          type="button"
          onClick={iniciar}
          className="flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-red bg-red-light py-3 text-[14px] font-bold text-red active:opacity-80"
        >
          <IconMic className="h-5 w-5" />
          {audioDataUrl ? 'Gravar de novo' : 'Iniciar gravação'}
        </button>
      ) : (
        <button
          type="button"
          onClick={parar}
          className="flex items-center justify-center gap-2 rounded-xl bg-red py-3 text-[14px] font-bold text-white active:opacity-90"
        >
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
          Gravando — {formatTempo(segundos)} · toque para parar
        </button>
      )}

      {erro && <p className="text-[12px] font-semibold text-red">{erro}</p>}

      {!vozOk && (
        <p className="text-[11.5px] text-faint">
          Esse navegador não tem transcrição automática ao vivo — a gravação funciona normalmente, mas você vai precisar escrever o resumo à mão.
        </p>
      )}

      {vozOk && avisoTranscricao && <p className="text-[11.5px] font-semibold text-amber">{avisoTranscricao}</p>}

      {gravando && interim && (
        <p className="rounded-lg bg-paper-sunken px-3 py-2 text-[12.5px] italic text-muted">{interim}</p>
      )}

      {audioDataUrl && !gravando && (
        <audio controls src={audioDataUrl} className="w-full" />
      )}
    </div>
  )
}
