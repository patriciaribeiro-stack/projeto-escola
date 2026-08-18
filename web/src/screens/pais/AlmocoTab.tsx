import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { CardapioDia } from '../../types'
import { Card, EmptyState, SectionLabel, SubjectChip, formatDateBR } from '../../components/ui'
import { IconUtensils } from '../../components/Icons'

export default function AlmocoTab() {
  const { data: semana } = usePolling<CardapioDia[]>(async () => api.get('/cardapio/semana'), 30000, [])
  const hojeStr = new Date().toISOString().slice(0, 10)
  const hoje = semana?.find((d) => d.data === hojeStr)
  const proximos = semana
    ?.filter((d) => d.data > hojeStr)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 4)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionLabel>Cardápio de hoje</SectionLabel>
        {hoje ? (
          <div className="mt-2 rounded-xl bg-amber-light p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-paper-raised text-amber">
                <IconUtensils className="h-4 w-4" />
              </span>
              <p className="text-[14px] font-bold leading-snug text-ink">{hoje.descricao}</p>
            </div>
            {!!hoje.itens.length && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {hoje.itens.map((item) => (
                  <SubjectChip key={item}>{item}</SubjectChip>
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyState>Cardápio de hoje ainda não publicado.</EmptyState>
        )}
        <p className="mt-2 px-1 text-[11px] text-faint">Almoço servido apenas para os alunos do integral.</p>
      </div>

      {!!proximos?.length && (
        <div>
          <SectionLabel>Próximos dias</SectionLabel>
          <div className="mt-2 flex flex-col gap-2">
            {proximos.map((d) => (
              <Card key={d.id} className="flex items-center gap-3">
                <span className="text-[12px] font-bold text-muted">{formatDateBR(d.data)}</span>
                <span className="text-[12.5px]">{d.descricao}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
