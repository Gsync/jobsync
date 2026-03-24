/**
 * Centralized translation dictionaries.
 * Organized by namespace (nav, auth, settings, dashboard, jobs, activities, tasks).
 * Use getDictionary(locale) to get all translations for a specific locale.
 */

import { dashboard } from "./dictionaries/dashboard";
import { jobs } from "./dictionaries/jobs";
import { activities } from "./dictionaries/activities";
import { tasks } from "./dictionaries/tasks";
import { automations } from "./dictionaries/automations";
import { profile } from "./dictionaries/profile";
import { questions } from "./dictionaries/questions";
import { admin } from "./dictionaries/admin";
import { settings } from "./dictionaries/settings";

const core = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.myJobs": "My Jobs",
    "nav.automations": "Automations",
    "nav.tasks": "Tasks",
    "nav.activities": "Activities",
    "nav.questionBank": "Question Bank",
    "nav.profile": "Profile",
    "nav.administration": "Administration",
    "nav.developerOptions": "Developer Options",
    "nav.settings": "Settings",
    "nav.toggleMenu": "Toggle Menu",
    "nav.appTitle": "JobSync - Job Search Assistant",

    // Auth
    "auth.signIn": "Sign In",
    "auth.createAccount": "Create Account",
    "auth.welcomeBack": "Welcome back",
    "auth.enterCredentials": "Enter your credentials to access your account",
    "auth.getStarted": "Get started",
    "auth.createFreeAccount": "Create a free account to start tracking your applications",
    "auth.email": "Email",
    "auth.emailPlaceholder": "id@example.com",
    "auth.password": "Password",
    "auth.fullName": "Full Name",
    "auth.fullNamePlaceholder": "Your Name",
    "auth.subtitle": "Track your job search, powered by AI",
    "auth.login": "Login",
    "auth.createAnAccount": "Create an account",

    // Profile Dropdown
    "profile.myAccount": "My Account",
    "profile.settings": "Settings",
    "profile.support": "Support",
    "profile.logout": "Logout",

    // Settings
    "settings.appearance": "Appearance",
    "settings.appearanceDesc": "Customize the look and feel of the application.",
    "settings.theme": "Theme",
    "settings.themeDesc": "Select the theme for the app.",
    "settings.light": "Light",
    "settings.dark": "Dark",
    "settings.system": "System",
    "settings.language": "Language",
    "settings.languageDesc": "Select the display language. This also sets the language for EURES, ESCO and Eurostat data.",
    "settings.selectLanguage": "Select language",
    "settings.updatePreferences": "Update preferences",
    "settings.themeSaved": "Your selected theme has been saved.",

    // Common
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.search": "Search",
    "common.loadMore": "Load More",
    "common.na": "N/A",
    "common.actions": "Actions",
    "common.deleteConfirmTitle": "Are you sure you want to delete this {item}?",
    "common.deleteConfirmDesc": "This action cannot be undone. This will permanently delete and remove data from server.",
    "common.showingRecords": "Showing 1 to {count} of {total} {label}",
    "common.recordsPerPage": "Records per page",
    "common.support": "Support",
    "common.version": "Version",
    "common.copyright": "Copyright",
    "common.allRightsReserved": "All rights reserved.",
  },
  de: {
    "nav.dashboard": "Dashboard",
    "nav.myJobs": "Meine Jobs",
    "nav.automations": "Automatisierungen",
    "nav.tasks": "Aufgaben",
    "nav.activities": "Aktivitäten",
    "nav.questionBank": "Fragenkatalog",
    "nav.profile": "Profil",
    "nav.administration": "Verwaltung",
    "nav.developerOptions": "Entwickleroptionen",
    "nav.settings": "Einstellungen",
    "nav.toggleMenu": "Menü umschalten",
    "nav.appTitle": "JobSync - Jobsuche-Assistent",

    "auth.signIn": "Anmelden",
    "auth.createAccount": "Konto erstellen",
    "auth.welcomeBack": "Willkommen zurück",
    "auth.enterCredentials": "Gib deine Zugangsdaten ein, um auf dein Konto zuzugreifen",
    "auth.getStarted": "Los geht's",
    "auth.createFreeAccount": "Erstelle ein kostenloses Konto, um deine Bewerbungen zu verfolgen",
    "auth.email": "E-Mail",
    "auth.emailPlaceholder": "id@beispiel.de",
    "auth.password": "Passwort",
    "auth.fullName": "Vollständiger Name",
    "auth.fullNamePlaceholder": "Dein Name",
    "auth.subtitle": "Verfolge deine Jobsuche, unterstützt durch KI",
    "auth.login": "Einloggen",
    "auth.createAnAccount": "Konto erstellen",

    "profile.myAccount": "Mein Konto",
    "profile.settings": "Einstellungen",
    "profile.support": "Support",
    "profile.logout": "Abmelden",

    "settings.appearance": "Erscheinungsbild",
    "settings.appearanceDesc": "Passe das Aussehen der Anwendung an.",
    "settings.theme": "Theme",
    "settings.themeDesc": "Wähle das Farbschema für die App.",
    "settings.light": "Hell",
    "settings.dark": "Dunkel",
    "settings.system": "System",
    "settings.language": "Sprache",
    "settings.languageDesc": "Wähle die Anzeigesprache. Dies legt auch die Sprache für EURES-, ESCO- und Eurostat-Daten fest.",
    "settings.selectLanguage": "Sprache wählen",
    "settings.updatePreferences": "Einstellungen aktualisieren",
    "settings.themeSaved": "Dein ausgewähltes Theme wurde gespeichert.",

    "common.loading": "Laden...",
    "common.error": "Fehler",
    "common.save": "Speichern",
    "common.cancel": "Abbrechen",
    "common.delete": "Löschen",
    "common.edit": "Bearbeiten",
    "common.create": "Erstellen",
    "common.search": "Suchen",
    "common.loadMore": "Mehr laden",
    "common.na": "k.A.",
    "common.actions": "Aktionen",
    "common.deleteConfirmTitle": "Möchtest du diesen/dieses {item} wirklich löschen?",
    "common.deleteConfirmDesc": "Diese Aktion kann nicht rückgängig gemacht werden. Die Daten werden dauerhaft vom Server gelöscht.",
    "common.showingRecords": "Zeige 1 bis {count} von {total} {label}",
    "common.recordsPerPage": "Einträge pro Seite",
    "common.support": "Support",
    "common.version": "Version",
    "common.copyright": "Urheberrecht",
    "common.allRightsReserved": "Alle Rechte vorbehalten.",
  },
  fr: {
    "nav.dashboard": "Tableau de bord",
    "nav.myJobs": "Mes emplois",
    "nav.automations": "Automatisations",
    "nav.tasks": "Tâches",
    "nav.activities": "Activités",
    "nav.questionBank": "Banque de questions",
    "nav.profile": "Profil",
    "nav.administration": "Administration",
    "nav.developerOptions": "Options développeur",
    "nav.settings": "Paramètres",
    "nav.toggleMenu": "Basculer le menu",
    "nav.appTitle": "JobSync - Assistant de recherche d'emploi",

    "auth.signIn": "Se connecter",
    "auth.createAccount": "Créer un compte",
    "auth.welcomeBack": "Bon retour",
    "auth.enterCredentials": "Entrez vos identifiants pour accéder à votre compte",
    "auth.getStarted": "Commencer",
    "auth.createFreeAccount": "Créez un compte gratuit pour suivre vos candidatures",
    "auth.email": "E-mail",
    "auth.emailPlaceholder": "id@exemple.com",
    "auth.password": "Mot de passe",
    "auth.fullName": "Nom complet",
    "auth.fullNamePlaceholder": "Votre nom",
    "auth.subtitle": "Suivez votre recherche d'emploi, propulsé par l'IA",
    "auth.login": "Connexion",
    "auth.createAnAccount": "Créer un compte",

    "profile.myAccount": "Mon compte",
    "profile.settings": "Paramètres",
    "profile.support": "Support",
    "profile.logout": "Déconnexion",

    "settings.appearance": "Apparence",
    "settings.appearanceDesc": "Personnalisez l'apparence de l'application.",
    "settings.theme": "Thème",
    "settings.themeDesc": "Sélectionnez le thème de l'application.",
    "settings.light": "Clair",
    "settings.dark": "Sombre",
    "settings.system": "Système",
    "settings.language": "Langue",
    "settings.languageDesc": "Sélectionnez la langue d'affichage. Cela définit également la langue pour les données EURES, ESCO et Eurostat.",
    "settings.selectLanguage": "Sélectionner la langue",
    "settings.updatePreferences": "Mettre à jour les préférences",
    "settings.themeSaved": "Votre thème sélectionné a été enregistré.",

    "common.loading": "Chargement...",
    "common.error": "Erreur",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.create": "Créer",
    "common.search": "Rechercher",
    "common.loadMore": "Charger plus",
    "common.na": "N/D",
    "common.actions": "Actions",
    "common.deleteConfirmTitle": "Êtes-vous sûr de vouloir supprimer ce/cet {item} ?",
    "common.deleteConfirmDesc": "Cette action est irréversible. Les données seront définitivement supprimées du serveur.",
    "common.showingRecords": "Affichage de 1 à {count} sur {total} {label}",
    "common.recordsPerPage": "Enregistrements par page",
    "common.support": "Assistance",
    "common.version": "Version",
    "common.copyright": "Droits d'auteur",
    "common.allRightsReserved": "Tous droits réservés.",
  },
  es: {
    "nav.dashboard": "Panel",
    "nav.myJobs": "Mis empleos",
    "nav.automations": "Automatizaciones",
    "nav.tasks": "Tareas",
    "nav.activities": "Actividades",
    "nav.questionBank": "Banco de preguntas",
    "nav.profile": "Perfil",
    "nav.administration": "Administración",
    "nav.developerOptions": "Opciones de desarrollador",
    "nav.settings": "Configuración",
    "nav.toggleMenu": "Alternar menú",
    "nav.appTitle": "JobSync - Asistente de búsqueda de empleo",

    "auth.signIn": "Iniciar sesión",
    "auth.createAccount": "Crear cuenta",
    "auth.welcomeBack": "Bienvenido de nuevo",
    "auth.enterCredentials": "Ingresa tus credenciales para acceder a tu cuenta",
    "auth.getStarted": "Empezar",
    "auth.createFreeAccount": "Crea una cuenta gratuita para rastrear tus solicitudes",
    "auth.email": "Correo electrónico",
    "auth.emailPlaceholder": "id@ejemplo.com",
    "auth.password": "Contraseña",
    "auth.fullName": "Nombre completo",
    "auth.fullNamePlaceholder": "Tu nombre",
    "auth.subtitle": "Gestiona tu búsqueda de empleo, impulsado por IA",
    "auth.login": "Entrar",
    "auth.createAnAccount": "Crear una cuenta",

    "profile.myAccount": "Mi cuenta",
    "profile.settings": "Configuración",
    "profile.support": "Soporte",
    "profile.logout": "Cerrar sesión",

    "settings.appearance": "Apariencia",
    "settings.appearanceDesc": "Personaliza el aspecto de la aplicación.",
    "settings.theme": "Tema",
    "settings.themeDesc": "Selecciona el tema de la aplicación.",
    "settings.light": "Claro",
    "settings.dark": "Oscuro",
    "settings.system": "Sistema",
    "settings.language": "Idioma",
    "settings.languageDesc": "Selecciona el idioma de visualización. Esto también establece el idioma para los datos de EURES, ESCO y Eurostat.",
    "settings.selectLanguage": "Seleccionar idioma",
    "settings.updatePreferences": "Actualizar preferencias",
    "settings.themeSaved": "Tu tema seleccionado ha sido guardado.",

    "common.loading": "Cargando...",
    "common.error": "Error",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.create": "Crear",
    "common.search": "Buscar",
    "common.loadMore": "Cargar más",
    "common.na": "N/D",
    "common.actions": "Acciones",
    "common.deleteConfirmTitle": "¿Estás seguro de que deseas eliminar este/a {item}?",
    "common.deleteConfirmDesc": "Esta acción no se puede deshacer. Los datos se eliminarán permanentemente del servidor.",
    "common.showingRecords": "Mostrando 1 a {count} de {total} {label}",
    "common.recordsPerPage": "Registros por página",
    "common.support": "Soporte",
    "common.version": "Versión",
    "common.copyright": "Derechos de autor",
    "common.allRightsReserved": "Todos los derechos reservados.",
  },
} as const;

// Merge all namespace dictionaries into a single flat dictionary per locale
function mergeDictionaries(...namespaces: Record<string, Record<string, string>>[]) {
  const locales = ["en", "de", "fr", "es"] as const;
  const merged: Record<string, Record<string, string>> = {};
  for (const locale of locales) {
    merged[locale] = {};
    for (const ns of namespaces) {
      Object.assign(merged[locale], ns[locale] ?? {});
    }
  }
  return merged;
}

const dictionaries = mergeDictionaries(core, dashboard, jobs, activities, tasks, automations, profile, questions, admin, settings);

export type TranslationKey = string;
export type Dictionary = Record<string, string>;

export function getDictionary(locale: string): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export function t(locale: string, key: string): string {
  const dict = getDictionary(locale);
  return dict[key] ?? key;
}
