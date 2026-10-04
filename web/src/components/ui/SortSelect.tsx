import type { SortOption } from "./filterTypes";

type Props = {
  /** Shown above the control when the sort sits in a row of labelled fields. */
  label?: string;
  value: string;
  order: string;
  options: readonly SortOption[];
  onChange: (sort: string, order: string) => void;
};

/**
 * One control for both sort keys: options carry a `sort:order` pair, so the
 * direction is never a separate thing to remember while picking a field.
 */
export function SortSelect({ label, value, order, options, onChange }: Props) {
  return (
    <label className="filter-field sort-field">
      {label}
      <select
        value={`${value}:${order}`}
        onChange={(event) => {
          const [sort, nextOrder] = event.target.value.split(":");
          onChange(sort, nextOrder);
        }}
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
