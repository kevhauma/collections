import { penTestScript } from "../lib/page-motion";

// The drawn ballpoint of the page motion (TICKET-UI-10), one per document: the pen test rides it along the coil, the
// page turn along the new title (as its own view-transition group). Hidden until one of them shows it.
export const PagePen = () => (
  <svg aria-hidden="true" viewBox="0 0 64 64" className="page-pen">
    <g filter="url(#ink-wobble)">
      <path className="pen-body" d="M9.7 47.9 L52.1 5.5 L58.5 11.9 L16.1 54.3 Z" />
      <path className="pen-body" d="M3 61 L9.7 47.9 L16.1 54.3 Z" />
      <path className="pen-line" d="M13.2 44.4 L19.6 50.8 M16.1 41.5 L22.5 47.9 M18.9 38.7 L25.3 45.1" />
      <path className="pen-clip" d="M42.6 29.8 L56.7 15.7" />
    </g>
  </svg>
);

// Paints nothing: the back of a turning page is drawn on its view-transition group (styles.css, page-flap).
export const PageFlap = () => <div aria-hidden="true" className="page-flap" />;

// Fold lines across the middle of the sheet, where the ball ends up: one dark pass and a light one beside it.
const creases = Array.from({ length: 14 }, (_, i) => {
  const angle = i * 2.4, x = 50 + 16 * Math.sin(i * 1.7), y = 50 + 16 * Math.cos(i * 2.9);
  return { x1: x - 70 * Math.cos(angle), y1: y - 70 * Math.sin(angle), x2: x + 70 * Math.cos(angle), y2: y + 70 * Math.sin(angle) };
});

// The pen test's scrap sheet, in the public layout before the page: the script right after it starts it on a fresh
// open (lib/page-motion.ts). Without JS it never shows.
export const PenTest = () => (
  <>
    <div aria-hidden="true" className="pen-test">
      <div className="pen-test-ball">
        <div className="pen-test-sheet">
          <div className="pen-test-paper">
            <svg className="pen-test-ink">
              <g filter="url(#ink-wobble)">
                <path pathLength={1} />
              </g>
            </svg>
          </div>
          <svg className="pen-test-creases" viewBox="0 0 100 100" preserveAspectRatio="none">
            {creases.map((line, i) => (
              <g key={i}>
                <line {...line} />
                <line {...line} x1={line.x1 + 0.4} x2={line.x2 + 0.4} className="light" />
              </g>
            ))}
          </svg>
          <div className="pen-test-shade" />
        </div>
      </div>
    </div>
    <script dangerouslySetInnerHTML={{ __html: penTestScript }} />
  </>
);
