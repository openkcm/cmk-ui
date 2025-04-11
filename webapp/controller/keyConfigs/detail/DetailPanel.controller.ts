import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import Api from 'kms/services/Api.service';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import EventBus from 'sap/ui/core/EventBus';
import { Key, KeyVersion } from 'kms/common/Types';
import { isUUIDValid, copyToClipboard } from 'kms/common/Helpers';
import MessageBox from 'sap/m/MessageBox';
import { Button$PressEvent } from 'sap/m/Button';
import Formatter from 'kms/common/Formatters';
import MessageToast from 'sap/m/MessageToast';

interface KeyPatchPayload {
    name: string;
    description: string;
    enabled: boolean;
}
interface KeyVersionResponse {
    value: KeyVersion[] | undefined;
    count: number | undefined;
}

export default class DetailPanel extends BaseController {
    public formatter: typeof Formatter = Formatter;
    private readonly api: Api = new Api();
    private readonly oneWayModel = new JSONModel({
        edit: false as boolean,
        selectedKey: {} as Key,
        keyVersions: [] as KeyVersion[]
    });

    private readonly twoWayModel = new JSONModel({
        selectedKey: {} as Key
    });

    private id: string;
    private idType: string;
    private keyConfigId: string;
    private eventBus = EventBus.getInstance();

    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('keyConfigDetailPanel').attachPatternMatched({}, (event: Route$PatternMatchedEvent) => this.onKeyConfigDetailPanelRouteMatched(event), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.twoWayModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.twoWayModel, 'twoWay');
    };
    public onKeyConfigDetailPanelRouteMatched(event: Route$PatternMatchedEvent): void {
        this.getView().setBusy(true);
        const routeArgs = event.getParameter('arguments') as { keyConfigId?: string, type?: string, id?: string };
        this.idType = routeArgs.type
        this.id = routeArgs.id;
        this.keyConfigId = routeArgs.keyConfigId;
        this.oneWayModel.setProperty('/type', this.idType);
        this.oneWayModel.setProperty('/keyConfigDetail', true);
        if (!isUUIDValid(this.id)) {
            console.error('Key config id or key id invalid');
            this.getRouter().navTo('keyConfigs');
            return;
        }
        this.eventBus.publish('keyConfig', 'loadKeyConfigDetails', { keyConfigId: this.keyConfigId });
        if (this.idType === this.Enums.KeyConfigDetailPanelTypes.KEY) {
            this.getKeyDetails().catch((error) => {
                console.error(error);
            });
        } else {
            this.getSystemDetails().catch((error) => {
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
                this.oneWayModel.setProperty('/keyVersions', keyVersions?.value);
                this.oneWayModel.setProperty('/keyVersionsCount', keyVersions?.count);
            } else {
                console.error('Key not found');
                this.getRouter().navTo('keyConfigDetail', {
                    keyConfigId: this.keyConfigId
                });
            }
        } catch (error) {
            console.error('Error fetching key details', error);
            MessageBox.error(this.getText('errorFetchingKeyDetails'));
        } finally {
            this.getView().setBusy(false);
        }
    };
    private async getSystemDetails(): Promise<void> {
        try {
            const selectedSystem = await this.api.get(`systems/${this.id}`);
            if (selectedSystem) {
                this.oneWayModel.setProperty('/selectedSystem', selectedSystem);
            } else {
                console.error('System not found');
                this.getRouter().navTo('systems');
            }
        } catch (error) {
            console.error('Error fetching system details', error);
            MessageBox.error(this.getText('errorFetchingSystemDetails'));
        } finally {
            this.getView().setBusy(false);
        }
    };
    public onEditDetailsPress(): void {
        this.oneWayModel.setProperty('/edit', true);
    }
    public onCancelEditPress(): void {
        this.oneWayModel.setProperty('/edit', false);
    }
    public async onRotateNowPress(): Promise<void> {
        this.getView().setBusy(true);
        try {
            await this.api.post(`keys/${this.id}/versions`, {});
            MessageToast.show(this.getText('keyRotatedSuccessfully'));
            this.getKeyDetails().catch((error) => {
                console.error(error);
            });
        } catch (error) {
            console.error('Error rotating key', error);
            MessageBox.error(this.getText('errorRotatingKey'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    public async onSaveKeyDetailsPress(): Promise<void> {
        this.getView().setBusy(true);
        const key = this.twoWayModel.getProperty('/selectedKey') as Key;
        const payload = {
            name: key.name,
            description: key.description,
            enabled: key.enabled
        } as KeyPatchPayload;
        try {
            await this.api.patch<KeyPatchPayload, Key>(`keys/${this.id}`, payload);
            this.oneWayModel.setProperty('/edit', false);
            this.getKeyDetails().catch((error) => {
                console.error(error);
            });
        } catch (error) {
            console.error('Error saving key details', error);
            MessageBox.error(this.getText('errorSavingKeyDetails'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    public async onCopyToClipboardPress(event: Button$PressEvent): Promise<void> {
        await copyToClipboard(event);
    }
    public onDetailsClosePress(): void {
        this.getRouter().navTo('keyConfigDetail', {
            keyConfigId: this.keyConfigId
        });
    }
    public async onDetailsRefresh(): Promise<void> {
        this.getView().setBusy(true);
        if (this.idType === 'key') {
            await this.getKeyDetails();
        } else {
            await this.getSystemDetails();
        }
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async onDisableVersionPress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as KeyVersion;
        const version = selectedKey.version;
        MessageBox.confirm(this.getText('confirmKeyDisable'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.patchKeyVersion(this.id, version, false);
                }
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async onEnableVersionPress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as KeyVersion;
        const version = selectedKey.version;
        MessageBox.confirm(this.getText('confirmKeyEnable'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.patchKeyVersion(this.id, version, true);
                }
            }
        });
    }
    private async patchKeyVersion(keyId: string, version: number, enabled: boolean): Promise<void> {
        this.getView().setBusy(true);
        const payload = {
            enabled: enabled
        } as KeyPatchPayload;
        try {
            await this.api.patch<KeyPatchPayload, KeyVersion>(`keys/${keyId}/versions/${version}`, payload);
            MessageToast.show(this.getText('keyDisabledSuccessfully'));
            await this.getKeyDetails();
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorUpdatingKeyVersion'));
        } finally {
            this.getView().setBusy(false);
        }
    }
}
