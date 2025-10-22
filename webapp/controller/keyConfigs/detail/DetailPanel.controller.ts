import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import Api from 'kms/services/Api.service';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import EventBus from 'sap/ui/core/EventBus';
import { Key, KeyVersion } from 'kms/common/Types';
import { isUUIDValid, copyToClipboard, showErrorMessage } from 'kms/common/Helpers';
import { Button$PressEvent } from 'sap/m/Button';
import * as Formatter from 'kms/common/Formatters';
import MessageToast from 'sap/m/MessageToast';
import { EventChannelIds, EventIDs } from 'kms/common/Enums';
import { AxiosError } from 'axios';

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
    }

    private async getSystemDetails(): Promise<void> {
        try {
            const selectedSystem = await this.api.get(`systems/${this.id}`);
            if (selectedSystem) {
                this.oneWayModel.setProperty('/selectedSystem', selectedSystem);
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

    public onEditDetailsPress(): void {
        this.oneWayModel.setProperty('/edit', true);
    }

    public onCancelEditPress(): void {
        this.oneWayModel.setProperty('/edit', false);
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
