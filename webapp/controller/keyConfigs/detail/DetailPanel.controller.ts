import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import Api from 'kms/services/Api.service';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import EventBus from 'sap/ui/core/EventBus';
import {
    AWSAccessDetails,
    FortanixAccessDetails,
    GCPAccessDetails,
    HyokCertificates,
    Key,
    KeyVersion,
    SystemRecoveryActions,
    WorkflowParams
} from 'kms/common/Types';
import { isUUIDValid, copyToClipboard, showErrorMessage } from 'kms/common/Helpers';
import { Button$PressEvent } from 'sap/m/Button';
import * as Formatter from 'kms/common/Formatters';
import MessageToast from 'sap/m/MessageToast';
import Enums, { ActionTypes, ArtifactTypes, EventChannelIds, EventIDs } from 'kms/common/Enums';
import { AxiosError } from 'axios';
import MessageBox from 'sap/m/MessageBox';
import Workflow from 'kms/component/Workflow';
import Dialog from 'sap/m/Dialog';
import Fragment from 'sap/ui/core/Fragment';

interface KeyVersionResponse {
    value: KeyVersion[] | undefined
    count: number | undefined
}

/**
 * @namespace kms
 */
export default class DetailPanel extends BaseController {
    public formatter: typeof Formatter = Formatter;
    private api: Api;
    private readonly oneWayModel = new JSONModel({
        edit: false as boolean,
        cryptoInEditMode: false as boolean,
        selectedKey: {} as Key,
        keyVersions: [] as KeyVersion[]
    });

    private readonly twoWayModel = new JSONModel({
        selectedKey: {} as Key
    });

    private id: string;
    private idType: string | undefined;
    private keyConfigId: string | undefined;
    private eventBus = EventBus.getInstance();
    private workflowComponent: Workflow | undefined;
    private keyProvider: string | undefined;

    public onInit(): void {
        super.onInit();
        this.getRouter()?.getRoute('keyConfigDetailPanel')?.attachPatternMatched({}, (event: Route$PatternMatchedEvent) => {
            this.onKeyConfigDetailPanelRouteMatched(event);
        }, this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.twoWayModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.twoWayModel, 'twoWay');
    };

    public onExit(): void {
        this.addCryptoCertsDialog?.destroy();
        this.addCryptoCertsDialog = undefined;
    }

    public onKeyConfigDetailPanelRouteMatched(event: Route$PatternMatchedEvent): void {
        this.getView()?.setBusy(true);
        const routeArgs = event.getParameter('arguments') as { tenantId: string, keyConfigId?: string, type?: string, id?: string };
        this.idType = routeArgs.type;
        this.id = routeArgs.id || '';
        this.keyConfigId = routeArgs.keyConfigId;
        this.api = Api.getInstance();
        this.tenantId = routeArgs?.tenantId;
        this.oneWayModel.setProperty('/type', this.idType);
        this.oneWayModel.setProperty('/keyConfigDetail', true);
        if (!isUUIDValid(this.id ?? '')) {
            console.error('Key config id or key id invalid');
            this.getRouter().navTo('keyConfigs', {
                tenantId: this.tenantId
            }
            );
            return;
        }
        this.eventBus.publish(EventChannelIds.KEYCONFIG, EventIDs.LOAD_KEY_CONFIG_DETAILS, { keyConfigId: this.keyConfigId, tenantId: this.tenantId });
        if (this.idType === this.Enums.KeyConfigDetailPanelTypes.KEY) {
            this.getKeyDetails().catch((error: unknown) => {
                console.error(error);
            });
        }
        else {
            this.getSystemDetails().catch((error: unknown) => {
                console.error(error);
            });
        }
    };

    private async getKeyDetails(): Promise<void> {
        try {
            const selectedKey = await this.api.get<Key>(`keys/${this.id}`);
            const keyVersions = await this.api.get<KeyVersionResponse>(`keys/${this.id}/versions`);
            if (selectedKey) {
                this.oneWayModel.setProperty('/selectedKey', selectedKey);
                this.twoWayModel.setProperty('/selectedKey', selectedKey);
                this.setKeyDetailsToModel(selectedKey);
                this.oneWayModel.setProperty('/keyVersions', keyVersions?.value);
                this.oneWayModel.setProperty('/keyVersionsCount', keyVersions?.count);
            }
            else {
                console.error('Key not found');
                this.getRouter().navTo('keyConfigDetail', {
                    tenantId: this.tenantId,
                    keyConfigId: this.keyConfigId
                });
            }
        }
        catch (error) {
            console.error('Error fetching key details', error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingKeyDetails'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    private setKeyDetailsToModel(key: Key): void {
        this.twoWayModel.setProperty('/selectedKey/customerHeld', key?.type === this.Enums.KeyCreationTypes.HYOK);
        this.twoWayModel.setProperty('/selectedKey/enabled', key?.state === this.Enums.KeyStates.ENABLED);
        this.keyProvider = key.provider;
        this.twoWayModel.setProperty('/selectedKey/accessDetails/management', key.accessDetails?.management);
        const managementDetails = key?.accessDetails?.management;
        const cryptoDetails = key?.accessDetails?.crypto;
        if (managementDetails) {
            const managementDetailsArray: { key: string, value: AWSAccessDetails | FortanixAccessDetails | GCPAccessDetails }[] = [{ key: 'management', value: managementDetails }];
            this.twoWayModel.setProperty('/selectedKey/accessDetails/managementDetailsArray', managementDetailsArray);
        }
        if (cryptoDetails) {
            const cryptoArray: { key: string, value: AWSAccessDetails | FortanixAccessDetails | GCPAccessDetails }[] = [];
            Object.entries(cryptoDetails).forEach(([key, value]) => {
                cryptoArray.push({ key: key, value: value });
            });
            this.twoWayModel.setProperty('/selectedKey/accessDetails/cryptoARNsArray', cryptoArray);
        }
        this.updateAddCryptoCertButtonState();
    }

    private async getSystemRecoveryActions(systemsID: string): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            const recoveryActions = await this.api.get<SystemRecoveryActions>(`systems/${systemsID}/recoveryActions`);
            this.oneWayModel.setProperty('/selectedSystem/canCancel', recoveryActions?.canCancel);
            this.oneWayModel.setProperty('/selectedSystem/canRetry', recoveryActions?.canRetry);
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorSystemRecoveryActions'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    private async getSystemDetails(): Promise<void> {
        try {
            const selectedSystem = await this.api.get(`systems/${this.id}`);
            if (selectedSystem) {
                this.oneWayModel.setProperty('/selectedSystem', selectedSystem);
                this.getSystemRecoveryActions(this.id).catch((error: unknown) => {
                    console.error(error);
                });
            }
            else {
                console.error('System not found');
                this.getRouter().navTo('systems', {
                    tenantId: this.tenantId
                });
            }
        }
        catch (error) {
            console.error('Error fetching system details', error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingSystemDetails'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    public async onSystemDisconnectPress(): Promise<void> {
        const workflowParams = {
            artifactType: ArtifactTypes.SYSTEM,
            artifactID: this.id,
            actionType: ActionTypes.UNLINK
        } as WorkflowParams;

        this.workflowComponent = new Workflow('workflowComponent');
        this.workflowComponent.init();
        await this.workflowComponent?.checkWorkflowStatus(workflowParams, {
            onWorkflowNotRequired: () => {
                MessageBox.confirm(this.getText('confirmDisconnectSystem'), {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    onClose: async (action: unknown) => {
                        if (action === MessageBox.Action.YES) {
                            await this.disconnectSystem(this.id);
                        }
                    }
                });
            },
            onWorkflowRequired: () => {
                MessageBox.confirm(this.getText('confirmDisconnectSystemWorkflowCreation'), {
                    actions: [this.getText('sendForApproval'), MessageBox.Action.NO],
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    onClose: async (action: unknown) => {
                        if (action === this.getText('sendForApproval')) {
                            await this.workflowComponent?.createWorkflow(workflowParams);
                        }
                    }
                });
            }
        });
    }

    private async disconnectSystem(systemsID: string): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            await this.api.delete(`systems/${systemsID}/link`);
            MessageToast.show(this.getText('systemDisconnectedSuccessfully'));
            await this.getSystemDetails();
            this.eventBus.publish(EventChannelIds.SYSTEMS, EventIDs.LOAD_SYSTEMS);
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorDisconnectingSystem'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    public onSystemCancelPress(): void {
        MessageBox.confirm(this.getText('confirmSystemCancel'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.performSystemRecovery(this.id, 'CANCEL');
                }
            }
        });
    }

    public onSystemRetryPress(): void {
        MessageBox.confirm(this.getText('confirmSystemRetry'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.performSystemRecovery(this.id, 'RETRY');
                }
            }
        });
    }

    private async performSystemRecovery(systemsID: string, action: string): Promise<void> {
        this.getView()?.setBusy(true);
        const payload = {
            action: action
        };
        try {
            await this.api.post(`systems/${systemsID}/recoveryActions`, payload);
            MessageToast.show(this.getText('systemRecoveredSuccessfully'));
            await this.getSystemDetails();
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorRecoveringSystem'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    public onEditDetailsPress(): void {
        this.oneWayModel.setProperty('/edit', true);
    }

    public onCancelEditPress(): void {
        this.oneWayModel.setProperty('/edit', false);
    }

    public onEditHYOKCryptoDetailsPress(): void {
        this.oneWayModel.setProperty('/cryptoInEditMode', true);
    }

    public onCancelHYOKCryptoEdit(): void {
        this.oneWayModel.setProperty('/cryptoInEditMode', false);
    }

    public async onSaveHYOKCryptoDetailsPress(): Promise<void> {
        this.getView()?.setBusy(true);
        this.oneWayModel.setProperty('/cryptoInEditMode', false);
        let cryptoPayload = {};
        const cryptoARNsArray = this.twoWayModel.getProperty('/selectedKey/accessDetails/cryptoARNsArray') as { key: string, value: AWSAccessDetails }[] | undefined;
        cryptoARNsArray?.forEach((cryptoItem) => {
            cryptoPayload = {
                ...cryptoPayload, [cryptoItem.key]: { roleArn: cryptoItem?.value?.roleArn, trustAnchorArn: cryptoItem?.value?.trustAnchorArn, profileArn: cryptoItem?.value?.profileArn }
            };
        });
        const payload = {
            accessDetails: {
                crypto: { ...cryptoPayload }
            }
        };
        try {
            await this.api.patch<Key>(`keys/${this.id}`, payload);
            this.getKeyDetails().catch((error: unknown) => {
                console.error(error);
            });
        }
        catch (error) {
            console.error('Error saving crypto details', error);
            showErrorMessage(error as AxiosError, this.getText('errorSavingKeyDetails'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    public async onRotateNowPress(): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            await this.api.post(`keys/${this.id}/versions`, {});
            MessageToast.show(this.getText('keyRotatedSuccessfully'));
            this.getKeyDetails().catch((error: unknown) => {
                console.error(error);
            });
        }
        catch (error) {
            console.error('Error rotating key', error);
            showErrorMessage(error as AxiosError, this.getText('errorRotatingKey'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    public async onSaveKeyDetailsPress(): Promise<void> {
        this.getView()?.setBusy(true);
        const key = this.twoWayModel.getProperty('/selectedKey') as Key;
        const payload = {
            name: key.name,
            description: key.description,
            enabled: key.enabled
        };
        try {
            await this.api.patch<Key>(`keys/${this.id}`, payload);
            this.oneWayModel.setProperty('/edit', false);
            this.getKeyDetails().catch((error: unknown) => {
                console.error(error);
            });
        }
        catch (error) {
            console.error('Error saving key details', error);
            showErrorMessage(error as AxiosError, this.getText('errorSavingKeyDetails'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    public async onCopyToClipboardPress(event: Button$PressEvent): Promise<void> {
        await copyToClipboard(event);
    }

    public onDetailsClosePress(): void {
        this.getRouter().navTo('keyConfigDetail', {
            tenantId: this.tenantId,
            keyConfigId: this.keyConfigId
        });
    }

    public async onDetailsRefresh(): Promise<void> {
        this.getView()?.setBusy(true);
        if (this.idType === 'key') {
            await this.getKeyDetails();
        }
        else {
            await this.getSystemDetails();
        }
    }

    // ========================
    // Add Crypto Certificates
    // ========================

    private addCryptoCertsDialog: Dialog | undefined;
    private addCryptoCertsModel = new JSONModel({});

    public async onAddCryptoCertPress(): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            const { allCryptoCerts, availableCerts } = await this.getAvailableCryptoCerts();
            const allCertsAssigned = availableCerts.length === 0;

            this.addCryptoCertsModel.setData({
                allCertsAssigned: allCertsAssigned,
                availableCerts: availableCerts,
                allCryptoCerts: allCryptoCerts,
                newCryptoCertEntries: [] as { selectedCertKeys: string[], selectedCerts: HyokCertificates[], trustAnchorArn: string, roleArn: string, profileArn: string, applicationId: string }[],
                selectedCertKeys: [] as string[],
                canAddMore: !allCertsAssigned,
                saveEnabled: false,
                provider: this.keyProvider
            });

            await this.openAddCryptoCertsDialog();
        }
        catch (error) {
            console.error('Error loading add crypto certs dialog', error);
            showErrorMessage(error as AxiosError, this.getText('errorLoadingAddCryptoCertsDialog'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    private async openAddCryptoCertsDialog(): Promise<void> {
        if (this.addCryptoCertsDialog) {
            this.addCryptoCertsDialog.destroy();
            this.addCryptoCertsDialog = undefined;
        }

        this.addCryptoCertsDialog = await Fragment.load({
            id: 'addCryptoCertsDialog',
            name: 'kms.resources.fragments.keys.AddCryptoCertsDialog',
            controller: this
        }) as Dialog;
        this.getView()?.addDependent(this.addCryptoCertsDialog);

        this.addCryptoCertsDialog.setModel(this.addCryptoCertsModel, 'addCryptoCertsModel');
        this.addCryptoCertsDialog.open();
    }

    public onAddCryptoCertSelectionFinish(): void {
        const selectedCertKeys = this.addCryptoCertsModel.getProperty('/selectedCertKeys') as string[];
        if (!selectedCertKeys || selectedCertKeys.length === 0) {
            return;
        }

        const allCryptoCerts = this.addCryptoCertsModel.getProperty('/allCryptoCerts') as HyokCertificates[];
        const selectedCerts = allCryptoCerts.filter((cert: HyokCertificates) => selectedCertKeys.includes(cert.name));

        // Create a new entry with the selected certs
        const newEntry = {
            selectedCertKeys: [...selectedCertKeys],
            selectedCerts: selectedCerts,
            trustAnchorArn: '',
            roleArn: '',
            profileArn: ''
        };

        const entries = this.addCryptoCertsModel.getProperty('/newCryptoCertEntries') as typeof newEntry[];
        entries.push(newEntry);
        this.addCryptoCertsModel.setProperty('/newCryptoCertEntries', entries);

        let availableCerts = this.addCryptoCertsModel.getProperty('/availableCerts') as HyokCertificates[];
        availableCerts = availableCerts.filter(cert => !selectedCertKeys.includes(cert.name));
        this.addCryptoCertsModel.setProperty('/availableCerts', availableCerts);

        this.addCryptoCertsModel.setProperty('/selectedCertKeys', []);
        this.addCryptoCertsModel.setProperty('/canAddMore', availableCerts.length > 0);

        this.validateAddCryptoCertsSaveButton();
    }

    public onDownloadRootCA(event: Button$PressEvent): void {
        const rootCA = event.getSource().getBindingContext('addCryptoCertsModel')?.getProperty('rootCA') as string | undefined;
        if (!rootCA) {
            console.error('No Root CA URL available to download');
            return;
        }
        window.open(rootCA, '_blank', 'noopener,noreferrer');
    }

    public onRemoveNewCryptoCertEntry(event: Button$PressEvent): void {
        const path = event.getSource().getBindingContext('addCryptoCertsModel')?.getPath();
        if (!path) return;

        const segments = path.split('/');
        const index = parseInt(segments[segments.length - 1], 10);

        const entries = this.addCryptoCertsModel.getProperty('/newCryptoCertEntries') as { selectedCertKeys: string[], selectedCerts: HyokCertificates[], trustAnchorArn: string, roleArn: string, profileArn: string }[];
        const removedEntry = entries[index];
        const updatedEntries = entries.filter((_entry, i) => i !== index);
        this.addCryptoCertsModel.setProperty('/newCryptoCertEntries', updatedEntries);

        // Add removed certs back to available list
        let availableCerts = this.addCryptoCertsModel.getProperty('/availableCerts') as HyokCertificates[];
        availableCerts = [...availableCerts, ...removedEntry.selectedCerts];
        this.addCryptoCertsModel.setProperty('/availableCerts', availableCerts);
        this.addCryptoCertsModel.setProperty('/canAddMore', availableCerts.length > 0);

        this.validateAddCryptoCertsSaveButton();
    }

    public onAddCryptoCertLiveChange(): void {
        this.validateAddCryptoCertsSaveButton();
    }

    private validateAddCryptoCertsSaveButton(): void {
        const entries = this.addCryptoCertsModel.getProperty('/newCryptoCertEntries') as {
            selectedCertKeys: string[]
            selectedCerts: HyokCertificates[]
            trustAnchorArn: string
            roleArn: string
            profileArn: string
            applicationId: string
            projectNumber: string
            poolId: string
            providerId: string
            serviceAccount: string
            isEditable: boolean
        }[];

        if (!entries?.length) {
            this.addCryptoCertsModel.setProperty('/saveEnabled', false);
            return;
        }

        let fields: string[] = [];

        switch (this.keyProvider) {
            case Enums.HYOKProviders.AWS:
                fields = ['trustAnchorArn', 'roleArn', 'profileArn'];
                break;

            case Enums.HYOKProviders.FORTANIX:
                fields = ['applicationId'];
                break;

            case Enums.HYOKProviders.GCP:
                fields = ['projectNumber', 'poolId', 'providerId', 'serviceAccount'];
                break;
        }

        const allValid = entries.every(entry =>
            fields.every((field) => {
                const value = entry[field as keyof typeof entry];
                return typeof value === 'string' && value.trim().length > 0;
            })
            && entry.selectedCertKeys.length > 0
        );

        this.addCryptoCertsModel.setProperty('/saveEnabled', allValid);
    }

    public async onSaveAddCryptoCerts(): Promise<void> {
        this.addCryptoCertsDialog?.setBusy(true);
        const entries = this.addCryptoCertsModel.getProperty('/newCryptoCertEntries') as { selectedCertKeys: string[], selectedCerts: HyokCertificates[], trustAnchorArn: string, roleArn: string, profileArn: string, applicationId: string, projectNumber: string, poolId: string, providerId: string, serviceAccount: string }[];

        // Build crypto payload from new entries
        const newCryptoPayload: Record<string, AWSAccessDetails | FortanixAccessDetails | GCPAccessDetails> = {};

        entries.forEach((entry) => {
            let accessDetails: AWSAccessDetails | FortanixAccessDetails | GCPAccessDetails;

            switch (this.keyProvider) {
                case Enums.HYOKProviders.AWS:
                    accessDetails = {
                        roleArn: entry.roleArn,
                        trustAnchorArn: entry.trustAnchorArn,
                        profileArn: entry.profileArn
                    };
                    break;

                case Enums.HYOKProviders.FORTANIX:
                    accessDetails = {
                        applicationId: entry.applicationId,
                        host: this.twoWayModel.getProperty('/selectedKey/accessDetails/management/host') as string
                    };
                    break;

                case Enums.HYOKProviders.GCP:
                    accessDetails = {
                        projectNumber: entry.projectNumber,
                        poolId: entry.poolId,
                        providerId: entry.providerId,
                        serviceAccount: entry.serviceAccount
                    };
                    break;
                default:
                    return;
            }

            entry.selectedCertKeys.forEach((certKey) => {
                newCryptoPayload[certKey] = accessDetails;
            });
        });

        // Merge with existing cryptos

        const existingCryptoPayload: Record<string, AWSAccessDetails | FortanixAccessDetails | GCPAccessDetails> = {};

        const existingCryptoArray = this.twoWayModel.getProperty('/selectedKey/accessDetails/cryptoARNsArray') as | { key: string, value: AWSAccessDetails | FortanixAccessDetails | GCPAccessDetails }[] | undefined;

        existingCryptoArray?.forEach((cryptoItem) => {
            switch (this.keyProvider) {
                case Enums.HYOKProviders.AWS:
                    existingCryptoPayload[cryptoItem.key] = {
                        roleArn: (cryptoItem.value as AWSAccessDetails).roleArn,
                        trustAnchorArn: (cryptoItem.value as AWSAccessDetails).trustAnchorArn,
                        profileArn: (cryptoItem.value as AWSAccessDetails).profileArn
                    };
                    break;

                case Enums.HYOKProviders.FORTANIX:
                    existingCryptoPayload[cryptoItem.key] = {
                        applicationId: (cryptoItem.value as FortanixAccessDetails).applicationId,
                        host: this.twoWayModel.getProperty(
                            '/selectedKey/accessDetails/management/host'
                        ) as string
                    };
                    break;

                case Enums.HYOKProviders.GCP:
                    existingCryptoPayload[cryptoItem.key] = {
                        projectNumber: (cryptoItem.value as GCPAccessDetails).projectNumber,
                        poolId: (cryptoItem.value as GCPAccessDetails).poolId,
                        providerId: (cryptoItem.value as GCPAccessDetails).providerId,
                        serviceAccount: (cryptoItem.value as GCPAccessDetails).serviceAccount
                    };
                    break;
            }
        });

        const payload = {
            accessDetails: {
                crypto: {
                    ...existingCryptoPayload,
                    ...newCryptoPayload
                }
            }
        };
        try {
            await this.api.patch<Key>(`keys/${this.id}`, payload);
            MessageToast.show(this.getText('keyConfigSaved'));
            this.closeAddCryptoCertsDialog();
            await this.getKeyDetails();
            this.updateAddCryptoCertButtonState();
        }
        catch (error) {
            console.error('Error saving new crypto certificates', error);
            showErrorMessage(error as AxiosError, this.getText('errorSavingCryptoDetails'));
        }
        finally {
            this.addCryptoCertsDialog?.setBusy(false);
        }
    }

    public onCancelAddCryptoCerts(): void {
        const entries = this.addCryptoCertsModel.getProperty('/newCryptoCertEntries') as unknown[];
        if (entries && entries.length > 0) {
            MessageBox.warning(this.getText('confirmCancelAddCryptoCerts'), {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: (action: unknown) => {
                    if (action === MessageBox.Action.YES) {
                        this.closeAddCryptoCertsDialog();
                    }
                }
            });
        }
        else {
            this.closeAddCryptoCertsDialog();
        }
    }

    private closeAddCryptoCertsDialog(): void {
        this.addCryptoCertsDialog?.close();
        this.addCryptoCertsDialog?.destroy();
        this.addCryptoCertsDialog = undefined;
    }

    private getExistingCryptoKeys(): string[] {
        const cryptoARNsArray = this.twoWayModel.getProperty('/selectedKey/accessDetails/cryptoARNsArray') as { key: string, value: AWSAccessDetails }[] | undefined;
        if (!cryptoARNsArray) return [];
        return cryptoARNsArray.map(item => item.key);
    }

    private async fetchCryptoCertificates(): Promise<HyokCertificates[]> {
        interface HYOKAWScertificates {
            tenantDefault: { count: number, value: HyokCertificates[] }
            crypto: { count: number, value: HyokCertificates[] }
        }
        const keyConfigId = this.keyConfigId ?? '';
        const certs = await this.api.get<HYOKAWScertificates>(`keyConfigurations/${keyConfigId}/certificates`);
        return certs?.crypto?.value ?? [];
    }

    private async getAvailableCryptoCerts(): Promise<{ allCryptoCerts: HyokCertificates[], availableCerts: HyokCertificates[] }> {
        const allCryptoCerts = await this.fetchCryptoCertificates();
        const existingCryptoKeys = this.getExistingCryptoKeys();
        const availableCerts = allCryptoCerts.filter(
            (cert: HyokCertificates) => !existingCryptoKeys.includes(cert.name)
        );
        return { allCryptoCerts, availableCerts };
    }

    private updateAddCryptoCertButtonState(): void {
        const selectedKey = this.oneWayModel.getProperty('/selectedKey') as Key;
        const keyType = selectedKey?.type;
        if (keyType !== this.Enums.KeyCreationTypes.HYOK) {
            this.oneWayModel.setProperty('/addCryptoCertEnabled', false);
            return;
        }

        this.getAvailableCryptoCerts().then(({ availableCerts }) => {
            this.oneWayModel.setProperty('/addCryptoCertEnabled', availableCerts.length > 0);
        }).catch((error: unknown) => {
            console.error('Error checking crypto cert availability', error);
            // Default to enabled so user can still try to add
            this.oneWayModel.setProperty('/addCryptoCertEnabled', true);
        });
    }
}
