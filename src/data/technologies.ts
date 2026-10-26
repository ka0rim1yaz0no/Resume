import { assetUrl } from './profile'

// These describe the personal toolkit, not an employer's technology stack.
export const technologyVisuals: Record<string, { slug: string; accent: string; description: string }> = {
  'React.js': { slug: 'react', accent: '#86bfc5', description: 'Component-based interfaces.' },
  JavaScript: { slug: 'javascript', accent: '#b7af77', description: 'Interface and application logic.' },
  HTML: { slug: 'html5', accent: '#bd917e', description: 'Semantic structure for the web.' },
  CSS: { slug: 'css3', accent: '#7fa5bf', description: 'Layout, presentation and responsive design.' },
  'Tailwind CSS': { slug: 'tailwindcss', accent: '#7db5ba', description: 'Utility-based interface styling.' },
  'Daisy UI': { slug: 'daisy-ui', accent: '#aa9cbc', description: 'Reusable interface components.' },
  WordPress: { slug: 'wordpress', accent: '#8baab8', description: 'Website content and administration.' },
  'Node.js': { slug: 'nodejs', accent: '#92b190', description: 'Server-side JavaScript.' },
  Express: { slug: 'express', accent: '#b3c2b7', description: 'Routing and API endpoints.' },
  PostgreSQL: { slug: 'postgresql', accent: '#87a4bb', description: 'Relational data, schemas and queries.' },
  Java: { slug: 'java', accent: '#b9a08a', description: 'Object-oriented programming.' },
  'C#': { slug: 'csharp', accent: '#a79abb', description: 'Application programming.' },
  GitHub: { slug: 'github', accent: '#b5c4ba', description: 'Version control and collaboration.' },
  'Microsoft Office 365': { slug: 'microsoft-office-365', accent: '#c79b84', description: 'Documents, spreadsheets and presentations.' },
  SiteGround: { slug: 'siteground', accent: '#adc998', description: 'Website hosting and site management.' },
  Hostinger: { slug: 'hostinger', accent: '#b7a1df', description: 'Website hosting and site management.' },
  GoDaddy: { slug: 'godaddy', accent: '#9ed0bf', description: 'Domains, hosting and website management.' },
}

export function technologyIcon(name: string) {
  return assetUrl(`icons/${technologyVisuals[name].slug}.svg`)
}
