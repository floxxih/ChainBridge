import type { I18nMessages } from "../types";

export const messagesEs: I18nMessages = {
  nav: {
    dashboard: "Panel",
    swap: "Intercambio",
    market: "Mercado",
    orders: "Ordenes",
    htlcs: "HTLCs",
    settings: "Configuracion",
    protocol: "Protocolo",
    explorer: "Explorador",
    about: "Acerca de",
    admin: "Admin",
  },
  commandPalette: {
    title: "Acciones Rapidas",
    placeholder: "Buscar rutas, ordenes, swaps, comandos...",
    empty: "Sin resultados",
    routes: "Rutas",
    orders: "Ordenes",
    swaps: "Swaps",
    commands: "Comandos",
    openButton: "Abrir paleta de comandos",
  },
  feeBanner: {
    warningTitle: "Se detectaron tarifas elevadas",
    criticalTitle: "Riesgo alto por congestion",
    dismiss: "Cerrar",
    snooze: "Posponer 30m",
    guidancePrefix: "Guia",
  },
};
