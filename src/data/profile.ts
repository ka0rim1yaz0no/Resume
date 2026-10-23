export const profile = {
  fullName: 'Vincent Layzie C. Del Rosario',
  name: 'Vincent Layzie C. Del Rosario',
  specialty: 'Information Technology · Web Development · Project Management',
  currentRole: 'Website Developer at Assistly BPO Corporation',
  email: 'vincentdelrosario2004@gmail.com',
  phone: '(+63) 997-470-9845',
  phoneHref: 'tel:+639974709845',
  github: 'https://github.com/ka0rim1yaz0no',
  location: 'Philippines',
  summary: 'I currently work as a Website Developer at Assistly BPO Corporation in Baguio City, Philippines. I bring analytical thinking, clear communication, and attention to detail to systems development and project work. From server-side logic and structured data to administration and quality assurance, I enjoy understanding how things fit together—and making them work better.',
  about: 'Adaptability and continuous learning shape how I work. I take initiative, approach problems methodically, and value reliable collaboration across technical and administrative teams. My interests connect web technologies, software systems, and the organization behind a well-executed project.',
}

export type Project = {
  id: string; title: string; label: string; period: string; description: string; scope: string[]; technology: string[]; note: string
}
export const project: Project = {
  id: 'sta-lucia-lms',
  title: 'Sta. Lucia National Highschool: Learning Management System',
  label: 'Capstone Project',
  period: 'September–November 2025',
  description: 'A collaborative learning management system for course materials, assignments, and grade records. My contribution focused on the backend, the database, and the connections between the application’s layers.',
  scope: [
    'Developed and implemented server-side logic using Node.js and Express.',
    'Supported user authentication and implemented data-processing functionality and API endpoints.',
    'Designed, managed, and queried a PostgreSQL database schema for user credentials, course materials, assignments, and grade records.',
    'Collaborated with front-end developers, integrated APIs, and supported client/server communication.',
  ],
  technology: ['React.js', 'JavaScript', 'Node.js', 'Express', 'Daisy UI', 'PostgreSQL'],
  note: 'Conceptual architecture overview, not an actual application screenshot. Public repository and live-demo links have not been supplied.',
}

export type ProfessionalExperience = {
  organization: string; role: string; location: string; period: string; hours: number | null
  current?: boolean; startDate?: string; endDate?: string | null; description: string; responsibilities: string[]
}
export const experience: ProfessionalExperience[] = [
  {
    organization: 'Assistly BPO Corporation', role: 'Website Developer',
    location: 'Baguio City, Philippines', period: 'July 15, 2026–Present', hours: null,
    current: true, startDate: '2026-07-15', endDate: null,
    description: '',
    // All five duties confirmed by the portfolio owner on 23 October 2026.
    responsibilities: ['Website development and maintenance.', 'Responsive web interface implementation.', 'Website functionality testing and troubleshooting.', 'User interface and usability improvements.', 'Website updates and collaboration on design requirements.'],
  },
  {
    organization: 'Knowles Training Institute', role: 'Project Management & Administration Intern',
    location: 'Singapore — Remote', period: 'February–May 2026', hours: 486,
    description: 'Project management and administrative support across a remote, global workflow.',
    responsibilities: ['WordPress website administration, maintenance, and corporate website operational support.', 'Document review, quality assurance checking, and data organization.', 'Time management, analytical thinking, precision, and global workflow collaboration.', 'Adaptability, professionalism, and practical problem-solving.'],
  },
  {
    organization: 'SYNTAX Organization', role: 'Organizational experience',
    location: 'Malolos, Bulacan', period: 'July 2023–July 2025', hours: null,
    description: 'Official Student Organization of STI College–Malolos.',
    responsibilities: ['Organizational planning and communication management.', 'Event coordination, logistics planning, and stakeholder planning.', 'Resource management and student engagement.', 'Support for institutional and organizational objectives.'],
  },
]

export const skillGroups = [
  { label: 'Interfaces & web', skills: ['React.js', 'JavaScript', 'HTML', 'CSS', 'Tailwind CSS', 'Daisy UI', 'WordPress'] },
  { label: 'Logic & data', skills: ['Node.js', 'Express', 'PostgreSQL', 'Java', 'C#'] },
  { label: 'Tools & productivity', skills: ['GitHub', 'Microsoft Office 365', 'SiteGround', 'Hostinger', 'GoDaddy'] },
]
export const competencies = [
  { label: 'Thinking & systems', items: ['Problem-solving', 'Research and analysis', 'Systems analysis', 'Data architecture', 'Attention to detail'] },
  { label: 'Planning & delivery', items: ['Project management', 'Time management', 'Quality assurance', 'Strategic operations', 'Agile execution'] },
  { label: 'Working together', items: ['Reliability', 'Strong work disposition', 'Professional ethics', 'Team collaboration', 'Cross-functional collaboration'] },
]
export const education = [
  { institution: 'STI College–Malolos', course: 'Bachelor of Science in Information Technology', location: 'Malolos, Bulacan', completion: null },
  { institution: 'Marcelo H. Del Pilar National High School', course: 'TVL–Information and Communication Technology', location: 'Malolos, Bulacan', completion: 'Graduate, April 2020' },
]
export const languages = [{ name: 'Filipino', level: 'Native proficiency' }, { name: 'English', level: 'Professional working proficiency' }]
export const interests = ['Game Development', 'Web Technologies', 'Software Systems', 'Technology Research', 'Project Manager (career interest)']

export const credentials = [
  { title: 'Knowles Training Institute: Information Technology – Internship', year: '2026' },
  { title: 'AI Ready ASEAN: ASEAN Foundation', year: '2026' },
  { title: 'Alison Empower Yourself: Diploma in Cyber Security', year: '2024' },
  { title: 'SAP S/4HANA: HCM, WM, EAM, CS, QM Modules using Global Bike', year: '2024' },
  { title: 'Bridging Knowledge: Exploring Digital Divide, Cybersecurity and OS Trends, and Professionalism in IT', year: '2024' },
  { title: 'SYNTAX Endgame: Gaming towards Excellence', year: '2024' },
  { title: '1st Runner Up in CODEFEST Tagisan ng Tanlino', year: '2024–2025 Locale Level' },
  { title: 'Certificate of Participation in CODEFEST Tagisan ng Tanlino', year: '2024–2025 Locale Level' },
  { title: 'FDWP: Monthly Community Day', year: '2023' },
  { title: 'The First IT Congress: A Quantum Leap Towards Excellence', year: '2023' },
]

export const documents: { label: string; filename: string; url: string | null }[] = [
  { label: 'Professional résumé', filename: 'Vincent_Del_Rosario_PROFRESUME.pdf', url: null },
  { label: 'Curriculum vitae', filename: 'VLDR-CV.pdf', url: null },
]

export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
