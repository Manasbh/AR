import React from 'react';
import { createRoot } from 'react-dom/client'; // Update the import
import Ren from './aprer';

const root = document.getElementById('root');
const rootElement = createRoot(root);

rootElement.render(<Ren />);
