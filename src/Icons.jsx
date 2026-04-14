import React from 'react';

const Icon = ({ name, size = 18, className = "" }) => {
    const icons = {
        dashboard: <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 11h7v10H3V11z" strokeWidth="2"/>,
        company: <path d="M3 21h18M3 7v14M21 7v14M9 21V11h6v10M2 7l10-5 10 5" strokeWidth="2"/>,
        plus: <path d="M12 5v14M5 12h14" strokeWidth="2.5"/>,
        alert: <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" strokeWidth="2"/>,
        truck: <path d="M14 18V6a2 2 0 00-2-2H4a2 2 0 00-2 2v11a1 1 0 001 1h2m15-5V2v11a1 1 0 01-1 1h-2" strokeWidth="2"/>,
        wrench: <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.77 3.77z" strokeWidth="2"/>,
        download: <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeWidth="2"/>,
        chevronLeft: <path d="M15 18l-6-6 6-6" strokeWidth="2.5"/>,
        x: <path d="M18 6L6 18M6 6l12 12" strokeWidth="2.5"/>,
        check: <path d="M20 6L9 17l-5-5" strokeWidth="2.5"/>,
        fuel: <React.Fragment><path d="M3 22V8c0-2.1 1.7-3.8 3.8-3.8h7.5c2.1 0 3.8 1.7 3.8 3.8v14M4 9h13"/><path d="M19 8h1a2 2 0 012 2v6a2 2 0 01-2 2h-1M19 18h2"/><circle cx="10" cy="13" r="3"/></React.Fragment>,
        history: <React.Fragment><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/><path d="M3.05 11a9 9 0 11.5 4m-.5 5v-5h5"/></React.Fragment>,
        menu: <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2.5" />,
        user: <React.Fragment><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></React.Fragment>,
        chart: <path d="M18 20V10M12 20V4M6 20v-6" strokeWidth="2" />,
        qr: <React.Fragment><rect x="3" y="3" width="7" height="7" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" strokeWidth="2"/><path d="M14 14h3v3h-3v-3zm3 3h3v3h-3v-3zm-3 3h3v-3" strokeWidth="2"/></React.Fragment>,
        calendar: <React.Fragment><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></React.Fragment>,
        chevronDown: <polyline points="6 9 12 15 18 9" strokeWidth="2" />,
        settings: <React.Fragment><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth="2"/></React.Fragment>,
        hash: <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" strokeWidth="2"/>
    };

    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            {icons[name] || null}
        </svg>
    );
};

export default Icon;
