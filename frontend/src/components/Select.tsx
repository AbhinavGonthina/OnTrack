import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { SELECT_CLASSNAME } from "@/lib/inputStyles";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Field styling, as for any other input: FIELD_CLASSNAME(_ROOMY). */
  className?: string;
  /**
   * For the positioning wrapper, which becomes the flex/grid item in the
   * caller's layout where the bare <select> used to be.
   */
  wrapperClassName?: string;
}

/**
 * A select with our own chevron instead of the browser's.
 *
 * The native arrow sits hard against the inline edge rather than respecting
 * the field's padding, so it read as crowded next to every other control, and
 * it is drawn differently by each browser. Replacing it costs one wrapper and
 * makes selects match the rest of the form everywhere.
 *
 * The chevron is `pointer-events-none` so clicking it still opens the select,
 * and `aria-hidden` because it is decoration: the element underneath is a real
 * <select> with all its native keyboard behaviour and its own label intact.
 */
export function Select({
  className = "",
  wrapperClassName = "",
  children,
  ...props
}: Props) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select {...props} className={`w-full ${SELECT_CLASSNAME} ${className}`}>
        {children}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
