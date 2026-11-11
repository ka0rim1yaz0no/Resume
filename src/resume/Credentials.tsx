import { useState } from 'react'
import { credentials } from '../data/profile'
import { Icon } from '../components/Icon'
import { RecognitionTimeline } from '../components/ResumeVisuals'

export function Credentials() {
  const [selected, setSelected] = useState(0)
  const credential = credentials[selected]

  return (
    <section id="credentials" className="section credentials-section" aria-labelledby="credentials-title">
      <div className="container">
        <header className="credential-heading">
          <p>Learning & participation</p>
          <h2 id="credentials-title">Certifications & Recognition</h2>
        </header>
        <div className="credential-layout">
          <div id="credential-preview" className="credential-preview" role="status">
            <div className="credential-plate">
              <div className="credential-meta">
                <span>Learning & participation</span>
                <span className="credential-position">{String(selected + 1).padStart(2, '0')} / {credentials.length}</span>
              </div>
              <RecognitionTimeline year={credential.year} />
            </div>
            <div className="credential-selected">
              <h3 key={credential.title}>{credential.title}</h3>
            </div>
          </div>
          <div className="credential-list" role="group" aria-label="Select a credential">
            {credentials.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-pressed={selected === index}
                aria-controls="credential-preview"
                onClick={() => setSelected(index)}
              >
                <span className="credential-title">{item.title}</span>
                <span className="credential-year">{item.year}</span>
                <span className="credential-mark" aria-hidden="true">
                  {selected === index && <Icon name="check" />}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
