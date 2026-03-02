/**
 * PUNTO DE ENTRADA - CARPETA SRC
 * Este archivo informa a React que App.js está en su misma ubicación.
 */

// Usamos la ruta relativa explícita. 
// Al estar main.js y App.js en /src/, el './' es la forma correcta.
import App from './App.js';

// React y ReactDOM ya están en el Window gracias al index.html
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
