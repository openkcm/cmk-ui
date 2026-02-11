import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import { RadioButtonGroup$SelectEvent } from 'sap/m/RadioButtonGroup';
import Storage from 'sap/ui/util/Storage';
import { setLanguage } from 'kms/common/Language.Helpers';
const localStorage = new Storage(Storage.Type.local);
const languageMapping: Record<string, number> = {
    DE: 0,
    EN: 1,
    ZH: 2,
    FR: 3
};
/**
 * @namespace kms
 */
export default class Settings extends BaseController {
    private readonly oneWayModel = new JSONModel({});

    public onInit(): void {
        super.onInit();
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    }

    public onBeforeRendering(): void {
        const selectedLanguage: number = languageMapping[localStorage.get('sap-language') as string];
        this.oneWayModel.setProperty('/selectedLanguageIndex', selectedLanguage >= 0 ? selectedLanguage : 1);
    }

    public onSelectedLanguageChanged(event: RadioButtonGroup$SelectEvent): void {
        this.oneWayModel.setProperty('/selectedLanguageIndex', event.getParameters().selectedIndex);
    }

    public onLanguageChanged(): void {
        const selectedLanguageIndex: number = this.oneWayModel.getProperty('/selectedLanguageIndex') as number;
        const selectedLanguage = Object.entries(languageMapping)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .find(([_, value]) => value === selectedLanguageIndex);
        if (!selectedLanguage) {
            throw new Error('Invalid language index');
        }
        setLanguage(selectedLanguage[0], false);
    }
}
