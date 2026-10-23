import { assetUrl } from './profile'

// These describe the personal toolkit, not an employer's technology stack.
export const technologyVisuals: Record<string, { slug: string; accent: string }> = {
  'React.js': { slug: 'react', accent: '#86bfc5' },
  JavaScript: { slug: 'javascript', accent: '#b7af77' },
  HTML: { slug: 'html5', accent: '#bd917e' },
  CSS: { slug: 'css3', accent: '#7fa5bf' },
  'Tailwind CSS': { slug: 'tailwindcss', accent: '#7db5ba' },
  'Daisy UI': { slug: 'daisy-ui', accent: '#aa9cbc' },
  WordPress: { slug: 'wordpress', accent: '#8baab8' },
  'Node.js': { slug: 'nodejs', accent: '#92b190' },
  Express: { slug: 'express', accent: '#b3c2b7' },
  PostgreSQL: { slug: 'postgresql', accent: '#87a4bb' },
  Java: { slug: 'java', accent: '#b9a08a' },
  'C#': { slug: 'csharp', accent: '#a79abb' },
  GitHub: { slug: 'github', accent: '#b5c4ba' },
  'Microsoft Office 365': { slug: 'microsoft-office-365', accent: '#c79b84' },
  SiteGround: { slug: 'siteground', accent: '#adc998' },
  Hostinger: { slug: 'hostinger', accent: '#b7a1df' },
  GoDaddy: { slug: 'godaddy', accent: '#9ed0bf' },
}

export function technologyIcon(name: string) {
  return assetUrl(`icons/${technologyVisuals[name].slug}.svg`)
}
