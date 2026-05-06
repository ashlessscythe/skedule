export function DatabaseUnavailableCard(props: { title?: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
      <div className="text-sm font-medium">
        {props.title ?? 'Database unavailable'}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        The app couldn’t reach the database. Check `DATABASE_URL` and your network.
      </div>
      {props.detail ? (
        <pre className="mt-4 max-h-48 overflow-auto rounded-md border bg-background/60 p-3 text-xs text-muted-foreground">
          {props.detail}
        </pre>
      ) : null}
    </div>
  );
}

