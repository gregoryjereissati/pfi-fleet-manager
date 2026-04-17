import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ptBR from '../locales/pt-BR.json'
import enUS from '../locales/en-US.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'en-US': { translation: enUS },
    },
    lng: localStorage.getItem('i18nextLng') ?? 'pt-BR',
    fallbackLng: 'pt-BR',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
