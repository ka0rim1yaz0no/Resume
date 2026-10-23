import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Education } from '../resume/Education'
import { education } from '../data/profile'
import { schools } from '../data/schools'
import { educationEmblem } from '../three/educationGeometry'

describe('Education identities', () => {
  it('keeps the original education record while switching the supplied artwork and controls', () => {
    const { container } = render(<Education />)
    for (const record of education) {
      expect(screen.getByRole('heading', { name: record.institution })).toBeVisible()
      expect(screen.getByText(record.course)).toBeVisible()
    }
    expect(screen.getByText('Graduate, April 2020')).toBeVisible()
    expect(container.querySelectorAll('.education-completion')).toHaveLength(1)
    for (const school of schools) {
      fireEvent.click(screen.getByRole('button', { name: school.shortName }))
      expect(container.querySelector('[data-scene="education"]')).toHaveAttribute('data-school', school.id)
      expect(container.querySelector('.scene-poster img')).toHaveAttribute('src', school.logo)
      expect(screen.getByRole('group', { name: `Explore ${school.shortName} 3D emblem` })).toBeVisible()
      expect(screen.getByRole('button', { name: `Reset ${school.shortName} emblem view` })).toBeVisible()
    }
  })
  it('gives both school emblems real depth with valid face UVs and inexpensive geometry', () => {
    for (let index = 0; index < schools.length; index++) {
      const geometry = educationEmblem(index)
      geometry.body.computeBoundingBox()
      const box = geometry.body.boundingBox!
      expect(box.max.z - box.min.z).toBeGreaterThan(0.14)
      for (const uv of geometry.face.attributes.uv.array) {
        expect(uv).toBeGreaterThanOrEqual(-0.0001)
        expect(uv).toBeLessThanOrEqual(1.0001)
      }
      const vertices = Object.values(geometry).reduce((sum, value) => sum + value.attributes.position.count, 0)
      expect(vertices).toBeLessThan(6000)
      Object.values(geometry).forEach(value => value.dispose())
    }
  })
})
