/** Flat UI dictionary: every user-facing string, one key per language. */

export type Lang = "en" | "es";

const en = {
  pageTitle: "Coffee shops — the map",
  pageDescription: "Map of coffee shops with Instagram, Google Maps and TikTok.",
  loadingTitle: "Coffee shops",
  loadingBody: "Loading…",
  errorTitle: "No data",
  errorBody: "Check your connection and reload.",
  titleNoData: "no data",
  subtitle: "☕ {n} coffee shops in {city} / {m} cities",
  shopsTab: "Coffee shops",
  settingsTab: "Settings",
  panelsAria: "Panels",
  closeListAria: "Close list",
  closeSettingsAria: "Close settings",
  closeCardAria: "Close shop card",
  shopCardAria: "Coffee shop card",
  searchPlaceholder: "Name or @handle",
  searchAria: "Search coffee shops",
  withInstagram: "With Instagram",
  withInstagramTitle: "Only shops with a known Instagram",
  cityAria: "City",
  allCities: "All",
  emptySearch: "No shops match “{query}”. Try another word or turn off the Instagram filter.",
  listCapNote: "Showing the first {cap} of {n}. Search by name to reach the rest.",
  noInstagram: "no Instagram",
  instagramUnknown: "no known Instagram",
  noRecentPost: "This shop has no recent post archived. Open its profile to see what it posts.",
  noInstagramLinked:
    "This shop came from the OpenStreetMap or Google Maps census; it has no linked Instagram.",
  followers: "Followers",
  address: "Address",
  noAddress: "No address on record",
  latestPostTitle: "Latest post from {name} on Instagram",
  instagram: "Instagram",
  googleMaps: "Google Maps",
  tiktokTitle: "#{tag} on TikTok",
  creditData: "Data",
  nightMode: "Night mode",
  nightDesc: "Sheet and panels inverted",
  heatmap: "Heatmap",
  heatDesc: "Density by Instagram followers",
  settingsNote:
    "Coffee shops without Instagram appear in grey; those with it, in waterfall. Filtering dims them, never hides them.",
  language: "Language",
  languageDescEnglish: "English",
  languageDescSpanish: "Spanish",
  dataShort: "data",
  markerFollowers: "{n} followers",
  markerNoInstagram: "no Instagram",
  markerAria: "{name}, {n} followers",
  markerNoInstagramAria: "{name}, no Instagram",
  pwaInstall: "Install the map to take it offline",
  pwaInstallBtn: "Install",
  pwaNotNow: "Not now",
} as const;

export type I18nKey = keyof typeof en;

const es: Record<I18nKey, string> = {
  pageTitle: "Cafés — el mapa",
  pageDescription: "Mapa de cafés con Instagram, Google Maps y TikTok.",
  loadingTitle: "Cafés",
  loadingBody: "Cargando…",
  errorTitle: "Sin datos",
  errorBody: "Revisa tu conexión y recarga.",
  titleNoData: "sin datos",
  subtitle: "☕ {n} cafeterías en {city} / {m} ciudades",
  shopsTab: "Cafés",
  settingsTab: "Ajustes",
  panelsAria: "Paneles",
  closeListAria: "Cerrar lista",
  closeSettingsAria: "Cerrar ajustes",
  closeCardAria: "Cerrar ficha",
  shopCardAria: "Ficha del café",
  searchPlaceholder: "Nombre o @handle",
  searchAria: "Buscar café",
  withInstagram: "Con Instagram",
  withInstagramTitle: "Sólo cafés con Instagram conocido",
  cityAria: "Ciudad",
  allCities: "Todas",
  emptySearch:
    "Ningún café coincide con «{query}». Prueba otra palabra o quita el filtro de Instagram.",
  listCapNote: "Mostrando los {cap} primeros de {n}. Busca por nombre para llegar al resto.",
  noInstagram: "sin Instagram",
  instagramUnknown: "sin Instagram conocido",
  noRecentPost:
    "Este café no tiene un post reciente archivado. Abre su perfil para ver qué publica.",
  noInstagramLinked:
    "Este café salió del censo de OpenStreetMap o Google Maps; no tiene Instagram vinculado.",
  followers: "Seguidores",
  address: "Dirección",
  noAddress: "Dirección no registrada",
  latestPostTitle: "Último post de {name} en Instagram",
  instagram: "Instagram",
  googleMaps: "Google Maps",
  tiktokTitle: "#{tag} en TikTok",
  creditData: "Datos",
  nightMode: "Modo noche",
  nightDesc: "Hoja y paneles invertidos",
  heatmap: "Mapa de calor",
  heatDesc: "Densidad por seguidores de Instagram",
  settingsNote:
    "Los cafés sin Instagram se ven en gris; los que sí, en verde agua. Filtrar los atenúa, nunca los esconde.",
  language: "Idioma",
  languageDescEnglish: "Inglés",
  languageDescSpanish: "Español",
  dataShort: "datos",
  markerFollowers: "{n} seguidores",
  markerNoInstagram: "sin Instagram",
  markerAria: "{name}, {n} seguidores",
  markerNoInstagramAria: "{name}, sin Instagram",
  pwaInstall: "Instala el mapa para llevarlo sin señal",
  pwaInstallBtn: "Instalar",
  pwaNotNow: "Ahora no",
};

export const DICT: Record<Lang, Record<I18nKey, string>> = { en, es };
export const LANGS: readonly Lang[] = ["en", "es"];

export function t(lang: Lang, key: I18nKey): string {
  return DICT[lang][key];
}

export function localeFor(lang: Lang): string {
  return lang === "es" ? "es-MX" : "en-US";
}

/** Fill `{name}` placeholders in a dictionary string. */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}
