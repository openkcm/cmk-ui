import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import Api from 'kms/services/Api.service';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import EventBus from 'sap/ui/core/EventBus';
import { AWSAccessDetails, Key, KeyVersion, SystemRecoveryActions, WorkflowParams } from 'kms/common/Types';
import { isUUIDValid, copyToClipboard, showErrorMessage } from 'kms/common/Helpers';
import { Button$PressEvent } from 'sap/m/Button';
import * as Formatter from 'kms/common/Formatters';
import MessageToast from 'sap/m/MessageToast';
import { ActionTypes, ArtifactTypes, EventChannelIds, EventIDs } from 'kms/common/Enums';
import { AxiosError } from 'axios';
import MessageBox from 'sap/m/MessageBox';
import Workflow from 'kms/component/Workflow';

interface KeyPatchPayload {
    name: string
    description: string
    enabled: boolean
}
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
        const managementARNs = key?.accessDetails?.management;
        const cryptoARNs = key?.accessDetails?.crypto;
        let managementARNsArray: { key: string, value: AWSAccessDetails }[] = [];
        let cryptoARNsArray: { key: string, value: AWSAccessDetails }[] = [];
        if (managementARNs) {
            managementARNsArray = [{ key: 'management', value: managementARNs }];
            this.twoWayModel.setProperty('/selectedKey/accessDetails/managementARNsArray', managementARNsArray);
        }
        if (cryptoARNs) {
            Object.entries(cryptoARNs).forEach(([key, value]) => {
                cryptoARNsArray = [...cryptoARNsArray, { key: key, value: value }];
            });

            this.twoWayModel.setProperty('/selectedKey/accessDetails/cryptoARNsArray', cryptoARNsArray);
        }
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
        } as KeyPatchPayload;
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
}
