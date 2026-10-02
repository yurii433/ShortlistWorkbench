import type { FilterOption } from "../../filterTypes";

type Props = {
  label: string;
  options: readonly FilterOption[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
};

/**
 * A multi-select filter: ticks inside one group are combined with `IN`, groups
 * are combined with `AND`. Unticking everything is the "all" case, so there is
 * no All option to keep in sync with the data.
 */
export function FilterGroup({ label, options, selected, onChange }: Props) {
  const toggle = (value: string, checked: boolean) =>
    onChange(
      checked
        ? [...selected, value]
        : selected.filter((option) => option !== value),
    );

  return (
    <fieldset className="filter-group">
      <legend>{label}</legend>
      <div className="filter-group-options">
        {options.map((option) => (
          <label key={option.value} className="filter-option">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event) => toggle(option.value, event.target.checked)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}