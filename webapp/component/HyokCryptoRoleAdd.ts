import { AWScertificates, AWSAccessDetails } from 'kms/common/Types';
import { showErrorMessage } from 'kms/common/Helpers';
import { AxiosError } from 'axios';
import BaseController from 'kms/controller/BaseController';
import DetailPanel from 'kms/controller/keyConfigs/detail/DetailPanel.controller';
import Api from 'kms/services/Api.service';
import Dialog from 'sap/m/Dialog';
import MessageBox from 'sap/m/MessageBox';
import Fragment from 'sap/ui/core/Fragment';
import JSONModel from 'sap/ui/model/json/JSONModel';
import { Button$PressEvent } from 'sap/m/Button';

interface AddCryptoCertsParams {
    keyId: string
    keyConfigId: string
    existingCrypto: Record<string, AWSAccessDetails> | undefined
}

type OnSaveCallbackFn = () => Promise<void>;

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

interface CommittedCertEntry {
    selectedCertName: string
    trustAnchorCryptoARN: string
    roleCryptoARN: string
    rootCryptoCA: string
}

export default class HyokCryptoRoleAdd extends BaseController {
    private readonly addCryptoModel = new JSONModel({
        allCryptoCerts: [] as AWScertificates[],
        availableCryptoCertsSelectionList: [] as AWScertificates[],
        newCryptoCertGroups: [] as CommittedCertEntry[],
        allowAddMoreCryptoCert: false,
        hasCommittedCerts: false,
        showAllCertsAssignedMessage: false,
        certSelected: false,
        currentSelectedCertKey: '',
        currentCert: null as AWScertificates | null,
        currentTrustAnchorARN: '',
        currentRoleARN: '',
        currentProfileARN: ''
    });

    private api: Api;
    private dialog: Dialog | undefined;
    private parentController: DetailPanel;
    private keyId: string;
    private keyConfigId: string;
    private existingCrypto: Record<string, AWSAccessDetails> | undefined;
    private onSaveCallback: OnSaveCallbackFn;

    public openAddCryptoCertsDialog(params: AddCryptoCertsParams, parentController: DetailPanel, api: Api, onSaveCallback: OnSaveCallbackFn): void {
        this.keyId = params.keyId;
        this.keyConfigId = params.keyConfigId;
        this.existingCrypto = params.existingCrypto;
        this.api = api;
        this.parentController = parentController;
        this.onSaveCallback = onSaveCallback;
        this.loadDialog();
    }

    private loadDialog(): void {
        const fragmentName = 'kms.resources.fragments.common.HYOKAddCryptoCertsDialog';
        const loadFragment = async (): Promise<void> => {
            this.dialog = await Fragment.load({
                id: 'addCryptoCertsDialog',
                name: fragmentName,
                controller: this
            }) as Dialog;
            this.parentController?.getView()?.addDependent(this.dialog);
            this.dialog.addStyleClass('sapUiSizeCompact');
            this.dialog.setModel(this.addCryptoModel, 'addCryptoModel');
            this.dialog.open();
            this.resetModel();
        };

        if (!this.dialog) {
            loadFragment().catch((err: unknown) => {
                console.error('Error loading add crypto certs dialog fragment:', err);
                showErrorMessage(err as AxiosError, this.parentController.getText('errorLoadingAddCryptoCertsDialog'));
                this.dialog?.destroy();
                this.dialog = undefined;
            });
        }
        else {
            this.dialog?.destroy();
            loadFragment().catch((err: unknown) => {
                console.error('Error loading add crypto certs dialog fragment:', err);
                showErrorMessage(err as AxiosError, this.parentController.getText('errorLoadingAddCryptoCertsDialog'));
                this.dialog?.destroy();
                this.dialog = undefined;
            });
        }
    }

    private resetModel(): void {
        this.dialog?.setBusy(true);
        this.fetchAvailableCryptoCerts().then((allCryptoCerts: AWScertificates[]) => {
            const existingCryptoKeys = Object.keys(this.existingCrypto || {});
            const availableCerts = allCryptoCerts.filter(cert => !existingCryptoKeys.includes(cert.name));

            this.addCryptoModel.setData({
                allCryptoCerts: allCryptoCerts,
                availableCryptoCertsSelectionList: availableCerts,
                newCryptoCertGroups: [],
                allowAddMoreCryptoCert: availableCerts.length > 0,
                hasCommittedCerts: false,
                showAllCertsAssignedMessage: false,
                certSelected: false,
                currentSelectedCertKey: '',
                currentCert: null,
                currentTrustAnchorARN: '',
                currentRoleARN: '',
                currentProfileARN: ''
            });
        }).catch((err: unknown) => {
            showErrorMessage(err as AxiosError, this.parentController.getText('errorFetchingHYOKCertificates'));
            this.closeDialog();
            console.error('Error fetching HYOK AWS certificates:', err);
        }).finally(() => {
            this.dialog?.setBusy(false);
        });
    }

    private async fetchAvailableCryptoCerts(): Promise<AWScertificates[]> {
        const hyokAWScertificates = await this.api.get<HYOKAWScertificates>(`keyConfigurations/${this.keyConfigId}/certificates`);
        return hyokAWScertificates?.crypto?.value ?? [];
    }

    public onAddCryptoCertsDialogCancelPress(): void {
        MessageBox.warning(this.parentController.getText('confirmCancelAddCryptoCerts'), {
            styleClass: 'sapUiSizeCompact',
            emphasizedAction: MessageBox.Action.NO,
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    this.closeDialog();
                }
            }
        });
    }

    /**
     * Called when user selects a certificate from the Select dropdown.
     * Transitions to Step 2: shows cert details + ARN input fields.
     */
    public onCryptoCertSelected(): void {
        const selectedKey = this.addCryptoModel.getProperty('/currentSelectedCertKey') as string;
        if (!selectedKey) {
            return;
        }
        const allCryptoCerts = this.addCryptoModel.getProperty('/allCryptoCerts') as AWScertificates[];
        const selectedCert = allCryptoCerts.find(cert => cert.name === selectedKey);

        if (!selectedCert) {
            return;
        }

        this.addCryptoModel.setProperty('/currentCert', selectedCert);
        this.addCryptoModel.setProperty('/certSelected', true);
        this.addCryptoModel.setProperty('/currentTrustAnchorARN', '');
        this.addCryptoModel.setProperty('/currentRoleARN', '');
        this.addCryptoModel.setProperty('/currentProfileARN', '');
    }

    /**
     * Called when user clicks "Add" to commit the current cert + ARNs.
     * Adds the entry to newCryptoCertGroups, removes cert from available list,
     * and resets to Step 1 for the next cert.
     */
    public onCommitCurrentCert(): void {
        const currentCert = this.addCryptoModel.getProperty('/currentCert') as AWScertificates;
        const trustAnchorARN = this.addCryptoModel.getProperty('/currentTrustAnchorARN') as string;
        const roleARN = this.addCryptoModel.getProperty('/currentRoleARN') as string;
        const profileARN = this.addCryptoModel.getProperty('/currentProfileARN') as string;

        if (!currentCert) {
            return;
        }

        const newEntry: CommittedCertEntry = {
            selectedCertName: currentCert.name,
            trustAnchorCryptoARN: trustAnchorARN,
            roleCryptoARN: roleARN,
            rootCryptoCA: profileARN
        };

        // Add to committed list
        const newCryptoCertGroups = this.addCryptoModel.getProperty('/newCryptoCertGroups') as CommittedCertEntry[];
        this.addCryptoModel.setProperty('/newCryptoCertGroups', [...newCryptoCertGroups, newEntry]);

        // Remove from available list
        let availableList = this.addCryptoModel.getProperty('/availableCryptoCertsSelectionList') as AWScertificates[];
        availableList = availableList.filter(cert => cert.name !== currentCert.name);
        this.addCryptoModel.setProperty('/availableCryptoCertsSelectionList', availableList);
        this.addCryptoModel.setProperty('/allowAddMoreCryptoCert', availableList.length > 0);

        // Update computed flags and reset current selection state back to Step 1
        this.updateComputedFlags();
        this.resetCurrentSelection();
    }

    /**
     * Called when user clicks "Cancel" on the current cert ARN entry.
     * Goes back to Step 1 without adding the cert.
     */
    public onCancelCurrentCertSelection(): void {
        this.resetCurrentSelection();
    }

    /**
     * Removes a committed cert entry and returns the cert to the available list.
     */
    public onRemoveNewCryptoCertGroup(event: Button$PressEvent): void {
        const path = event.getSource().getBindingContext('addCryptoModel')?.getPath();
        if (!path) {
            console.error('Error removing crypto cert group: Invalid binding context path');
            showErrorMessage(new AxiosError('Invalid binding context path'), this.parentController.getText('errorGeneric'));
            return;
        }
        const segments = path.split('/');
        const lastSegment = segments[segments.length - 1];
        const index = parseInt(lastSegment, 10);

        const newCryptoCertGroups = this.addCryptoModel.getProperty('/newCryptoCertGroups') as CommittedCertEntry[];
        const removedEntry = newCryptoCertGroups[index];
        const newArray = newCryptoCertGroups.filter((_, i) => i !== index);
        this.addCryptoModel.setProperty('/newCryptoCertGroups', newArray);

        // Return removed cert to available list
        if (removedEntry) {
            const allCryptoCerts = this.addCryptoModel.getProperty('/allCryptoCerts') as AWScertificates[];
            const removedCert = allCryptoCerts.find(cert => cert.name === removedEntry.selectedCertName);
            if (removedCert) {
                const availableList = this.addCryptoModel.getProperty('/availableCryptoCertsSelectionList') as AWScertificates[];
                this.addCryptoModel.setProperty('/availableCryptoCertsSelectionList', [...availableList, removedCert]);
                this.addCryptoModel.setProperty('/allowAddMoreCryptoCert', true);
            }
        }
        this.updateComputedFlags();
    }

    public async onAddCryptoCertsSubmitPress(): Promise<void> {
        this.dialog?.setBusy(true);
        try {
            const newCryptoPayload = this.buildCryptoPayload();
            const payload = {
                accessDetails: {
                    crypto: newCryptoPayload
                }
            };
            await this.api.patch(`keys/${this.keyId}`, payload);
            await this.onSaveCallback();
            this.closeDialog();
        }
        catch (error) {
            console.error('Error adding crypto certs', error);
            showErrorMessage(error as AxiosError, this.parentController.getText('errorSavingKeyDetails'));
        }
        finally {
            this.dialog?.setBusy(false);
        }
    }

    private buildCryptoPayload(): Record<string, AWSAccessDetails> {
        const cryptoPayload: Record<string, AWSAccessDetails> = { ...this.existingCrypto };
        const newCryptoCertGroups = this.addCryptoModel.getProperty('/newCryptoCertGroups') as CommittedCertEntry[];

        if (!newCryptoCertGroups || newCryptoCertGroups.length === 0) {
            return cryptoPayload;
        }

        newCryptoCertGroups.forEach((entry: CommittedCertEntry) => {
            cryptoPayload[entry.selectedCertName] = {
                roleArn: entry.roleCryptoARN,
                trustAnchorArn: entry.trustAnchorCryptoARN,
                profileArn: entry.rootCryptoCA
            };
        });

        return cryptoPayload;
    }

    private updateComputedFlags(): void {
        const groups = this.addCryptoModel.getProperty('/newCryptoCertGroups') as CommittedCertEntry[];
        const hasCommitted = groups && groups.length > 0;
        const allowMore = this.addCryptoModel.getProperty('/allowAddMoreCryptoCert') as boolean;
        this.addCryptoModel.setProperty('/hasCommittedCerts', hasCommitted);
        this.addCryptoModel.setProperty('/showAllCertsAssignedMessage', !allowMore && hasCommitted);
    }

    private resetCurrentSelection(): void {
        this.addCryptoModel.setProperty('/certSelected', false);
        this.addCryptoModel.setProperty('/currentSelectedCertKey', '');
        this.addCryptoModel.setProperty('/currentCert', null);
        this.addCryptoModel.setProperty('/currentTrustAnchorARN', '');
        this.addCryptoModel.setProperty('/currentRoleARN', '');
        this.addCryptoModel.setProperty('/currentProfileARN', '');
    }

    private closeDialog(): void {
        this.dialog?.close();
        this.dialog?.destroy();
        this.dialog = undefined;
    }
}
