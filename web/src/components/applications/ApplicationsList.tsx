import type { Application } from "../../domain";
import type { ListView } from "../../hooks/useListQuery";
import { APPLICATION_SORT_OPTIONS } from "../../applicationFilters";
import { ListSection } from "../ui/ListSection";
import { Pager } from "../ui/Pager";
import { SortSelect } from "../ui/SortSelect";
import { ApplicationRow } from "./ApplicationRow";

const COLUMNS = ["Candidate", "Profile", "Score", "Status", "Applied"];

const EMPTY_MESSAGES: Record<string, string> = {
  score_disagreement:
    "No LLM scores stored yet. Open an application and score it first.",
};

type Props = {
  state: ListView<Application>;
  sort: string;
  order: string;
  onSort: (sort: string, order: string) => void;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  selectedId: string;
  onSelect: (id: string) => void;
};

export function ApplicationsList({
  state,
  sort,
  order,
  onSort,
  page,
  pageCount,
  onPage,
  selectedId,
  onSelect,
}: Props) {
  return (
    <section className="list-pane">
      <div className="list-toolbar">
        <SortSelect
          value={sort}
          order={order}
          options={APPLICATION_SORT_OPTIONS}
          onChange={onSort}
        />
      </div>
      <div className="list-body">
        <ListSection
          state={state}
          columns={COLUMNS}
          emptyMessage={
            EMPTY_MESSAGES[sort] ?? "No applications match these filters."
          }
        >
          {(items) => (
            <table className="candidates-table">
              <thead>
                <tr>
                  {COLUMNS.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <ApplicationRow
                    key={item.application_id}
                    item={item}
                    selected={item.application_id === selectedId}
                    onSelect={onSelect}
                  />
                ))}
              </tbody>
            </table>
          )}
        </ListSection>
      </div>

      <Pager page={page} pageCount={pageCount} onPage={onPage} />
    </section>
  );
}
