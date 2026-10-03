import type { FilterField, SortOption } from "../../filterTypes";
import { FilterGroup } from "./FilterGroup";
import { FilterSelect } from "./FilterSelect";
import { FilterTextInput } from "./FilterTextInput";
import { SortSelect } from "./SortSelect";

type Props<S extends object> = {
  /** Field definitions, keyed the same way as the keys they occupy in `state`. */
  fields: Record<string, FilterField>;
  /** The page's query state; only the filter keys are read here. */
  state: S;
  onChange: (patch: Partial<S>) => void;
  onClear: () => void;
  sort?: string;
  order?: string;
  onSort?: (sort: string, order: string) => void;
  sortOptions?: readonly SortOption[];
};

/**
 * The filter and sort block of a list page. Sort stays visible because it is a
 * control the recruiter reaches for constantly, and the filters stay open so a
 * shared link lands on the same set of ticked boxes without a click first. It is
 * a normal in-flow section, not an overlay: nothing is covered up.
 */
export function FilterBar<S extends object>({
  fields,
  state,
  onChange,
  onClear,
  sort,
  order,
  onSort,
  sortOptions,
}: Props<S>) {
  const entries = Object.entries(fields);
  const activeCount = entries.reduce((total, [key]) => {
    const value = state[key as keyof S];
    return total + (Array.isArray(value) ? value.length : 0);
  }, 0);

  return (
    <div className="filter-bar">
      <div className="filter-bar-head">
        {activeCount > 0 ? (
          <button type="button" className="link-button" onClick={onClear}>
            Clear all
          </button>
        ) : null}
        {sort !== undefined &&
        order !== undefined &&
        onSort &&
        sortOptions ? (
          <SortSelect
            value={sort}
            order={order}
            options={sortOptions}
            onChange={onSort}
          />
        ) : null}
      </div>

      <div className="filter-grid">
        {entries.map(([key, field]) => (
          <FilterControl
            key={key}
            field={field}
            selected={state[key as keyof S] as string[]}
            // A computed key over a union of keys widens to `{[k: string]: …}`,
            // so this is the one place the patch needs a cast.
            onChange={(next) => onChange({ [key]: next } as Partial<S>)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterControl({
  field,
  selected,
  onChange,
}: {
  field: FilterField;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const options = field.options ?? [];
  if (field.kind === "text") {
    return (
      <FilterTextInput
        label={field.label}
        placeholder={field.placeholder}
        selected={selected}
        onChange={onChange}
      />
    );
  }
  if (field.kind === "select") {
    return (
      <FilterSelect
        label={field.label}
        options={options}
        selected={selected}
        onChange={onChange}
      />
    );
  }
  return (
    <FilterGroup
      label={field.label}
      options={options}
      selected={selected}
      onChange={onChange}
    />
  );
}
