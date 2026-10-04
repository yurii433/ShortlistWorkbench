import type { JobWithCounts } from "../../utils/domain";
import type { ListView } from "../../hooks/useListQuery";
import { ListSection } from "../ui/ListSection";
import { Pager } from "../ui/Pager";
import { JobRow } from "./JobRow";
import "./JobsList.css";

const COLUMNS = ["Job", "Family", "Location", "Applicants"];

type Props = {
  state: ListView<JobWithCounts>;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  onOpen: (jobId: string) => void;
};

export function JobsList({ state, page, pageCount, onPage, onOpen }: Props) {
  return (
    <section className="list-pane jobs-pane">
      <div className="list-body">
        <ListSection
          state={state}
          columns={COLUMNS}
          emptyMessage="No jobs match these filters."
        >
          {(jobs) => (
            <table>
              <thead>
                <tr>
                  {COLUMNS.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <JobRow key={job.job_id} job={job} onOpen={onOpen} />
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
