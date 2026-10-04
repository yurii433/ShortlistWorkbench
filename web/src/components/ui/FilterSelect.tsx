import type { FilterOption } from "./filterTypes";

type Props = {
  label: string;
  options: readonly FilterOption[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
};

/**
 * A single-value filter, kept as a list like every other filter so one state
 * shape covers both kinds. An empty list is the "All" case.
 */
export function FilterSelect({ label, options, selected, onChange }: Props) {
  return (
    <label className="filter-field">
      {label}
      <select
        value={selected[0] ?? ""}
        onChange={(event) =>
          onChange(event.target.value ? [event.target.value] : [])
        }
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
