// A light loading drawing of the display, keyboard deck and lower case.
// It avoids compositing a baked dark poster onto the stone display surface.
export function LaptopOutline() {
  return <svg className="laptop-outline" viewBox="0 0 600 500" fill="none" aria-hidden="true">
    <ellipse cx="291" cy="431" rx="211" ry="12" fill="currentColor" opacity=".06" />
    <g stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="m149 72 341 24-29 244-341-34z" fill="currentColor" fillOpacity=".035" />
      <path d="m164 91 308 22-26 207-309-30z" />
      <path d="m120 310 341 33 63 66-466-40z" fill="currentColor" fillOpacity=".035" />
      <path d="m58 369 466 40-3 12-460-40z" fill="currentColor" fillOpacity=".07" />
      <path d="m218 350 139 13 19 27-148-14z" />
      <g transform="matrix(1 .085 .45 .48 142 320)" opacity=".6">
        {Array.from({ length: 4 }, (_, row) => Array.from({ length: 12 }, (_, key) => <rect key={`${row}-${key}`} x={key * 21} y={row * 13} width="17" height="9" rx="1.5" />))}
      </g>
      <g transform="matrix(1 .07 -.10 .88 170 107)" opacity=".75">
        <path d="M10 21h256M10 46h127M10 61h180" />
        <rect x="10" y="90" width="69" height="63" rx="4" /><rect x="102" y="90" width="69" height="63" rx="4" /><rect x="194" y="90" width="69" height="63" rx="4" />
        <path d="M79 121h23m69 0h23M10 180h253" />
      </g>
    </g>
  </svg>
}
