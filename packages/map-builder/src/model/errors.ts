export interface MapIssue {
  /** Location of the problem, e.g. `elements[2].x`. */
  readonly path: string;
  readonly message: string;
}

/** Thrown when a map description is invalid. */
export class MapDefinitionError extends Error {
  readonly issues: readonly MapIssue[];

  constructor(issues: readonly MapIssue[]) {
    super(
      `Invalid map definition:\n${issues.map((issue) => `  - ${issue.path || "(root)"}: ${issue.message}`).join("\n")}`,
    );
    this.name = "MapDefinitionError";
    this.issues = issues;
  }
}

export type KnownRejectionCode =
  | "unknown-patch"
  | "invalid-patch"
  | "not-found"
  | "duplicate-id"
  | "stale-revision"
  | "revision-gap";

/** Open on purpose: pipeline steps add their own reasons (`"not-enough-wood"`). */
export type RejectionCode = KnownRejectionCode | (string & {});

/** Structured reason why a change was not applied. Normal control flow, never thrown. */
export interface MapRejection {
  readonly code: RejectionCode;
  readonly message: string;
  /** Index, in the submitted batch, of the patch that was rejected. */
  readonly patchIndex?: number;
}
