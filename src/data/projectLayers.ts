// This is a conceptual breakdown of the supplied project and confirmed role.
export const projectLayers = [
  {
    label: 'Interface', title: 'Interface & API connection',
    stack: ['React.js', 'JavaScript', 'Daisy UI'],
    description: 'The collaborative interface brings course materials, assignments and grade records together. I worked with front-end developers to integrate APIs and support client/server communication.',
  },
  {
    label: 'Application', title: 'Server-side logic',
    stack: ['Node.js', 'Express'],
    description: 'I developed server-side logic and API endpoints, supported user authentication, and implemented data-processing functionality.',
  },
  {
    label: 'Database', title: 'The data foundation',
    stack: ['PostgreSQL'],
    description: 'I designed, managed and queried the database schema for user credentials, course materials, assignments and grade records.',
  },
] as const
