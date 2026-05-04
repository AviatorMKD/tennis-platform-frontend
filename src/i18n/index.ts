import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import mkCommon from './locales/mk/common.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        lng: 'en',

        resources: {
            en: {
                common: enCommon,
            },
            mk: {
                common: mkCommon,
            },
        },

        ns: ['common'],
        defaultNS: 'common',

        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;