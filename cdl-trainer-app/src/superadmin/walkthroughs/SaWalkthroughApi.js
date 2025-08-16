// Path: /src/superadmin/walkthroughs/saWalkthroughApi.js
// -----------------------------------------------------------------------------
// Superadmin Walkthrough API (minimal, mock-friendly)
// - Replace internals with your Firestore reads/writes
// - Shapes align with Admin Upload/Editor + utils/validators
// -----------------------------------------------------------------------------

/**
 * List submissions with optional filters.
 * @param {{status?: string, schoolId?: string}} opts
 * @returns {Promise<Array<any>>}
 */
export async function listSubmissions(opts = {}) {
  // TODO: Replace with Firestore query:
  // schools/*/walkthrough_submissions where status == opts.status (if provided)
  // and/or schoolId == opts.schoolId
  // For now return an empty list to keep the UI functional.
  void opts
  return []
}

/**
 * Fetch a single submission by ID.
 * @param {string} submissionId
 * @returns {Promise<any|null>}
 */
export async function getSubmission(submissionId) {
  // TODO: Replace with Firestore doc read
  void submissionId
  return null
}

/**
 * Approve + publish: write to schools/{schoolId}/walkthroughs and
 * mark submission as 'approved'.
 * @param {any} submission
 * @returns {Promise<void>}
 */
export async function approveAndPublish(submission) {
  // TODO:
  // 1) write to /schools/{schoolId}/walkthroughs/{newId or token-based}
  // 2) set submission.status='approved', reviewedAt, reviewedBy
  void submission
}

/**
 * Request changes: set status and attach a review note.
 * @param {string} submissionId
 * @param {string} note
 * @returns {Promise<void>}
 */
export async function requestChanges(submissionId, note) {
  // TODO: update /walkthrough_submissions/{id}
  void submissionId; void note
}

/**
 * Reject a submission (final).
 * @param {string} submissionId
 * @returns {Promise<void>}
 */
export async function rejectSubmission(submissionId) {
  // TODO: update /walkthrough_submissions/{id}
  void submissionId
}

/**
 * Optional helper: fetch currently published dataset for the same token.
 * @param {string} schoolId
 * @param {string} token
 * @returns {Promise<any|null>}
 */
export async function getCurrentPublishedForToken(schoolId, token) {
  // TODO: query /walkthroughs where token==token order by version/updatedAt desc limit 1
  void schoolId; void token
  return null
}