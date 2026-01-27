import BaseController from 'kms/controller/BaseController';
import BindingMode from 'sap/ui/model/BindingMode';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Api from 'kms/services/Api.service';
import { System, KeyConfig, WorkflowParams, SystemRecoveryActions } from 'kms/common/Types';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import { Button$PressEvent } from 'sap/m/Button';
import MessageBox from 'sap/m/MessageBox';
import { copyToClipboard, showErrorMessage } from 'kms/common/Helpers';
import EventBus from 'sap/ui/core/EventBus';
import MessageToast from 'sap/m/MessageToast';
import Dialog from 'sap/m/Dialog';
import Fragment from 'sap/ui/core/Fragment';
import { ActionTypes, ArtifactTypes, EventChannelIds, EventIDs } from 'kms/common/Enums';
import { AxiosError } from 'axios';
import Workflow from 'kms/component/Workflow';
interface KeyConfigsResponse {
    value: KeyConfig[]
    count: number
}
/**
 * @namespace kms
 */
export default class Systems extends BaseController {
    private api: Api;
    private readonly oneWayModel = new JSONModel({
        selectedSystem: {} as System
    });

    private id: string;
    private eventBus = EventBus.getInstance();
    private switchKeyConfigDialog: Dialog | undefined;
    private workflowComponent: Workflow | undefined;
    private readonly switchKeyConfigModel = new JSONModel({});

    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('systemsDetail')?.attachPatternMatched({}, (event: Route$PatternMatchedEvent) => {
            this.onRouteMatched(event);
        }, this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    }

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        const routeArgs = event.getParameter('arguments') as { tenantId: string, systemId?: string };
        this.id = routeArgs.systemId || '';
        this.api = Api.getInstance();
        this.tenantId = routeArgs?.tenantId;
        this.eventBus.publish(EventChannelIds.SYSTEMS, EventIDs.LOAD_SYSTEMS);
        this.getSystemDetails().catch((error: unknown) => {
            console.error(error);
        });
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
            this.eventBus.publish(EventChannelIds.SYSTEMS, EventIDs.LOAD_SYSTEMS);
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorRecoveringSystem'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    public async onSwitchKeyConfigPress(): Promise<void> {
        const selectedSystem = this.oneWayModel.getProperty('/selectedSystem') as System;
        const component = this.getOwnerComponent();
        if (!selectedSystem || !component) {
            console.error('Selected system or component is undefined');
            return;
        }
        const keyConfigs = await this.api.get<KeyConfigsResponse>('keyConfigurations', {});

        const connectedKeyConfig = selectedSystem.keyConfigurationID
            ? await this.api.get<KeyConfig>(`keyConfigurations/${selectedSystem.keyConfigurationID}`)
            : undefined;
        const filteredKeyConfigs = keyConfigs?.value.filter((keyConfig: KeyConfig) => connectedKeyConfig ? (keyConfig.id !== connectedKeyConfig.id) : true);

        if (!this.switchKeyConfigDialog) {
            this.switchKeyConfigDialog = await Fragment.load({
                name: 'kms.resources.fragments.systems.SwitchSystemKeyConfig',
                controller: this
            }) as Dialog;
            this.switchKeyConfigDialog.addStyleClass('sapUiSizeCompact');
            this.switchKeyConfigDialog.setModel(component.getModel('i18n'), 'i18n');
            this.switchKeyConfigModel.setData(selectedSystem);
            this.switchKeyConfigDialog.setModel(this.switchKeyConfigModel, 'switchKeyConfigModel');
            this.switchKeyConfigModel.setProperty('/KeyConfigList', filteredKeyConfigs);
            this.switchKeyConfigModel.setProperty('/connectedKeyConfig', connectedKeyConfig);
            this.switchKeyConfigDialog.open();
        }
        else {
            this.switchKeyConfigDialog.open();
        }
    }

    public onSwitchKeyConfigCancelPress(): void {
        this.switchKeyConfigDialog?.close();
        this.switchKeyConfigDialog?.destroy();
        this.switchKeyConfigDialog = undefined;
    }

    public async onSwitchKeyConfigSubmitPress(): Promise<void> {
        const systemId: string = this.switchKeyConfigModel.getProperty('/id') as string;
        const keyConfigId: string = this.switchKeyConfigModel.getProperty('/selectedKeyConfig') as string;
        try {
            await this.api.patch(`systems/${systemId}/link`, { keyConfigurationID: keyConfigId });
            this.onSwitchKeyConfigCancelPress();
            await this.getSystemDetails();
            this.eventBus.publish(EventChannelIds.SYSTEMS, EventIDs.LOAD_SYSTEMS);
        }
        catch (error) {
            showErrorMessage(error as AxiosError, this.getText('keyConfigConnectSystemError'));
            console.error('Error creating key', error);
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    public onCancel(): void {
        this.getRouter().navTo('systems', {
            tenantId: this.tenantId
        });
    }

    public async onCopyToClipboardPress(event: Button$PressEvent): Promise<void> {
        await copyToClipboard(event);
    }
}
