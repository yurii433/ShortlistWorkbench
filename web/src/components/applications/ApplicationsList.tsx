import type { Application } from "../../domain";
import type { ListView } from "../../hooks/useListQuery";
import { ListSection } from "../ui/ListSection";
import { Pager } from "../ui/Pager";
import { ApplicationRow } from "./ApplicationRow";

const COLUMNS = ["Candidate", "Match", "LLM", "Status"];

const EMPTY_MESSAGES: Record<string, string> = {
  score_disagreement:
    "No LLM scores stored yet. Open an application and score it first.",
};

type Props = {
  state: ListView<Application>;
  sort: string;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  selectedId: string;
  onSelect: (id: string) => void;
};

export function ApplicationsList({
  state,
  sort,
  page,
  pageCount,
  onPage,
  selectedId,
  onSelect,
}: Props) {
  return (
    <section className="list-pane">
      <div className="list-body">
        <ListSection
          state={state}
          columns={COLUMNS}
          emptyMessage={
            EMPTY_MESSAGES[sort] ?? "No applications match these filters."
          }
        >
          {(items) => (
            <table>
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
