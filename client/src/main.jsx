import React from 'react';
import { createRoot } from 'react-dom/client';
import { loader } from '@monaco-editor/react';
import App from './App.jsx';
import './styles.css';

loader.config({ paths: { vs: '/monaco/vs' } });

createRoot(document.getElementById('root')).render(<App />);
