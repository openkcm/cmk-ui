import { BYOKProviders, HYOKProviders, KeyCreationTypes } from 'kms/common/Enums';
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
import { Button$PressEvent } from 'sap/m/Button';

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

export default class HyokKeyRegistration extends BaseController {
    private readonly keyCreationModel = new JSONModel({}); // This model should be initialized with the correct structure based on the key creation wizard requirements (for managed key, HYOK and BYOK)
    private api: Api;
    private keyCreatePopover: Dialog | undefined;
    private HYOKKeyCreationNavContainer: NavContainer | undefined;
    private HYOKKeyCreationWizard: Wizard | undefined;
    private HYOKKeyCreationWizardPage: Page | undefined;
    private HYOKKeyCreationReviewPage: Page | undefined;
    private parentController: KeyConfigDetail;
    private type: KeyCreationTypes;
    private subtype: HYOKProviders | BYOKProviders;
    private keyConfigId: string;
    private onKeyCreateCallBackfnc: KeyCreateCallBackFn;
    private managementDefaultModel: hyokAWSManagementCertInput = { trustAnchorARN: null, roleARN: null, rootCA: null };
    private cryptoDefaultModel: hyokAWSCryptoCertInput = { trustAnchorCryptoARN: null, roleCryptoARN: null, rootCryptoCA: null, selectedCryptoRolesCertKeys: [], selectedCryptoCerts: [] };

    public openHyokKeyCreationWizard(keyCreationParams: KeyCreationParams, parentController: KeyConfigDetail, api: Api, onKeyCreateCallBackfnc: KeyCreateCallBackFn): void {
        this.type = keyCreationParams.keyType;
        this.api = api;
        this.subtype = keyCreationParams.keySubtype;
        this.keyConfigId = keyCreationParams.keyConfigId;
        this.onKeyCreateCallBackfnc = onKeyCreateCallBackfnc;
        this.parentController = parentController;
        this.setHYOKRegistraionWizard();
    }

    private setHYOKRegistraionWizard(): void {
        const wizardView = 'kms.resources.fragments.common.HYOKKeyCreationWizard';
        const loadFragment = async (): Promise<void> => {
            this.keyCreatePopover = await Fragment.load({
                // IMPORTANT: DO NOT change this id (id: 'keyCreatePopoverDialog') or else Fragment.byId("keyCreatePopoverDialog",.... would stop working.
                // Also DO NOT assign an id to the fragment view in the XML file.
                id: 'keyCreatePopoverDialog',
                name: wizardView,
                controller: this
            }) as Dialog;
            this.parentController?.getView()?.addDependent(this.keyCreatePopover);
            this.keyCreatePopover.addStyleClass('sapUiSizeCompact');
            this.keyCreatePopover.setModel(this.keyCreationModel, 'model');
            this.keyCreatePopover.open();
            this.setWizardPageSections();
            this.resetModel();
        };

        if (!this.keyCreatePopover) {
            loadFragment().catch((err: unknown) => {
                console.error('Error loading add HYOK wizard fragment:', err);
                showErrorMessage(err as AxiosError, this.parentController.getText('errorLoadingHyokKeyCreationWizard'));
                this.keyCreatePopover?.destroy();
                this.keyCreatePopover = undefined;
            });
        }
        else {
            this.keyCreatePopover?.destroy();
            loadFragment().catch((err: unknown) => {
                console.error('Error loading add HYOK wizard fragment:', err);
                showErrorMessage(err as AxiosError, this.parentController.getText('errorLoadingHyokKeyCreationWizard'));
                this.keyCreatePopover?.destroy();
                this.keyCreatePopover = undefined;
            });
        }
    }

    private setWizardPageSections(): void {
        this.HYOKKeyCreationWizard = Fragment.byId('keyCreatePopoverDialog', 'HYOKKeyCreationWizard') as Wizard;
        this.HYOKKeyCreationNavContainer = Fragment.byId('keyCreatePopoverDialog', 'HYOKKeyCreationNavContainer') as NavContainer;
        this.HYOKKeyCreationReviewPage = Fragment.byId('keyCreatePopoverDialog', 'HYOKKeyCreationReviewPage') as Page;
        this.HYOKKeyCreationWizardPage = Fragment.byId('keyCreatePopoverDialog', 'HYOKKeyCreationWizardPage') as Page;
        this.HYOKKeyCreationNavContainer?.to(this.HYOKKeyCreationWizardPage);
    }

    private resetModel() {
        this.keyCreatePopover?.setBusy(true);
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
            showErrorMessage(err as AxiosError, this.parentController.getText('errorFetchingHYOKCertificates'));
            this.closeKeyCreationWizard();
            console.error('Error fetching HYOK AWS certificates:', err);
        }).finally(() => {
            this.keyCreatePopover?.setBusy(false);
        });
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
            this.HYOKKeyCreationWizard?.goToStep(this.HYOKKeyCreationWizard?.getSteps()[stepNumber], true);
            this.HYOKKeyCreationNavContainer?.detachAfterNavigate(fnAfterNavigate);
        };

        this.HYOKKeyCreationNavContainer?.attachAfterNavigate(fnAfterNavigate);
        const hyokKeyCreationWizardPageId = this.HYOKKeyCreationWizardPage?.getId();
        if (hyokKeyCreationWizardPageId) {
            this.HYOKKeyCreationNavContainer?.backToPage(hyokKeyCreationWizardPageId);
        }
    }

    public async onKeyCreationWizardSubmitPress(): Promise<void> {
        let payload: HyokKeyPayload = {} as (HyokKeyPayload);
        this.keyCreatePopover?.setBusy(true);
        payload = this.getHYOKAWSKeyCreationPayload();

        try {
            await this.onKeyCreateCallBackfnc(payload);
            this.keyCreatePopover?.close();
            this.keyCreatePopover?.destroy();
            this.keyCreatePopover = undefined;
            this.resetModel();
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
            description: this.keyCreationModel.getProperty('/description') as string,
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
        this.keyCreatePopover?.setBusy(true);
        let hyokAWSCryptoCertObj = this.keyCreationModel.getProperty('/hyokAWSCryptoCertObj') as hyokAWSCryptoCertInput[] || [];
        const selectedCryptoRolesCertKeys = this.keyCreationModel.getProperty('/selectedCryptoRolesCertKeys') as string[];

        // EDGE CASE: if no certs are selected (can happen if the user clicks outside the scope of the listed items), return
        if (selectedCryptoRolesCertKeys.length === 0) {
            this.keyCreatePopover?.setBusy(false);
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
        this.keyCreatePopover?.setBusy(false);
    }

    public setManagementCertStepValidation(): void {
        const hyokAWSManagementCertObj = this.keyCreationModel.getProperty('/hyokAWSManagementCertObj') as hyokAWSManagementCertInput;
        const managementRolesComplete
            = (hyokAWSManagementCertObj?.trustAnchorARN ?? '').length > 0
            && (hyokAWSManagementCertObj?.roleARN ?? '').length > 0
            && (hyokAWSManagementCertObj?.rootCA ?? '').length > 0;
        this.keyCreationModel.setProperty('/hyokManagementRoleStepValid', managementRolesComplete);
    }

    public onRemoveCryptoCert(event: Button$PressEvent): void {
        const path = event.getSource().getBindingContext('model')?.getPath();
        if (!path) {
            console.error('Error removing selected crpyto cert ARNs: Invalid binding context path');
            showErrorMessage(new AxiosError('Invalid binding context path'), this.parentController.getText('errorGeneric'));
            return;
        }
        const segments = path.split('/');
        const lastSegment = segments[segments.length - 1];
        const index = parseInt(lastSegment, 10);

        // Remove item at 'index' from 'hyokAWSCryptoCertObj'
        const hyokAWSCryptoCertObj = this.keyCreationModel.getProperty('/hyokAWSCryptoCertObj') as hyokAWSCryptoCertInput[];
        const removedCerts = hyokAWSCryptoCertObj[index].selectedCryptoCerts as AWScertificates[] | [];
        const newArray = hyokAWSCryptoCertObj.filter((_, i) => i !== index);
        this.keyCreationModel.setProperty('/hyokAWSCryptoCertObj', newArray);

        // Add certs back to availableCryptoCertsSelectionList
        let availableCryptoCertsSelectionList = this.keyCreationModel.getProperty('/availableCryptoCertsSelectionList') as AWScertificates[] || [];
        availableCryptoCertsSelectionList = [...availableCryptoCertsSelectionList, ...removedCerts];
        this.keyCreationModel.setProperty('/availableCryptoCertsSelectionList', availableCryptoCertsSelectionList);
        if (availableCryptoCertsSelectionList.length > 0) {
            this.keyCreationModel.setProperty('/allowAddMoreCryptoCert', true);
        }
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
