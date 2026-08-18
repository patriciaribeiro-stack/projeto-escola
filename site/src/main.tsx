import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { ScrollToTop } from './components/ScrollToTop.tsx'
import Home from './pages/Home.tsx'
import AgendeVisita from './pages/AgendeVisita.tsx'
import EducacaoInfantil from './pages/segmentos/EducacaoInfantil.tsx'
import FundamentalI from './pages/segmentos/FundamentalI.tsx'
import FundamentalII from './pages/segmentos/FundamentalII.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/agende-visita" element={<AgendeVisita />} />
        <Route path="/segmentos/educacao-infantil" element={<EducacaoInfantil />} />
        <Route path="/segmentos/fundamental-i" element={<FundamentalI />} />
        <Route path="/segmentos/fundamental-ii" element={<FundamentalII />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
