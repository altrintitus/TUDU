import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { exportData, validateBackup, importData, type BackupV1 } from '../logic/backup';
import { navigate } from '../hooks/useHashRoute';
import { todayStr } from '../logic/dates';
import { toast } from '../components/Toast';
import { Sheet } from '../components/Sheet';

const REPO_URL = 'https://github.com/altrintitus/TUDU';
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : one + 's'}`;

export function SettingsScreen() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  const counts = useLiveQuery(async () => ({
    spaces: await db.lists.count(),
    tasks: await db.tasks.count(),
    ideas: await db.ideas.count(),
    routines: await db.routines.count()
  }));

  const doExport = async () => {
    const json = JSON.stringify(await exportData(), null, 2);
    const name = `tudu-backup-${todayStr()}.json`;
    const file = new File([json], name, { type: 'application/json' });
    // iOS: hand off to the share sheet (iCloud Files / AirDrop). Skip under
    // automation (navigator.webdriver) — share() has no UI there and hangs.
    if (!navigator.webdriver && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {
        /* user cancelled the share sheet — nothing to do */
      }
      return;
    }
    // Desktop / e2e: anchor download. WebKit needs the anchor in the DOM and the
    // object URL kept alive past the click, so append and revoke on a delay.
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-picked later
    if (!f) return;
    try {
      const parsed: unknown = JSON.parse(await f.text());
      if (!validateBackup(parsed)) throw new Error('invalid');
      setError(null);
      setPending(parsed);
    } catch {
      setPending(null);
      setError('Not a TUDU backup file.');
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    try {
      await importData(pending);
      setPending(null);
      toast('Import complete');
    } catch {
      setPending(null);
      toast('Import failed — file may be corrupt');
    }
  };

  return (
    <div className="settings-screen">
      <header className="screen-header">
        <button className="back-btn" aria-label="back" onClick={() => navigate({ name: 'home' })}>
          ‹
        </button>
        <h1 className="screen-title">Settings</h1>
      </header>

      <section className="settings-section">
        <h2 className="section-label">Backup</h2>
        <p className="settings-note">Everything lives on this device. Export a JSON copy to keep it safe.</p>
        <div className="settings-actions">
          <button className="btn-primary" onClick={doExport}>Export backup</button>
          <button className="btn-ghost bordered" onClick={() => { setError(null); fileRef.current?.click(); }}>
            Import backup
          </button>
        </div>
        {error && <p className="settings-error" role="alert">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={onFile}
        />
      </section>

      <section className="settings-section">
        <h2 className="section-label">Storage</h2>
        <div className="settings-row">
          <span>Persistence</span>
          <span className="settings-value">
            {persisted === null ? '—' : persisted ? 'Protected' : 'Best-effort'}
          </span>
        </div>
        <div className="settings-row">
          <span>Data</span>
          <span className="settings-value">
            {counts
              ? `${plural(counts.spaces, 'space')} · ${plural(counts.tasks, 'task')} · ${plural(counts.ideas, 'idea')} · ${plural(counts.routines, 'routine')}`
              : '—'}
          </span>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-label">About</h2>
        <div className="settings-row">
          <span>Version</span>
          <span className="settings-value">v{__APP_VERSION__}</span>
        </div>
        <div className="settings-row">
          <span>Source</span>
          <a className="settings-value link" href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </section>

      {pending && (
        <Sheet open onClose={() => setPending(null)} title="Replace all data">
          <p className="confirm-text">
            Replace everything with {plural(pending.lists.length, 'space')} / {plural(pending.tasks.length, 'task')} /{' '}
            {plural(pending.ideas.length, 'idea')} / {plural(pending.routines?.length ?? 0, 'routine')}? This can’t be undone.
          </p>
          <div className="sheet-actions">
            <button className="btn-danger" onClick={confirmImport}>Replace everything</button>
            <button className="btn-ghost" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
