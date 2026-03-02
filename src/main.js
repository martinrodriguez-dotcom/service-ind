/**
 * main.js
 */
const renderizar = () => {
    const rootElement = document.getElementById('root');
    
    // Verificamos que window.App sea una función (un componente de React válido)
    if (typeof window.App === 'function') {
        const root = ReactDOM.createRoot(rootElement);
        root.render(
            React.createElement(window.App)
        );
        console.log("✔ Aplicación iniciada.");
    } else {
        console.log("... Esperando componentes ...");
        setTimeout(renderizar, 100);
    }
};

renderizar();
