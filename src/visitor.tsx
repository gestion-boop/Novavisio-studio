import {createRoot} from 'react-dom/client';
import {ErrorBoundary,installErrorLog} from './ErrorBoundary';
import {Tour} from './tour';

installErrorLog();
createRoot(document.getElementById('visitor-root')!).render(<ErrorBoundary label="visite exportée"><Tour/></ErrorBoundary>);
