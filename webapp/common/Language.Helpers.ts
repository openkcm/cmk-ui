import Localization from 'sap/base/i18n/Localization';
import Storage from 'sap/ui/util/Storage';
import BuiltInSupportService from 'kms/services/BuiltInSupport.service';
const DEFAULT_LOCALE = 'EN';
const LOCALE_MAPPINGS: Record<string, string> = {
    EN: 'en',
    DE: 'de',
    FR: 'fr',
    JA: 'ja_JP',
    PT: 'pt_BR',
    ZH: 'zh_CN',
    ES: 'es'
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
    if (currentLanguage !== parsedLanguage) {
        console.info('Setting new language:', parsedLanguage);
        const localStorage = new Storage(Storage.Type.local);
        localStorage.put('sap-language', language);
        // Propagate the selected language to Built-in Support so its UI matches
        // the language chosen in KMS (no-op when BIS is not active).
        BuiltInSupportService.getInstance().updateLanguage(parsedLanguage);
        Localization.setLanguage(parsedLanguage);
        if (reload) {
            location.reload();
        }
    }
}
