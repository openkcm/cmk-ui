import { BYOKProviders, CloudProviders, HYOKProviders, KeyCreationTypes } from 'kms/common/Enums';
import { MangedKeyPayload } from 'kms/common/Types';
import { showErrorMessage } from 'kms/common/Helpers';
import { AxiosError } from 'axios';
import BaseController from 'kms/controller/BaseController';
import KeyConfigDetail from 'kms/controller/keyConfigs/detail/Detail.controller';
import Dialog from 'sap/m/Dialog';
import MessageBox from 'sap/m/MessageBox';
import NavContainer from 'sap/m/NavContainer';
import Page from 'sap/m/Page';
import Wizard from 'sap/m/Wizard';
import Fragment from 'sap/ui/core/Fragment';
import JSONModel from 'sap/ui/model/json/JSONModel';

interface KeyCreationParams {
    keyConfigId: string
    keyType: KeyCreationTypes
    keySubtype: BYOKProviders | HYOKProviders
}
type KeyCreateCallBackFn = (payload: MangedKeyPayload) => Promise<void>;

/**
 * @namespace kms
 */
export default class KeyCreation extends BaseController {
    private readonly keyCreationModel = new JSONModel({});
    private keyCreatePopover: Dialog | undefined;
    private keyCreationNavContainer: NavContainer | undefined;
    private keyCreationWizard: Wizard | undefined;
    private keyCreationWizardPage: Page | undefined;
    private keyCreationReviewPage: Page | undefined;
    private parentController: KeyConfigDetail;
    private type: KeyCreationTypes;
    private keyConfigId: string;
    private onKeyCreateCallBackfnc: KeyCreateCallBackFn;

    public openKeyCreationWizard(keyCreationParams: KeyCreationParams, parentController: KeyConfigDetail, onKeyCreateCallBackfnc: KeyCreateCallBackFn): void {
        this.type = keyCreationParams.keyType;
        this.keyConfigId = keyCreationParams.keyConfigId;
        this.onKeyCreateCallBackfnc = onKeyCreateCallBackfnc;
        this.parentController = parentController;
        this.setKeyCreationWizard();
    }

    private setKeyCreationWizard(): void {
        const wizardView = 'kms.resources.fragments.common.KeyCreationWizard';
        const loadFragment = async (): Promise<void> => {
            this.keyCreatePopover = await Fragment.load({
                // DO NOT change this id else Fragment.byId("keyCreatePopoverDialog",.... would stop working.
                // Also DO NOT assign an id to the fragment view in the XML file.
                id: 'keyCreatePopoverDialog',
                name: wizardView,
                controller: this
            }) as Dialog;

            this.keyCreatePopover.addStyleClass('sapUiSizeCompact');
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
        this.keyCreationWizard = Fragment.byId('keyCreatePopoverDialog', 'keyCreationWizard') as Wizard;
        this.keyCreationNavContainer = Fragment.byId('keyCreatePopoverDialog', 'keyCreationNavContainer') as NavContainer;
        this.keyCreationReviewPage = Fragment.byId('keyCreatePopoverDialog', 'keyCreationReviewPage') as Page;
        this.keyCreationWizardPage = Fragment.byId('keyCreatePopoverDialog', 'keyCreationWizardPage') as Page;
        this.keyCreationNavContainer?.to(this.keyCreationWizardPage);
    }

    private resetKeyCreationModel() {
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
            createKeyEnabled: false as boolean
        }, true);
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
        this.keyCreationModel.setProperty('/keyRegionStepValid', region.length > 0);
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
        };
        this.keyCreationNavContainer?.attachAfterNavigate(fnAfterNavigate);
        const keyCreationWizardPageId = this.keyCreationWizardPage?.getId();
        if (keyCreationWizardPageId) {
            this.keyCreationNavContainer?.backToPage(keyCreationWizardPageId);
        }
    }

    public async onKeyCreationWizardSubmitPress(): Promise<void> {
        let payload: MangedKeyPayload = {} as (MangedKeyPayload);
        this.keyCreatePopover?.setBusy(false);
        payload = this.getManagedKeyCreationPayload();

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
            enabled: this.keyCreationModel.getProperty('/enabled') as boolean
        };
        return payload;
    }

    private closeKeyCreationWizard(): void {
        this.keyCreatePopover?.close();
        this.keyCreatePopover?.destroy();
        this.keyCreatePopover = undefined;
    }
}
