/**
 * PUNTO DE ENTRADA PRINCIPAL
 * Este archivo conecta el componente App con el HTML.
 */

// Importante: El punto y la barra (./) le dicen al navegador 
// que busque en la misma carpeta donde está main.js
import App from '.src/App.js';

// Usamos ReactDOM (cargado globalmente desde el index.html)
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
