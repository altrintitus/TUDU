import { useState } from 'react';
import { shouldShowInstallHint, currentInstallEnv } from '../logic/install';

// One-time dismissable card on Home — iOS has no beforeinstallprompt, so we
// point users at Share → Add to Home Screen. Dismiss persists in localStorage.
export function InstallHint() {
  const [show, setShow] = useState(() => shouldShowInstallHint(currentInstallEnv()));
  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem('tudu.installHintDismissed', '1');
    setShow(false);
  };

  return (
    <div className="install-hint">
      <span>Install TUDU: tap <b>Share</b> → <b>Add to Home Screen</b>.</span>
      <button className="install-hint-x" aria-label="dismiss" onClick={dismiss}>✕</button>
    </div>
  );
}
