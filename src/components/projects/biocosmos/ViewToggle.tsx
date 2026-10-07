// Pill-shaped view switcher shared by the project figures. On phones the
// buttons stay on one row and the pill scrolls sideways instead of wrapping,
// so every button keeps the same padding. The clipped last button hints at
// the scroll, so the scrollbar is hidden.
interface Props<T extends string> {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}

export default function ViewToggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div
      class="inline-flex max-w-full gap-1 overflow-x-auto overscroll-x-contain rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border border-forest-900/15 p-1 dark:border-forest-100/15"
      role="group"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          type="button"
          aria-pressed={value === o.id}
          onClick={(e) => {
            onChange(o.id);
            e.currentTarget.scrollIntoView({
              block: "nearest",
              inline: "nearest",
              behavior: "smooth",
            });
          }}
          class={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors duration-500 ${
            value === o.id
              ? "bg-forest-600 text-white dark:bg-forest-300 dark:text-forest-950"
              : "text-forest-800 hover:bg-forest-100 dark:text-forest-200 dark:hover:bg-forest-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
