// Fixed top banner shown when IndexedDB is unavailable (e.g. iOS private mode).
// Non-dismissable while the error persists — writes silently fail otherwise.
export function DbErrorBanner() {
  return (
    <div className="db-error-banner" role="alert">
      Storage unavailable (private browsing?). Nothing you enter will be saved.
    </div>
  );
}
