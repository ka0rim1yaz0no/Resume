import { assetUrl, education } from './profile'

export const schools = [
  { ...education[0], id: 'sti', shortName: 'STI College', logo: assetUrl('education/sti.webp'), accent: '#d1b755' },
  { ...education[1], id: 'marcelo', shortName: 'Marcelo H. Del Pilar', logo: assetUrl('education/marcelo-del-pilar.webp'), accent: '#91b59b' },
] as const
