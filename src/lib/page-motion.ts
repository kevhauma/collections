// Page motion (TICKET-UI-10): the pen test on a fresh public page, the page turn and the handwritten title on a page
// change. Like submit-once.ts, these functions are serialized into inline <script>s (routes/root.tsx for the turn,
// ui/page-motion.tsx for the pen test), because public pages ship no app JS: they may only use their parameters and
// browser globals. Without JS a page simply shows.

export type Motion = "pen-test" | "turn" | "back" | "skip" | "none";

type Load = { type: string; from: string; to: string; publicPage: boolean };

// What this page load shows. `type` is the Navigation Timing type, `from` the page before it ("" when unknown). A
// fresh open (another site, a typed URL, a bookmark, a refresh) gets the pen test on a public page. A refinement of
// the page you are on (same path with a new query, or the Have / Want tab: /x and /x/want) stays still.
export const pageMotion = ({ type, from, to, publicPage }: Load): Motion => {
  const next = new URL(to);
  const previous = URL.canParse(from) ? new URL(from) : undefined;
  if (type === "reload" || !previous || previous.origin !== next.origin) return publicPage ? "pen-test" : "none";
  const page = (url: URL) => url.pathname.replace(/(.)\/want$/, "$1");
  if (page(previous) === page(next) && previous.href !== next.href) return "skip";
  return type === "back_forward" ? "back" : "turn";
};

type Point = [number, number];

export const polygon = (points: Point[]) =>
  `polygon(${points.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;

// The page turn on a w × h page: a fold line perpendicular to the diagonal sweeps from the bottom-right corner
// (offset 0) to the top-left (1). `page` is the part of the old page not turned yet, `flap` the turned part mirrored
// over the fold (the back of the sheet). Both keep five points and move linearly between the corners the fold
// passes, so these four keyframes, eased as one, are the exact turn.
export const turnFrames = (w: number, h: number, toPolygon: typeof polygon) => {
  const len = Math.hypot(w, h), a = w / len, b = h / len, aw = a * w, bh = b * h, max = aw + bh;
  const page = (c: number): Point[] => [
    [0, 0],
    [Math.min(c / a, w), 0],
    c <= aw ? [c / a, 0] : [w, Math.min((c - aw) / b, h)],
    c <= bh ? [0, c / b] : [Math.min((c - bh) / a, w), h],
    [0, Math.min(c / b, h)],
  ];
  const turned = (c: number): Point[] => [
    [w, h],
    c >= bh ? [(c - bh) / a, h] : [0, h],
    c >= bh ? [(c - bh) / a, h] : [0, c / b],
    c >= aw ? [w, (c - aw) / b] : [c / a, 0],
    c >= aw ? [w, (c - aw) / b] : [w, 0],
  ];
  const mirror = (c: number) => ([x, y]: Point): Point => {
    const d = x * a + y * b - c;
    return [x - 2 * d * a, y - 2 * d * b];
  };
  const folds = [max, Math.max(aw, bh), Math.min(aw, bh), 0];
  return {
    offset: folds.map((c) => 1 - c / max),
    page: folds.map((c) => toPolygon(page(c))),
    flap: folds.map((c) => toPolygon(turned(c).map(mirror(c)))),
  };
};

type Box = { left: number; top: number; right: number; bottom: number };

// When the turn has cleared a box (the new title), as a fraction of its ease-in-out duration. Forward, the new page
// shows past the fold, so the box is clear once the fold passes its top-left corner. Back, the incoming page grows
// from the top-left with the flap lying on it, so the box is clear once the flap has passed its bottom-right corner.
export const turnClears = (w: number, h: number, box: Box, back: boolean) => {
  const len = Math.hypot(w, h), a = w / len, b = h / len, max = a * w + b * h;
  const progress = back ? (max + box.right * a + box.bottom * b) / (2 * max) : 1 - (box.left * a + box.top * b) / max;
  // Invert cubic-bezier(0.42, 0, 0.58, 1): find the curve parameter for this progress, then its time.
  const s = Array.from({ length: 24 }).reduce<[number, number]>(([lo, hi]) => {
    const mid = (lo + hi) / 2;
    return 3 * (1 - mid) * mid * mid + mid ** 3 < progress ? [mid, hi] : [lo, mid];
  }, [0, 1])[0];
  return Math.min(1, Math.max(0, 3 * (1 - s) ** 2 * s * 0.42 + 3 * (1 - s) * s * s * 0.58 + s ** 3));
};

const reducedMotion = "(prefers-reduced-motion: reduce)";
// This load, as pageMotion reads it. The referrer tells a fresh open (a typed URL has none), but back and forward
// keep the referrer the page first had, so they take the page actually left from the Navigation API where it exists.
const currentLoad = () => {
  const type = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type ?? "navigate";
  const activation = type === "back_forward" ? globalThis.navigation?.activation : undefined;
  return { type, from: activation ? (activation.from?.url ?? "") : document.referrer, to: location.href };
};

// On every page: a cross-document view transition (styles.css `@view-transition`) becomes the page turn and the
// handwritten title, skipped for refinements. Reduced motion keeps the stylesheet's short crossfade.
const turnPages = (
  decide: typeof pageMotion,
  frames: typeof turnFrames,
  clears: typeof turnClears,
  toPolygon: typeof polygon,
  reduced: string,
  load: typeof currentLoad,
) =>
  addEventListener("pagereveal", (event) => {
    const transition = (event as PageRevealEvent).viewTransition;
    if (!transition) return;
    const motion = decide({ ...load(), publicPage: false });
    if (motion !== "turn" && motion !== "back") return transition.skipTransition();
    if (matchMedia(reduced).matches) return;
    transition.types.add(motion);
    transition.ready.then(() => {
      const root = document.documentElement, w = innerWidth, h = innerHeight, back = motion === "back";
      const { offset, page, flap } = frames(w, h, toPolygon);
      const turn = { duration: 620, easing: "ease-in-out", fill: "both", direction: back ? "reverse" : "normal" } as const;
      root.animate({ clipPath: page, offset }, { ...turn, pseudoElement: `::view-transition-${back ? "new" : "old"}(root)` });
      root.animate({ clipPath: flap, offset }, { ...turn, pseudoElement: "::view-transition-image-pair(page-flap)" });
      const title = document.querySelector("h1");
      if (!title) return;
      const box = title.getBoundingClientRect(), chars = Math.max(1, title.textContent.trim().length);
      const write = { duration: Math.min(900, 45 * chars), delay: 620 * clears(w, h, box, back), fill: "both" } as const;
      root.animate({ maskPosition: ["100% 0", "0 0"] }, { ...write, pseudoElement: "::view-transition-new(page-title)" });
      // The pen tip (3, 61 in its 64px box) rides the wipe's edge, bobbing over the letters.
      const steps = Math.min(chars, 40);
      const pen = Array.from({ length: steps + 1 }, (_, i) => {
        const k = i / steps, y = box.top + box.height * (0.45 + 0.3 * Math.sin(k * chars * 2.2));
        return { transform: `translate(${box.left + box.width * k - 3}px, ${y - 61}px)`, opacity: k === 0 || k === 1 ? 0 : 1 };
      });
      root.animate(pen, { ...write, pseudoElement: "::view-transition-group(page-pen)" });
    });
  });

// In the public layout, right after the pen-test markup: on a fresh open a pen scribbles a coil on a blank sheet,
// then the sheet is crumpled and tossed, while the page under it is already there and usable.
const penTest = (decide: typeof pageMotion, toPolygon: typeof polygon, reduced: string, load: typeof currentLoad) => {
  const sheet = document.currentScript?.previousElementSibling;
  const pen = document.querySelector<SVGElement>(".page-pen");
  const motion = decide({ ...load(), publicPage: true });
  if (!sheet || !pen || motion !== "pen-test" || matchMedia(reduced).matches) return;
  const root = document.documentElement, w = innerWidth, h = innerHeight;
  const part = (name: string) => sheet.querySelector<HTMLElement | SVGElement>(`.pen-test-${name}`)!;
  root.dataset.penTest = "";

  // The coil: loops that advance to the right, each a little different, then a flick.
  const r = Math.max(10, Math.min(18, w * 0.028)), len = Math.min(w * 0.5, 420), x0 = (w - len) / 2, y0 = h * 0.44;
  const loops = Array.from({ length: Math.floor(len / (r * 0.36) / 0.2) + 1 }, (_, i) => {
    const t = i * 0.2, ri = r * (1 + 0.14 * Math.sin(t * 0.43));
    return `${(x0 + r * 0.36 * t - ri * Math.cos(t)).toFixed(1)} ${(y0 - ri * 0.8 * Math.sin(t) + 2.5 * Math.sin(t * 0.19)).toFixed(1)}`;
  });
  const coil = `M${loops.join(" L")} q${r * 1.6} ${-r * 0.1} ${r * 3.4} ${-r * 1.5}`;
  const stroke = part("ink").querySelector("path")!;
  part("ink").setAttribute("viewBox", `0 0 ${w} ${h}`);
  stroke.setAttribute("d", coil);
  pen.style.offsetPath = `path("${coil}")`;
  const scribble = { duration: 730, easing: "ease-in-out", fill: "both" } as const;
  stroke.animate({ strokeDashoffset: [1, 0] }, scribble);
  pen.animate({ offsetDistance: ["0%", "100%"] }, scribble);
  pen.animate({ opacity: [0, 1], translate: ["16px -16px", "0 0"] }, { duration: 140, easing: "ease-out" });
  pen.animate({ opacity: [1, 0], transform: ["none", "translate(28px, -34px) rotate(8deg)"] }, { duration: 180, delay: 730, easing: "ease-in", fill: "forwards" });

  // The crumple: each edge point slides along its own ray to a jagged ball, so the outline never crosses itself.
  const corners: Point[] = [[0, 0], [w, 0], [w, h], [0, h]];
  const edge = corners.flatMap(([x, y], i) => {
    const [nx, ny] = corners[(i + 1) % 4]!, n = Math.max(3, Math.round((40 * (i % 2 ? h : w)) / (2 * (w + h))));
    return Array.from({ length: n }, (_, j): Point => [x + ((nx - x) * j) / n, y + ((ny - y) * j) / n]);
  });
  const cx = w / 2, cy = h / 2, ball = Math.min(w, h) * 0.14, jitter = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
  const half = edge.map(([x, y]): Point => {
    const f = jitter(0.5, 0.86);
    return [cx + (x - cx) * f, cy + (y - cy) * f];
  });
  const round = edge.map(([x, y]): Point => {
    const angle = Math.atan2(y - cy, x - cx), radius = ball * jitter(0.78, 1.22);
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
  const crumple = { duration: 380, delay: 730, easing: "cubic-bezier(.5,0,.3,1)", fill: "both" } as const;
  part("sheet").animate({ clipPath: [edge, half, round].map(toPolygon), offset: [0, 0.45, 1] }, crumple);
  part("paper").animate({ transform: ["none", "scale(.6) rotate(-9deg)"] }, crumple);
  part("creases").animate({ opacity: [0, 1] }, crumple);
  part("shade").animate({ opacity: [0, 1] }, crumple);
  part("ball")
    .animate(
      [
        { transform: "none", easing: "cubic-bezier(.2,.6,.4,1)" },
        { transform: `translate(${w * 0.16}px, ${-h * 0.14}px) rotate(150deg) scale(.95)`, offset: 0.38, easing: "cubic-bezier(.6,0,.9,.5)" },
        { transform: `translate(${w * 0.58}px, ${h * 0.8}px) rotate(400deg) scale(.82)` },
      ],
      { duration: 340, delay: 1110, fill: "both" },
    )
    .finished.then(() => {
      delete root.dataset.penTest;
      [...sheet.getAnimations({ subtree: true }), ...pen.getAnimations()].forEach((animation) => animation.cancel());
      pen.style.offsetPath = "";
    });
};

const reduced = JSON.stringify(reducedMotion);
export const pageTurnScript = `(${turnPages})(${pageMotion}, ${turnFrames}, ${turnClears}, ${polygon}, ${reduced}, ${currentLoad})`;
export const penTestScript = `(${penTest})(${pageMotion}, ${polygon}, ${reduced}, ${currentLoad})`;
