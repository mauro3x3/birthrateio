const FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatUpdated(date: Date | string | null | undefined) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return FORMAT.format(d);
}

/** Provenance stamp shown in page headers — when the data behind a page changed. */
export function LastUpdated({
  date,
  label = "Data updated",
}: {
  date: Date | string | null | undefined;
  label?: string;
}) {
  const formatted = formatUpdated(date);
  if (!formatted) return null;

  const iso =
    typeof date === "string" ? date : (date as Date).toISOString();

  return (
    <p className="text-xs text-muted-foreground">
      {label}{" "}
      <time dateTime={iso} className="font-medium text-foreground">
        {formatted}
      </time>
    </p>
  );
}
