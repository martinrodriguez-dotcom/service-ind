/**
 * SISTEMA SERVICEPRO EAM - DISPARADOR PRINCIPAL
 * Este archivo detecta cuando los componentes globales están listos 
 * en el objeto 'window' para evitar errores de sincronización de Babel.
 */

const iniciarAplicacion = () => {
    const contenedor = document.getElementById('root');
    
    // Verificamos si el contenedor existe en el HTML
    if (!contenedor) {
        console.error("Error: No se encontró el elemento #root en el DOM.");
        return;
    }

    // Verificamos si el componente App ya fue inyectado por Babel en el global
    if (window.App) {
        const root = ReactDOM.createRoot(contenedor);
        
        root.render(
            <React.StrictMode>
                <window.App />
            </React.StrictMode>
        );
        
        console.log("✔ ServicePro: Aplicación renderizada con éxito.");
    } else {
        // Si App no está lista (Babel sigue traduciendo), reintentamos en 100ms
        console.warn("... Esperando que los componentes de ServicePro se carguen ...");
        setTimeout(iniciarAplicacion, 100);
    }
};

// Ejecutamos la secuencia de inicio
iniciarAplicacion();
