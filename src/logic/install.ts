export function shouldShowInstallHint(env: { ua: string; standalone: boolean; dismissed: boolean }): boolean {
  const isIOS = /iPhone|iPad|iPod/.test(env.ua);
  return isIOS && !env.standalone && !env.dismissed;
}

export function currentInstallEnv(): { ua: string; standalone: boolean; dismissed: boolean } {
  return {
    ua: navigator.userAgent,
    standalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
    dismissed: localStorage.getItem('tudu.installHintDismissed') === '1'
  };
}
