import { createRoot } from 'react-dom/client';
import App from './App.jsx';

/* CSS cascade order matters: reset → tokens → components → utilities */
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';
import './tailwind.css';

createRoot(document.getElementById('root')).render(<App />);