import { useEffect, useState } from 'react'

const sectionIds = ['project', 'experience', 'skills', 'about', 'credentials', 'contact']

export function useActiveSection() {
  const [active, setActive] = useState('')
  useEffect(() => {
    const sections = sectionIds.map(id => document.getElementById(id)).filter((node): node is HTMLElement => !!node)
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
    }, { rootMargin: '-20% 0px -65% 0px' })
    sections.forEach(section => observer.observe(section))
    const hero = document.querySelector('.resume-hero')
    const home = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setActive('')
    }, { threshold: 0.25 })
    if (hero) home.observe(hero)
    return () => { observer.disconnect(); home.disconnect() }
  }, [])
  return active
}
