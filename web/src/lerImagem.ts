import heic2any from 'heic2any'

// Fotos de iPhone às vezes vêm em HEIC — a maioria dos navegadores (Chrome,
// Firefox, e até Safari fora do ecossistema Apple) não consegue exibir isso
// num <img>, então a foto "sobe" sem erro mas nunca aparece em lugar nenhum,
// como se o arquivo estivesse corrompido. Convertemos pra JPEG antes de ler.
function pareceHeic(file: File): boolean {
  const tipo = file.type.toLowerCase()
  if (tipo === 'image/heic' || tipo === 'image/heif') return true
  // Muitos celulares não preenchem o campo "type" pra HEIC — cai pra extensão.
  if (tipo) return false
  const nome = file.name.toLowerCase()
  return nome.endsWith('.heic') || nome.endsWith('.heif')
}

export async function lerArquivoComoDataUrl(file: File): Promise<string> {
  let arquivo: File | Blob = file
  if (pareceHeic(file)) {
    const convertido = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
    arquivo = Array.isArray(convertido) ? convertido[0] : convertido
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(arquivo)
  })
}
