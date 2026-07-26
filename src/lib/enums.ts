// Portable "enum" string unions. Stored as String columns in the database so
// the schema works on both SQLite (local) and PostgreSQL (production), with the
// allowed values enforced here in application code.

export type SubjectType = "COUNTRY" | "REGION" | "CITY";

export type IndicatorCategory =
  | "FERTILITY"
  | "POPULATION"
  | "MIGRATION"
  | "ECONOMY"
  | "MORTALITY"
  | "HEALTH"
  | "EDUCATION"
  | "HOUSING"
  | "ELECTION"
  | "ETHNICITY"
  | "RELIGION"
  | "SOCIETY"
  | "CRIME"
  | "OTHER";

export type ValueKind = "ESTIMATE" | "PROJECTION";

export type ReleaseStatus = "SCHEDULED" | "TENTATIVE" | "RELEASED" | "DELAYED";

export type GroupKind = "ETHNICITY" | "RELIGION" | "LANGUAGE" | "ANCESTRY";
