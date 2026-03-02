/**
 * PUNTO DE ENTRADA PRINCIPAL - SERVICEPRO EAM
 * Este archivo conecta la lógica de React con el DOM del index.html
 */

// Importante: Usamos './' para que el navegador busque App.js 
// en la misma carpeta (src) donde reside este archivo.
import App from './App.js';

// Inicializamos el contenedor raíz de React
// ReactDOM se encuentra disponible globalmente gracias al CDN en index.html
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
