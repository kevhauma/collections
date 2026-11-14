// The red pen marking what the pointer is on (TICKET-UI-05): a loop drawn round a control, or an X scribbled over one
// that deletes. The shapes use percentages of a box just larger than the control, so nothing is stretched and each
// pathLength of 1 is exact; the hover-mark utility in styles.css draws each stroke by animating stroke-dashoffset.
const marks = {
  // One loop from 9 o'clock round clockwise (the utility turns the ellipses half a turn so they start there), then a
  // short wider pass that runs on past the start.
  circle: (
    <>
      <ellipse cx="50%" cy="50%" rx="46%" ry="41%" pathLength={1} />
      <ellipse cx="50%" cy="50%" rx="48.5%" ry="45%" pathLength={1} />
    </>
  ),
  // Two strokes, the second drawn once the first is done.
  cross: (
    <>
      <line x1="9%" y1="14%" x2="91%" y2="86%" pathLength={1} />
      <line x1="90%" y1="12%" x2="10%" y2="88%" pathLength={1} />
    </>
  ),
};

export type Mark = keyof typeof marks;

export const HoverMark = ({ mark = "circle" }: { mark?: Mark }) => (
  <svg aria-hidden="true" className="hover-mark">
    <g filter="url(#ink-wobble)">{marks[mark]}</g>
  </svg>
);
