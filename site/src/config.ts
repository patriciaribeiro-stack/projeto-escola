export const SCHOOL = {
  nome: 'Colégio Vital Brazil',
  anosDeHistoria: 42,
  bairro: 'Bela Vista',
  cidade: 'São Paulo, SP',
  endereco: 'R. Rocha, 98 — Bela Vista, São Paulo - SP, 01330-000',
  telefones: ['(11) 3565-0876', '(11) 3368-3141'],
  email: 'contato@colegiovitalbrazil.com.br',
  horario: 'Segunda a sexta, das 8h às 17h30',
  // Número de teste enquanto a secretaria não confirma o WhatsApp oficial.
  whatsappSecretaria: '5511940285471',
}

export function whatsappLink(mensagem: string) {
  return `https://wa.me/${SCHOOL.whatsappSecretaria}?text=${encodeURIComponent(mensagem)}`
}
