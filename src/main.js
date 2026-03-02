// Forzamos la ruta completa desde la raíz del sitio
import App from '/src/App.js'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
