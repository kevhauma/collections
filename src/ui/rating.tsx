import { cn } from "./cn";

type RatingProps = { value: number; max: number; symbol: string; label: string; className?: string };

// A score as a row of the field's own symbol (TICKET-COL-05): the first `value` in ink, the rest faded. Opacity, not
// colour, fades it, because an emoji ignores text colour. Screen readers hear `label` ("4 of 5") instead. Ten
// symbols are wider than a grid card at 360 px, so the row may wrap between any two.
export const Rating = ({ value, max, symbol, label, className }: RatingProps) => {
  const shown = Math.min(Math.max(value, 0), max);
  return (
    <span role="img" aria-label={label} className={cn("tracking-wider wrap-anywhere", className)}>
      <span aria-hidden="true">{symbol.repeat(shown)}</span>
      <span aria-hidden="true" className="opacity-30">
        {symbol.repeat(max - shown)}
      </span>
    </span>
  );
};
