import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import it from './locales/it.json'

// Read saved language from localStorage
function getSavedLanguage() {
  try {
    const stored = localStorage.getItem('task-manager-data')
    if (stored) {
      const data = JSON.parse(stored)
      return data?.settings?.language || 'en'
    }
  } catch {
    // ignore
  }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
  },
  lng: getSavedLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
