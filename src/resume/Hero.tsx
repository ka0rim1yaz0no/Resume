import type { CSSProperties } from 'react'
import { SceneWindow } from '../components/SceneWindow'
import { Icon } from '../components/Icon'
import { modelIds, modelRegistry, type ModelId } from '../data/assets'
import { assetUrl, documents, profile } from '../data/profile'
import { useModelExploration } from '../hooks/useModelExploration'

export function Hero({ model, selectModel, turnLeft, turnRight, resetView, paused, systemReduced, toggleMotion }: { model: ModelId; selectModel: (id: ModelId) => void; turnLeft: () => void; turnRight: () => void; resetView: () => void; paused: boolean; systemReduced: boolean; toggleMotion: () => void }) {
  const objectIndex = Math.max(0, modelIds.indexOf(model))
  const assetAccent = ['#8d7c54', '#7a8585', '#ac9562'][objectIndex]
  const resume = documents[0]
  const exploration = useModelExploration(model, resetView)
  return <section className="hero resume-hero container" aria-labelledby="hero-title">
    <div className="hero-copy">
      <div className="hero-enter hero-kicker"><span className="status-dot" />Vincent’s digital systems studio · Philippines</div>
      <h1 id="hero-title" className="hero-enter" aria-label={profile.fullName}>Vincent <br />Layzie C. <br />Del Rosario</h1>
      <p className="hero-enter specialty-line">{profile.specialty}</p>
      <p className="hero-enter hero-description">Interfaces. Logic. Data.<br />Connected with purpose.</p>
      <div className="hero-enter hero-actions"><a className="button button-primary" href="#project">View my project <Icon name="arrow" /></a><a className="text-link" href="#contact">Get in touch <Icon name="down" /></a></div>
      <div className="hero-enter resume-download">{resume.url ? <a className="text-link" href={assetUrl(resume.url)} download>Download résumé <Icon name="down" /></a> : <a className="text-link" href="#experience">Explore my experience <Icon name="down" /></a>}</div>
    </div>
    <div className="hero-art" data-object={model} style={{ '--asset-edge': assetAccent } as CSSProperties}>
      <div className="art-coordinate art-coordinate-top"><span>{['Systems sculpture', 'Project laptop', 'Workflow board'][objectIndex]}</span><span>{String(objectIndex + 1).padStart(2, '0')} / 03</span></div>
      <div className="orbit orbit-outer" aria-hidden="true" /><div className="orbit orbit-inner" aria-hidden="true" />
      <div className="art-cross art-cross-one" aria-hidden="true">+</div><div className="art-cross art-cross-two" aria-hidden="true">+</div>
      <SceneWindow id={model} chapter="intro" className="hero-scene" />
      <div ref={exploration.ref} className="model-explorer" role="group" tabIndex={0} aria-label="Explore 3D model" aria-describedby="model-explore-help" onPointerDown={exploration.onPointerDown} onPointerMove={exploration.onPointerMove} onPointerUp={exploration.onPointerUp} onPointerCancel={exploration.onPointerCancel} onLostPointerCapture={exploration.onLostPointerCapture} onKeyDown={exploration.onKeyDown} />
      <span id="model-explore-help" className="sr-only">Drag to rotate and tilt. On touch screens, swipe horizontally to rotate and vertically to scroll. Arrow keys rotate, plus and minus zoom, and R resets the view.</span>
      <div className="art-caption"><span className="status-dot" />{modelRegistry[model].label}<span className="art-caption-line" /><span className="art-caption-meta">Drag to explore</span></div>
      <div className="model-controls" aria-label="3D view controls">
        <button className="icon-button" onClick={turnLeft} aria-label="Rotate model left"><span aria-hidden="true">↶</span></button>
        <button className="icon-button" onClick={turnRight} aria-label="Rotate model right"><span aria-hidden="true">↷</span></button>
        <button className="icon-button" onClick={() => exploration.zoom(1)} aria-label="Zoom model in"><span aria-hidden="true">+</span></button>
        <button className="icon-button" onClick={() => exploration.zoom(-1)} aria-label="Zoom model out"><span aria-hidden="true">−</span></button>
        <button className="icon-button" onClick={exploration.reset} aria-label="Reset model view"><Icon name="reset" /></button>
        <button className="icon-button" onClick={toggleMotion} disabled={systemReduced} title={systemReduced ? 'Your device requests reduced motion' : undefined} aria-label={systemReduced ? 'System reduced motion' : paused ? 'Enable animations' : 'Pause animations'} aria-pressed={paused}><Icon name={paused ? 'play' : 'pause'} /></button>
      </div>
      <div className="model-selector" aria-label="Choose portfolio object">{modelIds.map((id, i) => <button key={id} onClick={() => selectModel(id)} aria-pressed={model === id}><span className="model-tab-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{['Systems', 'Project', 'Workflow'][i]}</button>)}</div>
    </div>
    <div className="hero-bottom"><span>Thoughtful interfaces. Dependable foundations.</span><a href="#journey">Scroll to explore <Icon name="down" /></a></div>
  </section>
}
