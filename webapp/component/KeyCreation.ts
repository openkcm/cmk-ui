import { BYOKProviders, CloudProviders, HYOKProviders, KeyCreationTypes } from 'kms/common/Enums';
import { MangedKeyPayload, HyokKeyPayload } from 'kms/common/Types';
import BaseController from 'kms/controller/BaseController';
import { showErrorMessage } from "kms/common/Helpers";
import {AxiosError} from "axios";
import Dialog from 'sap/m/Dialog';
import MessageBox from 'sap/m/MessageBox';
import NavContainer from 'sap/m/NavContainer';
import Page from 'sap/m/Page';
import Wizard from 'sap/m/Wizard';
import Fragment from 'sap/ui/core/Fragment';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Model from 'sap/ui/model/Model';
import ResourceModel from 'sap/ui/model/resource/ResourceModel';

interface KeyCreationParams {
    keyConfigId: string,
    keyType: KeyCreationTypes,
    keySubtype: HYOKProviders | BYOKProviders | undefined,
}
interface KeyCreateCallBackFn {
    (payload: MangedKeyPayload | HyokKeyPayload): Promise<void>;
}


export default class KeyCreation extends BaseController {

    private readonly keyCreationModel = new JSONModel({});
    private keyCreatePopover: Dialog | undefined;
    private keyCreationNavContainer: NavContainer | undefined;
    private HYOKKeyCreationNavContainer: NavContainer | undefined;
    private keyCreationWizard: Wizard | undefined;
    private HYOKKeyCreationWizard: Wizard | undefined;
    private keyCreationWizardPage: Page | undefined;
    private HYOKKeyCreationWizardPage: Page | undefined;
    private keyCreationReviewPage: Page | undefined;
    private HYOKKeyCreationReviewPage: Page | undefined;
    private i18nModel: ResourceModel;
    private BaseController: BaseController;
    private type: KeyCreationTypes;
    private subtype: HYOKProviders | BYOKProviders;
    private keyConfigId: string;
    private onKeyCreateCallBackfnc: KeyCreateCallBackFn;


    public openKeyCreationWizard(keyCreationParams: KeyCreationParams, i18nModel: Model, BaseController: BaseController, onKeyCreateCallBackfnc: KeyCreateCallBackFn): void {
        this.type = keyCreationParams.keyType;
        this.subtype = keyCreationParams.keySubtype;
        this.keyConfigId = keyCreationParams.keyConfigId;
        this.onKeyCreateCallBackfnc = onKeyCreateCallBackfnc;
        this.i18nModel = i18nModel as ResourceModel;
        this.BaseController = BaseController;
        this.setKeyCreationWizard();
    }
    private setKeyCreationWizard(): void {
        const wizardView = this.getKeyCreationWizardView(this.type);
        const loadFragment = async (): Promise<void> => {
            this.keyCreatePopover = await Fragment.load({
                // DO NOT change this id else Fragment.byId("keyCreatePopoverDialog",.... would stop working.
                // Also DO NOT assign an id the the fragment view in the XML file.
                id: 'keyCreatePopoverDialog',
                name: wizardView,
                controller: this
            }) as Dialog;

            this.keyCreatePopover.addStyleClass('sapUiSizeCompact');
            this.keyCreatePopover.setModel(this.i18nModel, 'i18n');
            this.keyCreatePopover.setModel(this.keyCreationModel, 'model');
            this.keyCreatePopover.open();

            this.keyCreatePopover.setBusy(true);
            this.resetKeyCreationModel();
            this.setKeyTypeWizard()
            this.keyCreatePopover.setBusy(false);

        }

        if (!this.keyCreatePopover) {
            loadFragment().catch(error => {
                console.error('Error loading key creation wizard fragment:', error);
                showErrorMessage(error as AxiosError, this.BaseController.getText('errorLoadingKeyCreationWizard'));
                this.keyCreatePopover?.destroy();
                this.keyCreatePopover = undefined;
            });
        } else {
            this.keyCreatePopover?.destroy();
            loadFragment().catch(error => {
                console.error('Error loading key creation wizard fragment:', error);
                showErrorMessage(error as AxiosError, this.BaseController.getText('errorLoadingKeyCreationWizard'));
                this.keyCreatePopover?.destroy();
                this.keyCreatePopover = undefined;
            });
        }
    }
    private setKeyTypeWizard(): void {
        switch (this.type) {
            case KeyCreationTypes.SYSTEM_MANAGED:
                this.keyCreationWizard = Fragment.byId("keyCreatePopoverDialog", "keyCreationWizard") as Wizard;
                this.keyCreationNavContainer = Fragment.byId("keyCreatePopoverDialog", "keyCreationNavContainer") as NavContainer;
                this.keyCreationReviewPage = Fragment.byId("keyCreatePopoverDialog", "keyCreationReviewPage") as Page;
                this.keyCreationWizardPage = Fragment.byId("keyCreatePopoverDialog", "keyCreationWizardPage") as Page;
                this.keyCreationNavContainer?.to(this.keyCreationWizardPage);
                break;
            case KeyCreationTypes.HYOK:
                if (this.subtype === HYOKProviders.AWS) {
                    this.HYOKKeyCreationWizard = Fragment.byId("keyCreatePopoverDialog", "HYOKKeyCreationWizard") as Wizard;
                    this.HYOKKeyCreationNavContainer = Fragment.byId("keyCreatePopoverDialog", "HYOKKeyCreationNavContainer") as NavContainer;
                    this.HYOKKeyCreationReviewPage = Fragment.byId("keyCreatePopoverDialog", "HYOKKeyCreationReviewPage") as Page;
                    this.HYOKKeyCreationWizardPage = Fragment.byId("keyCreatePopoverDialog", "HYOKKeyCreationWizardPage") as Page;
                    this.HYOKKeyCreationNavContainer?.to(this.HYOKKeyCreationWizardPage);
                }
                break;
            case KeyCreationTypes.BYOK:
                // For BYOK, we can add similar logic when needed
                break;
        }
    }
    private getKeyCreationWizardView(type: KeyCreationTypes): string {
        switch (type) {
            case KeyCreationTypes.SYSTEM_MANAGED:
                return 'kms.resources.fragments.common.KeyCreationWizard';
            case KeyCreationTypes.HYOK:
                return 'kms.resources.fragments.common.HYOKKeyCreationWizard';
            case KeyCreationTypes.BYOK:
                return 'kms.resources.fragments.common.BYOKKeyCreationWizard';
            default:
                throw new Error('Invalid KeyCreationType');
        }
    }
    private resetKeyCreationModel() {
        //@TODO:change the key model as per the selected key type and subtype
        //To be part of the next PR
        this.keyCreationModel.setData({
            name: '' as string,
            keyType: this.type,
            keySource: 'keyID' as string,
            keyARN: '' as string,
            description: '' as string,
            algorithm: 'AES256' as string,
            region: '' as string,
            regionList: [
                { key: '', text: 'Select Region', provider: CloudProviders.AWS },
                { key: 'us-east-1', text: 'US East (N. Virginia)', provider: CloudProviders.AWS },
                { key: 'us-east-2', text: 'US East (Ohio)', provider: CloudProviders.AWS },
                { key: 'us-west-1', text: 'US West (N. California)', provider: CloudProviders.AWS },
                { key: 'us-west-2', text: 'US West (Oregon)', provider: CloudProviders.AWS }
            ] as object[],
            provider: '' as string,
            enabled: true as boolean,
            detailsStepValid: false as boolean,
            keySourceStepValid: false as boolean,
            keyRegionStepValid: false as boolean,
            keyNameValueState: 'None' as string,
            keyNameValueStateText: '' as string,
            keyARNValueState: 'None' as string,
            keyARNValueStateText: '' as string,
            createKeyEnabled: false as boolean,
            tags: [] as string[]
        }, true);
    }
    public onKeyCreateNameChanged(): void {
        const keyName = this.keyCreationModel.getProperty('/name') as string;
        if (!keyName || keyName.length < 2) {
            this.keyCreationModel.setProperty('/keyNameValueState', 'Error');
            this.keyCreationModel.setProperty('/keyNameValueStateText', this.BaseController.getText('keyNameRequired'));
            this.keyCreationModel.setProperty('/detailsStepValid', false);
        } else {
            this.keyCreationModel.setProperty('/keyNameValueState', 'None');
            this.keyCreationModel.setProperty('/keyNameValueStateText', '');
            this.keyCreationModel.setProperty('/detailsStepValid', true);
        }
    }
    public onKeyCreateRegionChanged(): void {
        const region = this.keyCreationModel.getProperty('/region') as string;
        if (region === '') {
            this.keyCreationModel.setProperty('/keyRegionStepValid', false);
        } else {
            const regionList = this.keyCreationModel.getProperty('/regionList') as { key: string, text: string, provider: string }[];
            const selectedRegion = regionList.find(item => item.key === region);
            this.keyCreationModel.setProperty('/provider', selectedRegion?.provider);
            this.keyCreationModel.setProperty('/keyRegionStepValid', true);
        }
    }
    public onKeyCreateARNChanged(): void {
        const keyARN = this.keyCreationModel.getProperty('/keyARN') as string;
        if (!keyARN || keyARN.length < 15) {
            this.keyCreationModel.setProperty('/keyARNValueState', 'Error');
            this.keyCreationModel.setProperty('/keyARNValueStateText', this.BaseController.getText('keyARNRequired'));
            this.keyCreationModel.setProperty('/keySourceStepValid', false);
        } else {
            this.keyCreationModel.setProperty('/keyARNValueState', 'None');
            this.keyCreationModel.setProperty('/keyARNValueStateText', '');
            this.keyCreationModel.setProperty('/keySourceStepValid', true);
        }
    }
    public onKeyCreationWizardComplete(): void {
        const detailsStepValid = this.keyCreationModel.getProperty('/detailsStepValid') as boolean;
        const keyRegionStepValid = this.keyCreationModel.getProperty('/keyRegionStepValid') as boolean;
        if (detailsStepValid && keyRegionStepValid) {
            this.keyCreationModel.setProperty('/createKeyEnabled', true);
            this.keyCreationNavContainer?.to(this.keyCreationReviewPage);
        } else {
            this.keyCreationModel.setProperty('/createKeyEnabled', false);
        }
    }
    public onHYOKKeyCreationWizardComplete(): void {
        const detailsStepValid = this.keyCreationModel.getProperty('/detailsStepValid') as boolean;
        const keySourceStepValid = this.keyCreationModel.getProperty('/keySourceStepValid') as boolean;
        if (detailsStepValid && keySourceStepValid) {
            this.keyCreationModel.setProperty('/createKeyEnabled', true);
            this.HYOKKeyCreationNavContainer?.to(this.HYOKKeyCreationReviewPage);
        } else {
            this.keyCreationModel.setProperty('/createKeyEnabled', false);
        }
    }
    public onKeyCreationWizardCancelPress(): void {
        MessageBox.warning(this.BaseController.getText('confirmCancelKeyCreation'), {
            styleClass: 'sapUiSizeCompact',
            emphasizedAction: MessageBox.Action.NO,
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    this.keyCreatePopover?.close();
                    this.keyCreatePopover?.destroy();
                    this.keyCreatePopover = undefined;
                    this.resetKeyCreationModel();
                }
            }
        });
    }
    public onNavBackToStepPress(stepNumber: number): void {
        const fnAfterNavigate = () => {
            this.keyCreationWizard?.goToStep(this.keyCreationWizard?.getSteps()[stepNumber], true);
            this.keyCreationNavContainer?.detachAfterNavigate(fnAfterNavigate);

            this.HYOKKeyCreationWizard?.goToStep(this.HYOKKeyCreationWizard?.getSteps()[stepNumber], true);
            this.HYOKKeyCreationNavContainer?.detachAfterNavigate(fnAfterNavigate);
        }
        this.keyCreationNavContainer?.attachAfterNavigate(fnAfterNavigate);
        this.keyCreationNavContainer?.backToPage(this.keyCreationWizardPage.getId());

        this.HYOKKeyCreationNavContainer?.attachAfterNavigate(fnAfterNavigate);
        this.HYOKKeyCreationNavContainer?.backToPage(this.HYOKKeyCreationWizardPage.getId());
    }

    public async onKeyCreationWizardSubmitPress(): Promise<void> {
        let payload: MangedKeyPayload | HyokKeyPayload;
        this.keyCreatePopover.setBusy(false);
        if (this.keyCreationModel.getProperty('/keyType') === KeyCreationTypes.SYSTEM_MANAGED) {
            payload = {
                name: this.keyCreationModel.getProperty('/name') as string,
                keyConfigurationID: this.keyConfigId,
                type: this.keyCreationModel.getProperty('/keyType') as KeyCreationTypes,
                description: this.keyCreationModel.getProperty('/description') as string,
                algorithm: this.keyCreationModel.getProperty('/algorithm') as string,
                region: this.keyCreationModel.getProperty('/region') as string,
                provider: this.keyCreationModel.getProperty('/provider') as string,
                enabled: this.keyCreationModel.getProperty('/enabled') as boolean
            }
        } else {
            payload = {
                name: this.keyCreationModel.getProperty('/name') as string,
                keyConfigurationID: this.keyConfigId,
                type: this.keyCreationModel.getProperty('/keyType') as KeyCreationTypes,
                description: this.keyCreationModel.getProperty('/description') as string,
                enabled: this.keyCreationModel.getProperty('/enabled') as boolean,
                nativeId: this.keyCreationModel.getProperty('/keyARN') as string
            }
        }
        try {
            await this.onKeyCreateCallBackfnc(payload);
            this.keyCreatePopover?.close();
            this.keyCreatePopover?.destroy();
            this.keyCreatePopover = undefined;
            this.resetKeyCreationModel();
        } catch (error) {
            showErrorMessage(error as AxiosError, this.BaseController.getText('errorAddingKey'));
            console.error('Error creating key', error);
        } finally {
            this.keyCreatePopover?.setBusy(false);
        }
    }
}