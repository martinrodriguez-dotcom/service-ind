/**
 * DISPARADOR PRINCIPAL
 * Este archivo espera a que Babel termine de inyectar App en window.
 */

const startApp = () => {
    const rootElement = document.getElementById('root');
    if (!rootElement) return;

    if (window.App) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(
            <React.StrictMode>
                <window.App />
            </React.StrictMode>
        );
        console.log("ServicePro: Sistema iniciado correctamente.");
    } else {
        // Si App no está lista, reintentamos en 100ms
        console.warn("ServicePro: Esperando componentes...");
        setTimeout(startApp, 100);
    }
};

// Iniciamos la secuencia
startApp();
