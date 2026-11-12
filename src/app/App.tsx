import { useState } from 'react';
import { LibraryView } from '../features/library/LibraryView';
import { ReaderView } from '../features/reader/ReaderView';
import { InfoDialog } from './InfoDialog';
import { InstallHint } from './InstallHint';
import { UpdatePrompt } from './UpdatePrompt';

type Screen = { name: 'library' } | { name: 'reader'; bookId: string };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'library' });
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      {screen.name === 'library' ? (
        <LibraryView onOpenBook={(bookId) => setScreen({ name: 'reader', bookId })} onShowInfo={() => setShowInfo(true)} />
      ) : (
        <ReaderView bookId={screen.bookId} onBack={() => setScreen({ name: 'library' })} />
      )}
      {screen.name === 'library' && <InstallHint />}
      {showInfo && <InfoDialog onClose={() => setShowInfo(false)} />}
      <UpdatePrompt />
    </>
  );
}
