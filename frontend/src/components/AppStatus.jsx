import { useEffect, useState } from 'react';
import { Download, WifiOff, RefreshCw, X, Smartphone } from 'lucide-react';
import { Modal } from './UI';

export default function AppStatus() {
  const [online, setOnline] = useState(navigator.onLine),
    [install, setInstall] = useState(null),
    [help, setHelp] = useState(false),
    [waiting, setWaiting] = useState(null),
    [installed, setInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches);
  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine);
    const prompt = (e) => {
      e.preventDefault();
      setInstall(e);
    };
    const done = () => {
      setInstall(null);
      setInstalled(true);
    };
    const update = (e) => setWaiting(e.detail);
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', done);
    window.addEventListener('nexus:update', update);
    return () => {
      window.removeEventListener('online', connectivity);
      window.removeEventListener('offline', connectivity);
      window.removeEventListener('beforeinstallprompt', prompt);
      window.removeEventListener('appinstalled', done);
      window.removeEventListener('nexus:update', update);
    };
  }, []);
  return (
    <>
      {!online && (
        <div className="connectivity-banner" role="status">
          <WifiOff size={16} /> You’re offline. Reports and updates cannot be submitted until the
          connection returns.
        </div>
      )}
      {waiting && (
        <div className="update-banner" role="status">
          An app update is ready. Save any form before reloading.
          <button
            className="button light"
            onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}
          >
            <RefreshCw size={14} />
            Update app
          </button>
        </div>
      )}
      {!installed && (
        <button
          className="install-app"
          onClick={async () => {
            if (install) {
              await install.prompt();
              await install.userChoice;
              setInstall(null);
            } else setHelp(true);
          }}
        >
          <Download size={16} />
          Install NEXUS
        </button>
      )}
      {help && (
        <Modal title="Install the NEXUS app" onClose={() => setHelp(false)}>
          <div className="install-help">
            <Smartphone size={30} />
            <p>
              <strong>Computer or Android:</strong> open NEXUS in Chrome or Edge, then choose
              “Install app” from the address bar or browser menu.
            </p>
            <p>
              <strong>iPhone / iPad:</strong> open in Safari, tap Share, then Add to Home Screen.
            </p>
            <p>
              Installation needs HTTPS, or localhost on this computer. VS Code’s embedded preview
              may not offer installation. Use your regular browser.
            </p>
            <p>
              For a phone, use the deployed HTTPS address. Your phone’s localhost does not point to
              this laptop. The backend must remain available for sign-in, reports, and live feeds.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
