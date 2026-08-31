// Componente único de abas, reutilizado em todo o app (ver plano na tela
// Turma/Relatórios da coordenação, onde esse padrão apareceu primeiro).
//
// TabGroup: navegação principal entre categorias — card branco com borda,
// pontinho colorido + texto (a cor só "aparece" na aba ativa, com uma linha
// colorida embaixo dela). Aceita uma fileira `secondary` opcional (sub-abas
// neutras, com a ativa no tom suave da cor da categoria principal selecionada).
//
// TabPills: filtro compacto avulso (sem o card, sem pontinho) — pra filtros
// de conteúdo dentro de uma tela (ex: "Pendentes/Vencidas/Realizadas"), que já
// usavam uma pílula sólida antes.
//
// As duas usam a mesma paleta de 5 tons (--color-tab-* em index.css). Se
// nenhum tom for informado por aba, os tons se repetem em ordem — como o app
// não tem telas com mais de 5 abas hoje, isso já garante cores distintas.

export type TabTom = 'blue' | 'terracotta' | 'sage' | 'mustard' | 'mauve'

export const TOM_CYCLE: TabTom[] = ['blue', 'terracotta', 'sage', 'mustard', 'mauve']

export const TOM_CLASSES: Record<TabTom, { dot: string; underline: string; tint: string; texto: string }> = {
  blue: { dot: 'bg-tab-blue', underline: 'border-tab-blue', tint: 'bg-tab-blue-tint', texto: 'text-tab-blue' },
  terracotta: { dot: 'bg-tab-terracotta', underline: 'border-tab-terracotta', tint: 'bg-tab-terracotta-tint', texto: 'text-tab-terracotta' },
  sage: { dot: 'bg-tab-sage', underline: 'border-tab-sage', tint: 'bg-tab-sage-tint', texto: 'text-tab-sage' },
  mustard: { dot: 'bg-tab-mustard', underline: 'border-tab-mustard', tint: 'bg-tab-mustard-tint', texto: 'text-tab-mustard' },
  mauve: { dot: 'bg-tab-mauve', underline: 'border-tab-mauve', tint: 'bg-tab-mauve-tint', texto: 'text-tab-mauve' },
}

function tomPorIndice(i: number, explicito?: TabTom) {
  return TOM_CLASSES[explicito ?? TOM_CYCLE[i % TOM_CYCLE.length]]
}

export interface TabOption<T extends string> {
  key: T
  label: string
  tom?: TabTom
  /** força texto vermelho (pendência/urgência), independente de ativa ou não */
  alerta?: boolean
}

export interface SecondaryTabOption<S extends string> {
  key: S
  label: string
}

export function TabGroup<T extends string, S extends string = string>({
  tabs, value, onChange, secondary,
}: {
  tabs: TabOption<T>[]
  value: T
  onChange: (key: T) => void
  secondary?: {
    tabs: SecondaryTabOption<S>[]
    value: S
    onChange: (key: S) => void
  }
}) {
  const indiceAtivo = tabs.findIndex((t) => t.key === value)
  const tomAtivo = tomPorIndice(indiceAtivo < 0 ? 0 : indiceAtivo, tabs[indiceAtivo]?.tom)

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-3.5">
      <div className={`flex flex-wrap items-center justify-center gap-4 ${secondary ? 'border-b border-line pb-1' : ''}`}>
        {tabs.map((t, i) => {
          const tom = tomPorIndice(i, t.tom)
          const ativa = value === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`flex items-center gap-1.5 border-b-[2.5px] pb-2.5 text-[13.5px] font-semibold transition-colors ${
                ativa ? `${tom.underline} text-navy` : 'border-transparent text-muted'
              } ${t.alerta ? 'text-red' : ''}`}
            >
              <span className={`h-[7px] w-[7px] flex-shrink-0 rounded-full ${tom.dot}`} />
              {t.label}
            </button>
          )
        })}
      </div>

      {secondary && (
        <div className="flex flex-wrap justify-center gap-1 pt-2.5">
          {secondary.tabs.map((s) => {
            const ativa = secondary.value === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => secondary.onChange(s.key)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${ativa ? `${tomAtivo.tint} ${tomAtivo.texto}` : 'text-muted'}`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TabPills<T extends string>({
  tabs, value, onChange, tom = 'blue',
}: {
  tabs: { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
  tom?: TabTom
}) {
  const c = TOM_CLASSES[tom]
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {tabs.map((t) => {
        const ativa = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              ativa ? `border-transparent text-white ${c.dot}` : 'border-line text-muted'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
