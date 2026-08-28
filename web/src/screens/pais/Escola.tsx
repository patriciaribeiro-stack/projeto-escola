import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EventosTab from './EventosTab'
import AchadosTab from './AchadosTab'
import AlimentacaoTab from './AlimentacaoTab'
import AtendimentosTab from './AtendimentosTab'
import { TabGroup, type TabOption } from '../../components/TabGroup'

type Tab = 'eventos' | 'alimentacao' | 'achados' | 'atendimentos'

const TABS: TabOption<Tab>[] = [
  { key: 'eventos', label: 'Eventos' },
  { key: 'alimentacao', label: 'Alimentação' },
  { key: 'achados', label: 'Achados e Perdidos' },
  { key: 'atendimentos', label: 'Reuniões' },
]

export default function Escola() {
  const [params] = useSearchParams()
  const tabInicial = (params.get('tab') as Tab) || 'eventos'
  const [tab, setTab] = useState<Tab>(tabInicial)

  return (
    <div className="flex flex-col gap-4">
      <TabGroup tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'eventos' && <EventosTab />}
      {tab === 'alimentacao' && <AlimentacaoTab />}
      {tab === 'achados' && <AchadosTab />}
      {tab === 'atendimentos' && <AtendimentosTab />}
    </div>
  )
}
