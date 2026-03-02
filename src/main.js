// NO USAR IMPORTS AQUÍ
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// Renderizamos la App que ya vive en window
root.render(
  <React.StrictMode>
    <window.App />
  </React.StrictMode>
);
