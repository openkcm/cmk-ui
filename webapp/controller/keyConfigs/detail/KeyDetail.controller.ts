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

export default class KeyDetail extends BaseController {
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

    private keyId: string;
    private keyConfigId: string;
    private eventBus = EventBus.getInstance();

    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('keyConfigKeyDetail').attachPatternMatched({}, (event: Route$PatternMatchedEvent) => this.onKeyDetailRouteMatched(event), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.twoWayModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.twoWayModel, 'twoWay');
    };
    public onKeyDetailRouteMatched(event: Route$PatternMatchedEvent): void {
        this.getView().setBusy(true);
        const routeArgs = event.getParameter('arguments') as { keyConfigId?: string, keyId?: string };
        this.keyId = routeArgs.keyId;
        this.keyConfigId = routeArgs.keyConfigId;

        if (!isUUIDValid(this.keyId)) {
            console.error('Key config id or key id invalid');
            this.getRouter().navTo('keyConfigs');
            return;
        }
        this.eventBus.publish('keys', 'loadKeyConfigDetails', { keyConfigId: this.keyConfigId });
        this.getKeyDetails().catch((error) => {
            console.error(error);
        });
    };
    private async getKeyDetails(): Promise<void> {
        try {
            const selectedKey = await this.api.get<Key>(`keys/${this.keyId}`);
            const keyVersions = await this.api.get<[]>(`keys/${this.keyId}/versions`);
            if (selectedKey) {
                this.oneWayModel.setProperty('/selectedKey', selectedKey);
                this.twoWayModel.setProperty('/selectedKey', selectedKey);
                this.oneWayModel.setProperty('/keyVersions', keyVersions);
                this.oneWayModel.setProperty('/keyVersionsCount', keyVersions?.length);
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
    public onEditDetailsPress(): void {
        this.oneWayModel.setProperty('/edit', true);
    }
    public onCancelEditPress(): void {
        this.oneWayModel.setProperty('/edit', false);
    }
    public async onRotateNowPress(): Promise<void> {
        this.getView().setBusy(true);
        try {
            await this.api.post<null, Key>(`keys/${this.keyId}/versions`);
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
            await this.api.patch<KeyPatchPayload, Key>(`keys/${this.keyId}`, payload);
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
    public onKeyDetailsClosePress(): void {
        this.getRouter().navTo('keyConfigDetail', {
            keyConfigId: this.keyConfigId
        });
    }
}
