import { BYOKProviders, HYOKProviders, KeyCreationTypes } from 'kms/common/Enums';
import {
    MangedKeyPayload,
    HyokKeyPayload,
    hyokCertificates,
    hyokCryptoCertInput,
    hyokAWSManagementCertInput,
    AWSAccessDetails, FortanixAccessDetails
} from 'kms/common/Types';
import { getErrorContext, getErrorDataMessage, showErrorMessage } from 'kms/common/Helpers';
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
        value: hyokCertificates[]
    }
    crypto: {
        count: number
        value: hyokCertificates[]
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
    private cryptoDefaultModel: hyokCryptoCertInput = { trustAnchorCryptoARN: null, roleCryptoARN: null, rootCryptoCA: null, cryptoApplicationId: null, selectedCryptoRolesCertKeys: [], selectedCryptoCerts: [] };

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
        let wizardView: string;
        if (this.subtype === HYOKProviders.AWS) {
            wizardView = 'kms.resources.fragments.common.AWSKeyCreationWizard';
        }
        else if (this.subtype === HYOKProviders.FORTANIX) {
            wizardView = 'kms.resources.fragments.common.FortanixKeyCreationWizard';
        }
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
        this.getHYOKAWSCertificates().then((certs: { hyokAWSManagementCerts: hyokCertificates[], cryptoRolesCerts: hyokCertificates[] }) => {
            this.keyCreationModel.setData({
                keyName: '' as string,
                nativeId: '' as string,
                host: '' as string,
                applicationId: '' as string,
                keySubType: this.subtype as string,
                hyokManagementRoleStepValid: false as boolean,
                managementRolesCerts: certs?.hyokAWSManagementCerts,
                cryptoRolesCerts: certs?.cryptoRolesCerts,
                availableCryptoCertsSelectionList: certs?.cryptoRolesCerts,
                hyokAWSManagementCertObj: this.managementDefaultModel,
                hyokCryptoCertObj: null as hyokCryptoCertInput[] | null,
                selectedCryptoRolesCertKeys: [] as string[],
                selectedCryptoCertItems: [] as hyokCertificates[],
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
        this.keyCreatePopover?.setBusy(true);

        try {
            await this.onKeyCreateCallBackfnc(this.getKeyCreationPayload());
            this.keyCreatePopover?.close();
            this.keyCreatePopover?.destroy();
            this.keyCreatePopover = undefined;
            this.resetModel();
        }
        catch (error) {
            this._handleHYOKKeyRegistrationError(error as AxiosError);
            console.error('Error creating key', error);
        }
        finally {
            this.keyCreatePopover?.setBusy(false);
        }
    }

    public getKeyCreationPayload(): HyokKeyPayload {
        let management = {} as AWSAccessDetails | FortanixAccessDetails;
        if (this.subtype === HYOKProviders.AWS) {
            management = {
                roleArn: this.keyCreationModel.getProperty('/hyokAWSManagementCertObj/roleARN') as string,
                trustAnchorArn: this.keyCreationModel.getProperty('/hyokAWSManagementCertObj/trustAnchorARN') as string,
                profileArn: this.keyCreationModel.getProperty('/hyokAWSManagementCertObj/rootCA') as string
            } as AWSAccessDetails;
        }
        else if (this.subtype === HYOKProviders.FORTANIX) {
            management = {
                host: this.keyCreationModel.getProperty('/host') as string,
                applicationId: this.keyCreationModel.getProperty('/applicationId') as string
            } as FortanixAccessDetails;
        }
        return {
            name: this.keyCreationModel.getProperty('/keyName') as string,
            nativeId: this.keyCreationModel.getProperty('/nativeId') as string,
            description: this.keyCreationModel.getProperty('/description') as string,
            type: this.type,
            keyConfigurationID: this.keyConfigId,
            provider: this.subtype,
            accessDetails: {
                management: management,
                crypto: this.getCryptoPayload()
            }
        };
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
        let hyokCryptoCertObj = this.keyCreationModel.getProperty('/hyokCryptoCertObj') as hyokCryptoCertInput[] || [];
        const selectedCryptoRolesCertKeys = this.keyCreationModel.getProperty('/selectedCryptoRolesCertKeys') as string[];

        // EDGE CASE: if no certs are selected (can happen if the user clicks outside the scope of the listed items), return
        if (selectedCryptoRolesCertKeys.length === 0) {
            this.keyCreatePopover?.setBusy(false);
            return;
        }

        const allCryptoCerts = this.keyCreationModel.getProperty('/cryptoRolesCerts') as hyokCertificates[];
        const selectedCryptoCerts = allCryptoCerts.filter((cert: hyokCertificates) => selectedCryptoRolesCertKeys.includes(cert.name));

        hyokCryptoCertObj = [...hyokCryptoCertObj, { ...this.cryptoDefaultModel, selectedCryptoRolesCertKeys, selectedCryptoCerts }];
        this.keyCreationModel.setProperty('/hyokCryptoCertObj', hyokCryptoCertObj);
        let availableCryptoCertsSelectionList = this.keyCreationModel.getProperty('/availableCryptoCertsSelectionList') as hyokCertificates[];
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

        // Remove item at 'index' from 'hyokCryptoCertObj'
        const hyokCryptoCertObj = this.keyCreationModel.getProperty('/hyokCryptoCertObj') as hyokCryptoCertInput[];
        const removedCerts = hyokCryptoCertObj[index].selectedCryptoCerts as hyokCertificates[] | [];
        const newArray = hyokCryptoCertObj.filter((_, i) => i !== index);
        this.keyCreationModel.setProperty('/hyokCryptoCertObj', newArray);

        // Add certs back to availableCryptoCertsSelectionList
        let availableCryptoCertsSelectionList = this.keyCreationModel.getProperty('/availableCryptoCertsSelectionList') as hyokCertificates[] || [];
        availableCryptoCertsSelectionList = [...availableCryptoCertsSelectionList, ...removedCerts];
        this.keyCreationModel.setProperty('/availableCryptoCertsSelectionList', availableCryptoCertsSelectionList);
        if (availableCryptoCertsSelectionList.length > 0) {
            this.keyCreationModel.setProperty('/allowAddMoreCryptoCert', true);
        }
    }

    private async getHYOKAWSCertificates(): Promise<{ hyokAWSManagementCerts: hyokCertificates[], cryptoRolesCerts: hyokCertificates[] }> {
        const hyokAWScertificates = await this.api.get<HYOKAWScertificates>(`keyConfigurations/${this.keyConfigId}/certificates`);
        return {
            hyokAWSManagementCerts: hyokAWScertificates?.tenantDefault?.value ?? [],
            cryptoRolesCerts: hyokAWScertificates?.crypto?.value ?? []
        };
    }

    private closeKeyCreationWizard(): void {
        this.keyCreatePopover?.close();
        this.keyCreatePopover?.destroy();
        this.keyCreatePopover = undefined;
    }

    private getCryptoPayload(): Record<string, AWSAccessDetails | FortanixAccessDetails> {
        let cryptoPayload = {};
        const hyokCryptoCertObj = this.keyCreationModel.getProperty('/hyokCryptoCertObj') as hyokCryptoCertInput[];

        if (!hyokCryptoCertObj || hyokCryptoCertObj?.length === 0) {
            return cryptoPayload;
        }
        hyokCryptoCertObj?.forEach((cryptoCert: hyokCryptoCertInput) => {
            if (this.subtype === HYOKProviders.AWS && (cryptoCert.roleCryptoARN === null || cryptoCert.trustAnchorCryptoARN === null || cryptoCert.rootCryptoCA === null || cryptoCert?.selectedCryptoRolesCertKeys?.length === 0)) {
                return;
            }
            else if (this.subtype === HYOKProviders.FORTANIX && (cryptoCert.cryptoApplicationId === null || cryptoCert?.selectedCryptoRolesCertKeys?.length === 0)) {
                return;
            }
            (cryptoCert?.selectedCryptoRolesCertKeys ?? []).forEach((certKey: string) => {
                if (this.subtype === HYOKProviders.AWS) {
                    cryptoPayload = {
                        ...cryptoPayload, [certKey]: { roleArn: cryptoCert.roleCryptoARN, trustAnchorArn: cryptoCert.trustAnchorCryptoARN, profileArn: cryptoCert.rootCryptoCA }
                    };
                }
                else if (this.subtype === HYOKProviders.FORTANIX) {
                    cryptoPayload = {
                        ...cryptoPayload, [certKey]: { applicationId: cryptoCert.cryptoApplicationId }
                    };
                }
            });
        });
        return cryptoPayload;
    }

    private _handleHYOKKeyRegistrationError(error: AxiosError): void {
        const errorContext = getErrorContext(error);
        const errorMessage = getErrorDataMessage(error);
        if (errorContext?.reason || errorMessage) {
            const errorContextCode = errorContext?.reason ? ` (Error code: ${errorContext?.reason})` : '';
            const detailedErrorMessage = errorMessage ? ` ${errorMessage}` : '';
            showErrorMessage(error, this.parentController.getText('errorHYOKKeyRegistrationAuthenticationFailed', [detailedErrorMessage + errorContextCode]));
        }
        else {
            showErrorMessage(error, this.parentController.getText('errorAddingKey'));
        }
    }
}
