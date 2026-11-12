// The ballpoint wobble every drawn outline references as url(#ink-wobble). Render once per document.
export const InkDefs = () => (
  <svg aria-hidden="true" className="absolute size-0">
    <filter id="ink-wobble">
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves={2} seed={11} />
      <feDisplacementMap in="SourceGraphic" scale={3.2} />
    </filter>
  </svg>
);
