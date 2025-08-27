import { BYOKProviders, CloudProviders, HYOKProviders, KeyCreationTypes } from 'kms/common/Enums';
import { MangedKeyPayload, HyokKeyPayload, AWScertificates, hyokAWSCryptoCertInput, hyokAWSManagementCertInput, AWSAccessDetails } from 'kms/common/Types';
import { showErrorMessage } from 'kms/common/Helpers';
import { AxiosError } from 'axios';
import BaseController from 'kms/controller/BaseController';
import KeyConfigDetail from 'kms/controller/keyConfigs/detail/Detail.controller';
import Api from 'kms/services/Api.service';
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
    keyConfigId: string
    keyType: KeyCreationTypes
    keySubtype: HYOKProviders | BYOKProviders
}
type KeyCreateCallBackFn = (payload: MangedKeyPayload | HyokKeyPayload) => Promise<void>;
interface HYOKAWScertificates {
    tenantDefault: {
        count: number
        value: AWScertificates[]
    }
    crypto: {
        count: number
        value: AWScertificates[]
    }
}

export default class KeyCreation extends BaseController {
    private readonly keyCreationModel = new JSONModel({}); // This model should be initialized with the correct structure based on the key creation wizard requirements (for managed key, HYOK and BYOK)
    private api: Api;
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
    private parentController: KeyConfigDetail;
    private type: KeyCreationTypes;
    private subtype: HYOKProviders | BYOKProviders;
    private keyConfigId: string;
    private onKeyCreateCallBackfnc: KeyCreateCallBackFn;
    private managementDefaultModel: hyokAWSManagementCertInput = { trustAnchorARN: null, roleARN: null, rootCA: null };
    private cryptoDefaultModel: hyokAWSCryptoCertInput = { trustAnchorCryptoARN: null, roleCryptoARN: null, rootCryptoCA: null, selectedCryptoRolesCertKeys: [], selectedCryptoCerts: [] };

    public openKeyCreationWizard(keyCreationParams: KeyCreationParams, i18nModel: Model, parentController: KeyConfigDetail, api: Api, onKeyCreateCallBackfnc: KeyCreateCallBackFn): void {
        this.type = keyCreationParams.keyType;
        this.api = api;
        this.subtype = keyCreationParams.keySubtype;
        this.keyConfigId = keyCreationParams.keyConfigId;
        this.onKeyCreateCallBackfnc = onKeyCreateCallBackfnc;
        this.i18nModel = i18nModel as ResourceModel;
        this.parentController = parentController;
        this.setKeyCreationWizard();
    }

    private setKeyCreationWizard(): void {
        const wizardView = this.getKeyCreationWizardView(this.type);
        const loadFragment = async (): Promise<void> => {
            this.keyCreatePopover = await Fragment.load({
                // DO NOT change this id else Fragment.byId("keyCreatePopoverDialog",.... would stop working.
                // Also DO NOT assign an id to the fragment view in the XML file.
                id: 'keyCreatePopoverDialog',
                name: wizardView,
                controller: this
            }) as Dialog;

            this.keyCreatePopover.addStyleClass('sapUiSizeCompact');
            this.keyCreatePopover.setModel(this.i18nModel, 'i18n');
            this.keyCreatePopover.setModel(this.keyCreationModel, 'model');
            this.keyCreatePopover.open();
            this.setKeyTypeWizard();
            this.resetKeyCreationModel();
        };

        if (!this.keyCreatePopover) {
            loadFragment().catch((err: unknown) => {
                console.error('Error loading key creation wizard fragment:', err);
                showErrorMessage(err as AxiosError, this.parentController.getText('errorLoadingKeyCreationWizard'));
                this.keyCreatePopover?.destroy();
                this.keyCreatePopover = undefined;
            });
        }
        else {
            this.keyCreatePopover?.destroy();
            loadFragment().catch((err: unknown) => {
                console.error('Error loading key creation wizard fragment:', err);
                showErrorMessage(err as AxiosError, this.parentController.getText('errorLoadingKeyCreationWizard'));
                this.keyCreatePopover?.destroy();
                this.keyCreatePopover = undefined;
            });
        }
    }

    private setKeyTypeWizard(): void {
        switch (this.type) {
            case KeyCreationTypes.SYSTEM_MANAGED:
                this.keyCreationWizard = Fragment.byId('keyCreatePopoverDialog', 'keyCreationWizard') as Wizard;
                this.keyCreationNavContainer = Fragment.byId('keyCreatePopoverDialog', 'keyCreationNavContainer') as NavContainer;
                this.keyCreationReviewPage = Fragment.byId('keyCreatePopoverDialog', 'keyCreationReviewPage') as Page;
                this.keyCreationWizardPage = Fragment.byId('keyCreatePopoverDialog', 'keyCreationWizardPage') as Page;
                this.keyCreationNavContainer?.to(this.keyCreationWizardPage);
                break;
            case KeyCreationTypes.HYOK:
                if (this.subtype === HYOKProviders.AWS) {
                    this.HYOKKeyCreationWizard = Fragment.byId('keyCreatePopoverDialog', 'HYOKKeyCreationWizard') as Wizard;
                    this.HYOKKeyCreationNavContainer = Fragment.byId('keyCreatePopoverDialog', 'HYOKKeyCreationNavContainer') as NavContainer;
                    this.HYOKKeyCreationReviewPage = Fragment.byId('keyCreatePopoverDialog', 'HYOKKeyCreationReviewPage') as Page;
                    this.HYOKKeyCreationWizardPage = Fragment.byId('keyCreatePopoverDialog', 'HYOKKeyCreationWizardPage') as Page;
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
        switch (this.type) {
            case KeyCreationTypes.SYSTEM_MANAGED:
                this.keyCreationModel.setData({
                    name: '' as string,
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
                    detailsStepValid: false as boolean,
                    keyRegionStepValid: false as boolean,
                    keyNameValueState: 'None' as string,
                    keyNameValueStateText: '' as string,
                    createKeyEnabled: false as boolean,
                    tags: [] as string[] // is this needed?
                }, true);
                break;
            case KeyCreationTypes.HYOK:
                this.getHYOKAWSCertificates().then((certs: { hyokAWSManagementCerts: AWScertificates[], cryptoRolesCerts: AWScertificates[] }) => {
                    this.keyCreationModel.setData({
                        keyARN: '' as string,
                        keyName: '' as string,
                        hyokManagementRoleStepValid: false as boolean,
                        managementRolesCerts: certs?.hyokAWSManagementCerts,
                        cryptoRolesCerts: certs?.cryptoRolesCerts,
                        availableCryptoCertsSelectionList: certs?.cryptoRolesCerts,
                        hyokAWSManagementCertObj: this.managementDefaultModel,
                        hyokAWSCryptoCertObj: null as hyokAWSCryptoCertInput[] | null,
                        selectedCryptoRolesCertKeys: [] as string[],
                        selectedCryptoCertItems: [] as AWScertificates[],
                        allowAddMoreCryptoCert: true as boolean
                    }, true);
                }).catch((err: unknown) => {
                    showErrorMessage(err as AxiosError, this.parentController.getText('errorFetchingHYOKAWSCertificates'));
                    this.closeKeyCreationWizard();
                    console.error('Error fetching HYOK AWS certificates:', err);
                });
                break;
            case KeyCreationTypes.BYOK:
                // For BYOK, we can add similar logic when needed
                break;
        }
    }

    public onKeyCreateNameChanged(): void {
        const keyName = this.keyCreationModel.getProperty('/name') as string;
        if (!keyName || keyName.length < 2) {
            this.keyCreationModel.setProperty('/keyNameValueState', 'Error');
            this.keyCreationModel.setProperty('/keyNameValueStateText', this.parentController.getText('keyNameRequired'));
            this.keyCreationModel.setProperty('/detailsStepValid', false);
        }
        else {
            this.keyCreationModel.setProperty('/keyNameValueState', 'None');
            this.keyCreationModel.setProperty('/keyNameValueStateText', '');
            this.keyCreationModel.setProperty('/detailsStepValid', true);
        }
    }

    public onKeyCreateRegionChanged(): void {
        const region = this.keyCreationModel.getProperty('/region') as string;
        if (region === '') {
            this.keyCreationModel.setProperty('/keyRegionStepValid', false);
        }
        else {
            const regionList = this.keyCreationModel.getProperty('/regionList') as { key: string, text: string, provider: string }[];
            const selectedRegion = regionList.find(item => item.key === region);
            this.keyCreationModel.setProperty('/provider', selectedRegion?.provider);
            this.keyCreationModel.setProperty('/keyRegionStepValid', true);
        }
    }

    public onKeyCreationWizardComplete(): void {
        const detailsStepValid = this.keyCreationModel.getProperty('/detailsStepValid') as boolean;
        const keyRegionStepValid = this.keyCreationModel.getProperty('/keyRegionStepValid') as boolean;
        if (detailsStepValid && keyRegionStepValid) {
            this.keyCreationModel.setProperty('/createKeyEnabled', true);
            if (this.keyCreationReviewPage) {
                this.keyCreationNavContainer?.to(this.keyCreationReviewPage);
            }
        }
        else {
            this.keyCreationModel.setProperty('/createKeyEnabled', false);
        }
    }

    public onKeyCreationWizardCancelPress(): void {
        MessageBox.warning(this.parentController.getText('confirmCancelKeyCreation'), {
            styleClass: 'sapUiSizeCompact',
            emphasizedAction: MessageBox.Action.NO,
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    this.closeKeyCreationWizard();
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
        };
        this.keyCreationNavContainer?.attachAfterNavigate(fnAfterNavigate);
        const keyCreationWizardPageId = this.keyCreationWizardPage?.getId();
        if (keyCreationWizardPageId) {
            this.keyCreationNavContainer?.backToPage(keyCreationWizardPageId);
        }

        this.HYOKKeyCreationNavContainer?.attachAfterNavigate(fnAfterNavigate);
        const hyokKeyCreationWizardPageId = this.HYOKKeyCreationWizardPage?.getId();
        if (hyokKeyCreationWizardPageId) {
            this.HYOKKeyCreationNavContainer?.backToPage(hyokKeyCreationWizardPageId);
        }
    }

    public async onKeyCreationWizardSubmitPress(): Promise<void> {
        let payload: MangedKeyPayload | HyokKeyPayload = {} as (MangedKeyPayload | HyokKeyPayload);
        this.keyCreatePopover?.setBusy(false);
        switch (this.type) {
            case KeyCreationTypes.SYSTEM_MANAGED:
                payload = this.getManagedKeyCreationPayload();
                break;
            case KeyCreationTypes.HYOK:
                payload = this.getHYOKAWSKeyCreationPayload();
                break;
            case KeyCreationTypes.BYOK:
                // For BYOK, we can add similar logic when needed
                break;
        }

        try {
            await this.onKeyCreateCallBackfnc(payload);
            this.keyCreatePopover?.close();
            this.keyCreatePopover?.destroy();
            this.keyCreatePopover = undefined;
            this.resetKeyCreationModel();
        }
        catch (error) {
            showErrorMessage(error as AxiosError, this.parentController.getText('errorAddingKey'));
            console.error('Error creating key', error);
        }
        finally {
            this.keyCreatePopover?.setBusy(false);
        }
    }

    public getManagedKeyCreationPayload(): MangedKeyPayload {
        const payload = {
            name: this.keyCreationModel.getProperty('/name') as string,
            keyConfigurationID: this.keyConfigId,
            type: this.type,
            description: this.keyCreationModel.getProperty('/description') as string,
            algorithm: this.keyCreationModel.getProperty('/algorithm') as string,
            region: this.keyCreationModel.getProperty('/region') as string,
            provider: this.keyCreationModel.getProperty('/provider') as string,
            enabled: this.keyCreationModel.getProperty('/enabled') as boolean
        };
        return payload;
    }

    public getHYOKAWSKeyCreationPayload(): HyokKeyPayload {
        let payload = {} as HyokKeyPayload;
        payload = {
            name: this.keyCreationModel.getProperty('/keyName') as string,
            nativeId: this.keyCreationModel.getProperty('/keyARN') as string,
            type: this.type,
            keyConfigurationID: this.keyConfigId,
            provider: this.subtype,
            accessDetails: {
                management: {
                    roleArn: this.keyCreationModel.getProperty('/hyokAWSManagementCertObj/roleARN') as string,
                    trustAnchorArn: this.keyCreationModel.getProperty('/hyokAWSManagementCertObj/trustAnchorARN') as string,
                    profileArn: this.keyCreationModel.getProperty('/hyokAWSManagementCertObj/rootCA') as string
                },
                crypto: this.getCryptoPayload()

            }

        };
        return payload;
    }

    public finishAndReviewHYOKKeyCreation(): void {
        if (this.HYOKKeyCreationNavContainer && this.HYOKKeyCreationReviewPage) {
            this.HYOKKeyCreationNavContainer.to(this.HYOKKeyCreationReviewPage);
        }
        this.keyCreationModel.setProperty('/reviewMode', true);
    }

    // this is not the ideal way to add the ARNs to the crypto certs
    // this should be refactored later when crypto certs grouping is supported
    // this is only for AWS HYOK
    public addARNs(): void {
        this.HYOKKeyCreationWizard?.setBusy(true);
        let hyokAWSCryptoCertObj = this.keyCreationModel.getProperty('/hyokAWSCryptoCertObj') as hyokAWSCryptoCertInput[] || [];
        const selectedCryptoRolesCertKeys = this.keyCreationModel.getProperty('/selectedCryptoRolesCertKeys') as string[];

        // EDGE CASE: if no certs are selected (can happen if the user clcks outside the scope of the listed items), return
        if (selectedCryptoRolesCertKeys.length === 0) {
            this.HYOKKeyCreationWizard?.setBusy(false);
            return;
        }

        const allCryptoCerts = this.keyCreationModel.getProperty('/cryptoRolesCerts') as AWScertificates[];
        const selectedCryptoCerts = allCryptoCerts.filter((cert: AWScertificates) => selectedCryptoRolesCertKeys.includes(cert.name));

        hyokAWSCryptoCertObj = [...hyokAWSCryptoCertObj, { ...this.cryptoDefaultModel, selectedCryptoRolesCertKeys, selectedCryptoCerts }];
        this.keyCreationModel.setProperty('/hyokAWSCryptoCertObj', hyokAWSCryptoCertObj);
        let availableCryptoCertsSelectionList = this.keyCreationModel.getProperty('/availableCryptoCertsSelectionList') as AWScertificates[];
        availableCryptoCertsSelectionList = availableCryptoCertsSelectionList.filter(cert => !selectedCryptoRolesCertKeys.includes(cert.name));

        this.keyCreationModel.setProperty('/availableCryptoCertsSelectionList', availableCryptoCertsSelectionList);
        // clear the selectedCryptoRolesCertKeys
        this.keyCreationModel.setProperty('/selectedCryptoRolesCertKeys', []);
        // diable the add more crypto certs button if all crypto certs are selected
        const allCryptoCertsSelected = availableCryptoCertsSelectionList.length === 0;
        this.keyCreationModel.setProperty('/allowAddMoreCryptoCert', !allCryptoCertsSelected);
        this.HYOKKeyCreationWizard?.setBusy(false);
    }

    public setManagementCertStepValidation(): void {
        const hyokAWSManagementCertObj = this.keyCreationModel.getProperty('/hyokAWSManagementCertObj') as hyokAWSManagementCertInput;
        const managementRolesComplete
            = (hyokAWSManagementCertObj?.trustAnchorARN ?? '').length > 0
              && (hyokAWSManagementCertObj?.roleARN ?? '').length > 0
              && (hyokAWSManagementCertObj?.rootCA ?? '').length > 0;
        this.keyCreationModel.setProperty('/hyokManagementRoleStepValid', managementRolesComplete);
    }

    private async getHYOKAWSCertificates(): Promise<{ hyokAWSManagementCerts: AWScertificates[], cryptoRolesCerts: AWScertificates[] }> {
        const hyokAWScertificates = await this.api.get<HYOKAWScertificates>(`keyConfigurations/${this.keyConfigId}/certificates`);
        const certs = {
            hyokAWSManagementCerts: hyokAWScertificates?.tenantDefault?.value,
            cryptoRolesCerts: hyokAWScertificates?.crypto?.value
        };
        return certs;
    }

    private closeKeyCreationWizard(): void {
        this.keyCreatePopover?.close();
        this.keyCreatePopover?.destroy();
        this.keyCreatePopover = undefined;
    }

    private getCryptoPayload(): Record<string, AWSAccessDetails> {
        let cryptoPayload = {};
        const hyokAWSCryptoCertObj = this.keyCreationModel.getProperty('/hyokAWSCryptoCertObj') as hyokAWSCryptoCertInput[];

        if (!hyokAWSCryptoCertObj || hyokAWSCryptoCertObj?.length === 0) {
            return cryptoPayload;
        }
        hyokAWSCryptoCertObj?.forEach((cryptoCert: hyokAWSCryptoCertInput) => {
            if (cryptoCert.roleCryptoARN === null || cryptoCert.trustAnchorCryptoARN === null || cryptoCert.rootCryptoCA === null || cryptoCert?.selectedCryptoRolesCertKeys?.length === 0) {
                return;
            }
            (cryptoCert?.selectedCryptoRolesCertKeys ?? []).forEach((certKey: string) => {
                cryptoPayload = {
                    ...cryptoPayload, [certKey]: { roleArn: cryptoCert.roleCryptoARN, trustAnchorArn: cryptoCert.trustAnchorCryptoARN, profileArn: cryptoCert.rootCryptoCA }
                };
            });
        });
        return cryptoPayload;
    }
}
