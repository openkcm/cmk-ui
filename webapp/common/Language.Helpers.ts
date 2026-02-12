import Localization from 'sap/base/i18n/Localization';
import Storage from 'sap/ui/util/Storage';
const DEFAULT_LOCALE = 'EN';
const LOCALE_MAPPINGS: Record<string, string> = {
    EN: 'en',
    DE: 'de',
    ZH: 'zh_CN',
    FR: 'fr'
};

export function initLanguageConfig() {
    let newLanguage = new Storage(Storage.Type.local).get('sap-language') as string;
    if (!newLanguage) {
        newLanguage = DEFAULT_LOCALE;
    }
    setLanguage(newLanguage, false);
}

export function setLanguage(language: string, reload: boolean) {
    const parsedLanguage = LOCALE_MAPPINGS[language];
    if (!parsedLanguage) {
        console.info('Unsupported language', language, 'no changes will be performed');
        return;
    }
    // Retrieve current application language
    const currentLanguage = Localization.getLanguage();
    // Only perform the change if the current language is different from new language
    if (currentLanguage !== parsedLanguage) {
        console.info('Setting new language:', parsedLanguage);
        const localStorage = new Storage(Storage.Type.local);
        localStorage.put('sap-language', language);
        if (reload) {
            location.reload();
        }
        else {
            Localization.setLanguage(parsedLanguage);
        }
    }
}
