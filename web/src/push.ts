import { api } from './api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function suportaPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function statusPermissaoPush(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function jaInscrito(): Promise<boolean> {
  if (!suportaPush()) return false
  const registro = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registro?.pushManager.getSubscription()
  return !!subscription
}

export type ResultadoAtivarPush = 'ok' | 'negada' | 'erro'

export async function ativarPush(): Promise<ResultadoAtivarPush> {
  if (!suportaPush()) return 'erro'
  try {
    const permissao = await Notification.requestPermission()
    if (permissao !== 'granted') return 'negada'

    const registro = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const { publicKey } = await api.get<{ publicKey: string }>('/push/chave-publica')
    if (!publicKey) return 'erro'

    let subscription = await registro.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })
    }

    await api.post('/push/inscrever', subscription.toJSON())
    return 'ok'
  } catch {
    return 'erro'
  }
}
