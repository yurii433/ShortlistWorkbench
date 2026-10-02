import type { JobWithCounts } from "../../domain";

type Props = {
  job: JobWithCounts;
  onOpen: (jobId: string) => void;
};

export function JobRow({ job, onOpen }: Props) {
  return (
    <tr onClick={() => onOpen(job.job_id)}>
      <td>
        <strong>{job.title}</strong>
        <div className="tiny muted">
          {job.job_id} · {job.seniority}
        </div>
      </td>
      <td>{job.job_family}</td>
      <td>
        {job.city}, {job.country}
      </td>
      <td>
        <strong>{job.application_count}</strong>
        <div className="tiny muted">
          {job.new_count} new · {job.in_review_count} in review ·{" "}
          {job.shortlisted_count} shortlisted · {job.rejected_count} rejected ·{" "}
          {job.hired_count} hired
        </div>
      </td>
    </tr>
  );
}
