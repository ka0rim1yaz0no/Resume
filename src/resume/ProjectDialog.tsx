import { useEffect, useRef } from 'react'
import { project } from '../data/profile'
import { Icon } from '../components/Icon'
import { ProjectArchitecture } from '../components/ResumeVisuals'

export function ProjectDialog({ close }: { close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    dialog?.showModal()
    document.documentElement.classList.add('dialog-open')
    return () => { dialog?.close(); document.documentElement.classList.remove('dialog-open'); previous?.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} className="studio-dialog" aria-labelledby="dialog-title" onCancel={close} onClick={event => { if (event.target === ref.current) close() }} data-lenis-prevent><div className="dialog-inner">
    <button className="icon-button dialog-close" onClick={close} aria-label="Close case study"><Icon name="close" /></button>
    <p className="section-label">{project.label} · {project.period}</p><h2 id="dialog-title">{project.title}</h2>
    <div className="dialog-project-art dialog-architecture"><ProjectArchitecture /></div>
    <p>{project.description}</p><h3>My contribution</h3><ul className="scope-list">{project.scope.map(item => <li key={item}><Icon name="check" />{item}</li>)}</ul><div className="tags">{project.technology.map(item => <span key={item}>{item}</span>)}</div><p className="project-note">{project.note}</p><button className="button button-primary" onClick={close}>Back to my portfolio <Icon name="arrow" /></button>
  </div></dialog>
}
