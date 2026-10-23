import { assetUrl } from './profile'

export const organizations = [
  { id: 'assistly', shortName: 'Assistly', name: 'Assistly BPO Corporation', logo: assetUrl('organizations/assistly.png'), accent: '#ae87d1' },
  { id: 'knowles', shortName: 'Knowles', name: 'Knowles Training Institute', logo: assetUrl('organizations/knowles.png'), accent: '#91b9d2' },
  { id: 'syntax', shortName: 'SYNTAX', name: 'SYNTAX Organization', logo: assetUrl('organizations/syntax.jpg'), accent: '#d4ad72' },
] as const
