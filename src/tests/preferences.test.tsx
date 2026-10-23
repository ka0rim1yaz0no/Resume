import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useDocumentVisible, useMediaQuery } from '../hooks/usePreferences'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('reads the system motion preference and responds when it changes', () => {
  const target = new EventTarget()
  const media = { matches: true, addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target) }
  vi.spyOn(window, 'matchMedia').mockReturnValue(media as unknown as MediaQueryList)
  const { result } = renderHook(() => useMediaQuery('(prefers-reduced-motion: reduce)'))
  expect(result.current).toBe(true)
  act(() => { media.matches = false; target.dispatchEvent(new Event('change')) })
  expect(result.current).toBe(false)
})

it('tracks hidden documents so decorative rendering can stop', () => {
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  const { result } = renderHook(() => useDocumentVisible())
  expect(result.current).toBe(true)
  act(() => { hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')) })
  expect(result.current).toBe(false)
})
