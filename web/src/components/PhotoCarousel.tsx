import type { FotoRotina } from '../types'
import { timeAgo } from './ui'
import { IconDownload } from './Icons'

export function PhotoCarousel({ fotos, onDelete }: { fotos: FotoRotina[]; onDelete?: () => void }) {
  if (!fotos.length) return null
  const legenda = fotos[0]?.legenda

  return (
    <div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        <div aria-hidden className="w-[14%] flex-shrink-0" />
        {fotos.map((f) => (
          <div key={f.id} className="relative w-[72%] flex-shrink-0 snap-center">
            <img src={f.fotoDataUrl} alt={f.legenda} className="aspect-square w-full rounded-xl object-cover" />
            <a
              href={f.fotoDataUrl}
              download={f.fotoNome}
              aria-label="Baixar foto"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white"
            >
              <IconDownload className="h-4 w-4" />
            </a>
          </div>
        ))}
        <div aria-hidden className="w-[14%] flex-shrink-0" />
      </div>
      <div className="mt-2 flex items-center justify-between px-1">
        <div>
          {legenda && <p className="text-[12.5px] text-ink">{legenda}</p>}
          <p className="text-[11px] text-faint">{timeAgo(fotos[0].criadoEm)} · {fotos.length} foto{fotos.length === 1 ? '' : 's'}</p>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="flex-shrink-0 text-[11.5px] font-bold text-red">
            Apagar publicação
          </button>
        )}
      </div>
    </div>
  )
}
