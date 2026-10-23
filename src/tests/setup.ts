import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { value: function () { this.setAttribute('open', '') } })
Object.defineProperty(HTMLDialogElement.prototype, 'close', { value: function () { this.removeAttribute('open') } })
window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
