import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import { KeyConfig, Key, System, MangedKeyPayload, HyokKeyPayload } from 'kms/common/Types';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import Api from 'kms/services/Api.service';
import MessageBox from 'sap/m/MessageBox';
import Fragment from 'sap/ui/core/Fragment';
import ViewSettingsDialog from 'sap/m/ViewSettingsDialog';
import Dialog from 'sap/m/Dialog';
import MessageToast from 'sap/m/MessageToast';
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
import { isUUIDValid, copyToClipboard } from 'kms/common/Helpers';
import EventBus from 'sap/ui/core/EventBus';
import { Button$PressEvent } from 'sap/m/Button';
import Filter from 'sap/ui/model/Filter';
import FilterOperator from 'sap/ui/model/FilterOperator';
import { SelectDialog$ConfirmEvent, SelectDialog$LiveChangeEvent } from 'sap/m/SelectDialog';
import ListBinding from 'sap/ui/model/ListBinding';
import Context from 'sap/ui/model/Context';
import MultiInput, { MultiInput$TokenUpdateEvent } from 'sap/m/MultiInput';
import Token from 'sap/m/Token';
import { BYOKProviders, EventChannelIds, EventIDs, HYOKProviders, KeyCreationTypes } from 'kms/common/Enums';
import KeyCreation from 'kms/component/KeyCreation';

interface KeyConfigPatchPayload {
    name: string;
}
interface KeyResponse {
    value: Key[] | undefined;
    count: number | undefined;
}

interface SystemsResponse {
    value: System[] | undefined;
    count: number | undefined;
}
interface TagsResponse {
    value: string[] | undefined;
    count: number | undefined;
}
interface KeyPatchPayload {
    name: string;
    description: string;
    enabled: boolean;
}
interface KeyConfigsResponse {
    value: KeyConfig[];
    count: number;
}

export default class KeyConfigDetail extends BaseController {
    private api: Api;
    private filterPopover: ViewSettingsDialog | undefined;
    private readonly oneWayModel = new JSONModel({
        keyConfig: {} as KeyConfig,
        keysCount: 0 as number,
        systemsCount: 0 as number,
        edit: false as boolean,
        keys: [] as Key[],
        systems: [] as System[],
        keysTableUpdating: false as boolean,
        systemsTableUpdating: false as boolean
    });
    private readonly viewSettingModel = new JSONModel({
        sortColumns: [] as object[],
        sortValue: 'createdOn' as string,
        sortDesc: true as boolean,
        currentTable: 'keys' as string,
    });
    private readonly twoWayModel = new JSONModel({
        keyConfig: {} as KeyConfig
    });
    private keyConfigId: string;
    private readonly keyCreationModel = new JSONModel({});
    private readonly connectSystemModel = new JSONModel({});
    private connectSystemPopover: Dialog | undefined;
    private readonly switchKeyConfigModel = new JSONModel({});
    private switchKeyConfigDialog: Dialog | undefined;
    private eventBus = EventBus.getInstance();

    private top: number;
    private keysSkip: number;
    private systemsSkip: number;
    private keysCurrentPage: number;
    private systemsCurrentPage: number;

    private readonly keysPaginationModel = new JSONModel({
        totalPages: 0,
        currentPage: 1
    });
    private readonly systemsPaginationModel = new JSONModel({
        totalPages: 0,
        currentPage: 1
    });

    public onInit(): void {
        super.onInit();
        this.top = 10;
        this.keysSkip = 0;
        this.systemsSkip = 0;
        this.keysCurrentPage = 0;
        this.systemsCurrentPage = 0;

        this.eventBus.subscribe(EventChannelIds.KEYCONFIG, EventIDs.LOAD_KEY_CONFIG_DETAILS, (channelId, eventId, data) => this.onDetailPanelRouteEventTriggered(channelId, eventId, data as { keyConfigId: string, tenantId: string }), this);
        this.getRouter().getRoute('keyConfigDetail').attachPatternMatched({}, (event: Route$PatternMatchedEvent) => this.onRouteMatched(event), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.twoWayModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.viewSettingModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.keyCreationModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.twoWayModel, 'twoWay');
        this.setModel(this.viewSettingModel, 'viewSettingModel');
        this.setModel(this.keyCreationModel, 'keyCreationModel');
        this.setModel(this.systemsPaginationModel, 'systemsPagination');
        this.setModel(this.keysPaginationModel, 'keysPagination');
    };
    public onDetailPanelRouteEventTriggered(channelId: string, eventId: string, data: { keyConfigId: string, tenantId: string }): void {
        this.oneWayModel.setProperty('/keyConfigDetail', true);
        if (channelId === EventChannelIds.KEYCONFIG && eventId === EventIDs.LOAD_KEY_CONFIG_DETAILS) {
            this.keyConfigId = data.keyConfigId;
            if (!this.api || this.tenantId !== data.tenantId) {
                this.tenantId = data.tenantId;
                this.api = new Api(this.tenantId);
            }
            this.getKeyConfigData().catch((error) => {
                console.error(error);
            });
        }
    }
    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        this.getView().setBusy(true);
        this.resetPagination();
        const routeName = event.getParameter('name');
        this.oneWayModel.setProperty('/keyConfigDetail', routeName === 'keyConfigDetail');
        this.setHyokProviders();
        const routeArgs = event.getParameter('arguments') as { tenantId: string, keyConfigId?: string, '?query': { createKey?: string, keyType?: KeyCreationTypes, keySubtype?: HYOKProviders | BYOKProviders } };
        const queryParams = routeArgs['?query'] as { createKey?: string, keyType?: KeyCreationTypes, keySubtype?: HYOKProviders | BYOKProviders };
        this.keyConfigId = routeArgs.keyConfigId;

        this.api = new Api(routeArgs?.tenantId);
        this.tenantId = routeArgs?.tenantId;

        if (!isUUIDValid(this.keyConfigId)) {
            console.error('Key config id invalid');
            this.getRouter().navTo('keyConfigs', {
                tenantId: this.tenantId
            });
            return;
        }
        this.getKeyConfigData().catch((error) => {
            console.error(error);
        });

        if (queryParams?.createKey === 'true') {
            const type = queryParams?.keyType;
            const subtype = queryParams?.keySubtype;
            this.getView().setBusy(true);
            this.handleCreateKeyRoute(type, subtype);
        }
    }
    public async onConnectSystemPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();

        if (!this.connectSystemPopover) {
            this.connectSystemPopover = await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.common.ConnectSystems',
                controller: this
            }) as Dialog;
            this.connectSystemPopover.addStyleClass('sapUiSizeCompact');
            this.connectSystemPopover.setModel(component.getModel('i18n'), 'i18n');
            this.connectSystemPopover.setModel(this.connectSystemModel, 'model');
            this.connectSystemPopover.open();
            this.resetConnectSystemModel()
        } else {
            this.connectSystemPopover.open();
            this.resetConnectSystemModel()
        }
    }
    public handleCreateKeyRoute(keyType: KeyCreationTypes, keySubtype?: HYOKProviders | BYOKProviders): void {
        const component = this.getOwnerComponent();
        const i18nModel = component.getModel('i18n')
        const keyCreatePopover = new KeyCreation('keyCreatePopover');
        const keyParams = {
            keyConfigId: this.keyConfigId,
            keyType,
            keySubtype
        }
        const createKey = async (payload: MangedKeyPayload | HyokKeyPayload) => {
            await this.api.post('keys', payload);
            MessageToast.show(this.getText('keyCreatedSuccessfully'));
            this.getKeyConfigData().catch((error) => {
                console.error(error);
            });
        }
        keyCreatePopover.openKeyCreationWizard(keyParams, i18nModel, this, createKey);
    }
    public onConnectSystemsCancelPress(): void {
        this.connectSystemPopover?.destroy();
        this.connectSystemPopover = undefined;
        this.resetConnectSystemModel();
    }
    public async onConnectSystemsConfirmPress(event: SelectDialog$ConfirmEvent): Promise<void> {
        const systems = event.getParameter("selectedContexts") as Context[];
        const selectedSystemIds = systems.map(system => (system.getObject() as System).id);
        if (selectedSystemIds.length === 0) {
            MessageToast.show(this.getText('noChangesWereMade'));
            return;
        }
        const patchPromises: Promise<void>[] = [];
        selectedSystemIds.forEach((systemId) => {
            patchPromises.push(this.api.patch(`systems/${systemId}/link`, { keyConfigurationID: this.keyConfigId }));
        })
        this.getView().setBusy(true);
        try {
            await Promise.all(patchPromises);
            MessageToast.show(this.getText('systemsConnectedSuccessfully'));
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorConnectingSystems'));
        } finally {
            await this.getKeyConfigData();
            this.getView().setBusy(false);
            this.onConnectSystemsCancelPress();
        }
    }
    public onSearchConnectSystems(event: SelectDialog$LiveChangeEvent): void {
        const value = event.getParameter('value');
        const filter = new Filter('name', FilterOperator.Contains, value);
        const binding = event.getParameter('itemsBinding') as ListBinding;
        binding.filter([filter]);
    }

    private async getKeyConfigData(): Promise<void> {
        this.getView().setBusy(true);
        try {
            const keyConfig = await this.api.get<KeyConfig>(`keyConfigurations/${this.keyConfigId}`);
            if (!keyConfig) {
                return;
            }
            this.oneWayModel.setProperty('/keyConfig', keyConfig);
            this.twoWayModel.setProperty('/keyConfig', keyConfig);
            await this.updateKeysTable();
            await this.updateSystemsTable();
            const tags = await this.getTags();
            this.oneWayModel.setProperty('/tags', tags?.value);
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingKeyConfigDetails'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    //* We have two tables one for Keys and one for Systems, hence two sets of navigation functions *//
    private async onKeysNextPage() {
        this.keysCurrentPage++;
        this.keysSkip += 10;
        await this.updateKeysTable();
    }
    private async onKeysPreviousPage() {
        this.keysCurrentPage--;
        this.keysSkip -= 10;
        await this.updateKeysTable();
    }
    private async onSystemsNextPage() {
        this.systemsCurrentPage++;
        this.systemsSkip += 10;
        await this.updateSystemsTable();
    }
    private async onSystemsPreviousPage() {
        this.systemsCurrentPage--;
        this.systemsSkip -= 10;
        await this.updateSystemsTable();
    }
    private resetPagination(): void {
        this.keysCurrentPage = 0;
        this.keysSkip = 0;
        this.keysPaginationModel.setProperty('/currentPage', 0);
        this.keysPaginationModel.setProperty('/totalPages', 1);
        this.systemsCurrentPage = 0;
        this.systemsSkip = 0;
        this.systemsPaginationModel.setProperty('/currentPage', 0);
        this.systemsPaginationModel.setProperty('/totalPages', 1);
    }

    private async updateKeysTable() {
        this.oneWayModel.setProperty('/keysTableUpdating', true);
        const keys = await this.getKeys();
        this.oneWayModel.setProperty('/keys', keys?.value);
        this.oneWayModel.setProperty('/keysCount', keys?.count || 0);
        this.keysPaginationModel.setProperty('/totalPages', Math.ceil(keys.count / this.top));
        this.keysPaginationModel.setProperty('/currentPage', this.keysCurrentPage + 1);
        this.oneWayModel.setProperty('/keysCount', keys?.count || 0);
        this.oneWayModel.setProperty('/keysTableUpdating', false);
    }
    private async updateSystemsTable() {
        this.oneWayModel.setProperty('/systemsTableUpdating', true);
        const allSystems = await this.getAllSystems();
        const connectedSystems = await this.getConnectedSystems();
        this.oneWayModel.setProperty('/allSystems', allSystems?.value);
        this.oneWayModel.setProperty('/systems', connectedSystems?.value);
        this.oneWayModel.setProperty('/systemsCount', connectedSystems?.count || 0);
        this.systemsPaginationModel.setProperty('/totalPages', Math.ceil(connectedSystems.count / this.top));
        this.systemsPaginationModel.setProperty('/currentPage', this.systemsCurrentPage + 1);

        this.oneWayModel.setProperty('/allSystemsCount', allSystems?.count || 0);
        this.oneWayModel.setProperty('/systemsTableUpdating', false);
    }
    private async getKeys() {
        try {
            return await this.api.get<KeyResponse>(`keys`, { keyConfigurationID: this.keyConfigId, $top: this.top, $skip: this.keysSkip });
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingKeyDetails'));
        }
    }
    private async getConnectedSystems() {
        try {
            return await this.api.get<KeyResponse>(`systems`, { keyConfigurationID: this.keyConfigId, $top: this.top, $skip: this.systemsSkip });
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingSystems'));
        }
    }
    private async getAllSystems() {
        try {
            return await this.api.get<SystemsResponse>(`systems`);
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingSystems'));
        }
    }
    private async getTags() {
        try {
            const tags = await this.api.get<TagsResponse>(`keyConfigurations/${this.keyConfigId}/tags`);
            this.oneWayModel.setProperty('/tags', tags?.value);
            const fnValidator = function (args: { text: string }): Token {
                const text = args.text;
                return new Token({ key: text, text: text });
            };
            const tagsInput = this.byId('tagsMultiInput') as MultiInput;
            tagsInput.addValidator(fnValidator);
            return tags;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingTags'));
        }
    }
    public async onTagsUpdate(event: MultiInput$TokenUpdateEvent): Promise<void> {
        const tags = this.oneWayModel.getProperty('/tags') as [];

        const removedTokens = event.getParameter('removedTokens');
        const addedTokens = event.getParameter('addedTokens');
        const removedTags = removedTokens?.map(token => token.getKey()) as [];
        const addedTags = addedTokens?.map(token => token.getKey()) as [];
        const updatedTags = tags?.filter(tag => !removedTags.includes(tag)) || [] as [];
        updatedTags?.push(...addedTags);
        this.oneWayModel.setProperty('/tags', updatedTags || tags);

        const payload = {
            tags: updatedTags
        }
        try {
            await this.api.put(`keyConfigurations/${this.keyConfigId}/tags`, payload);
            MessageToast.show(this.getText('tagsUpdatedSuccessfully'));
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorUpdatingTags'));
            const tags = await this.getTags();
            this.oneWayModel.setProperty('/tags', tags?.value || []);
        }
    }
    private async patchKeyConfigData(keyConfig: KeyConfigPatchPayload) {
        try {
            const keyConfigs = await this.api.patch<KeyConfigPatchPayload, KeyConfig>(`keyConfigurations/${this.keyConfigId}`, keyConfig);
            MessageToast.show(this.getText('keyConfigSaved'));
            return keyConfigs;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorPatchingKeyConfigDetails'));
        }
    }
    public onEditDetailsPress(): void {
        this.oneWayModel.setProperty('/edit', true);
    }
    public async onCancelEditPress(): Promise<void> {
        this.oneWayModel.setProperty('/edit', false);
        await this.getKeyConfigData();
    }
    public async onSaveKeyConfigPress(): Promise<void> {
        this.getView().setBusy(true);
        const keyConfig = this.twoWayModel.getProperty('/keyConfig') as KeyConfig;
        const payload = {
            name: keyConfig.name
        } as KeyConfigPatchPayload;

        try {
            await this.patchKeyConfigData(payload);
            await this.getKeyConfigData();
            await this.onCancelEditPress();
        } catch (error) {
            console.error('Error patching key config', error);
            MessageBox.error(this.getText('errorPatchingKeyConfigDetails'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    public onTableSortApplyPress(): void {
        const currentTable = this.viewSettingModel.getProperty('/currentTable') as string;
        switch (currentTable) {
            case 'keys':
                this.onKeysTableSortApply();
                break;
            case 'systems':
                this.onSystemsTableSortApply();
                break;
            default:
                break;
        }
    }
    public onKeysTableSortApply(): void {
        //@TODO Implement sorting for keys table when API is ready
    }
    public onSystemsTableSortApply(): void {
        //@TODO Implement sorting for systems table when API is ready
    }
    public async onKeysTableSortPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();
        const columns = [
            { key: 'name', text: this.getText('name') },
            { key: 'createdOn', text: this.getText('createdOn') },
            { key: 'state', text: this.getText('state') }
        ];
        this.viewSettingModel.setProperty('/sortColumns', columns);
        this.viewSettingModel.setProperty('/currentTable', 'keys');
        if (!this.filterPopover) {
            this.filterPopover = await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.common.TableSorter',
                controller: this
            }) as ViewSettingsDialog;
            this.filterPopover.addStyleClass('sapUiSizeCompact');
            this.filterPopover.setModel(component.getModel('i18n'), 'i18n');
            this.filterPopover.setModel(this.viewSettingModel, 'viewSettingModel');
            this.filterPopover.open();
        } else {
            this.filterPopover.open();
        }
    }
    public onKeyTableRowPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        const keyId: string = selectedKey.id;
        this.getRouter().navTo('keyConfigDetailPanel', {
            tenantId: this.tenantId,
            keyConfigId: this.keyConfigId,
            id: keyId,
            type: this.Enums.KeyConfigDetailPanelTypes.KEY
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async onKeyTableMakePrimaryPress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        MessageBox.confirm(this.getText('confirmMakePrimaryConfirmation'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.makeKeyPrimary(selectedKey);
                }
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async onKeyTableDeletePress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        MessageBox.confirm(this.getText('confirmKeyDeletion'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.deleteKey(selectedKey.id);
                }
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async onKeyTableDisablePress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        MessageBox.confirm(this.getText('confirmKeyDisable'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.disableKey(selectedKey.id);
                }
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async onKeyTableEnablePress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        MessageBox.confirm(this.getText('confirmKeyEnable'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.enableKey(selectedKey.id);
                }
            }
        });
    }
    public onSystemsTableDisconnectPress(event: Button$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        MessageBox.confirm(this.getText('confirmDisconnectSystem'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.disconnectSystem(selectedSystem.id);
                }
            }
        });
    }
    public onSystemPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        const systemId = selectedSystem.id;
        this.getRouter().navTo('keyConfigDetailPanel', {
            tenantId: this.tenantId,
            keyConfigId: this.keyConfigId,
            id: systemId,
            type: this.Enums.KeyConfigDetailPanelTypes.SYSTEM
        });
    };
    private async disconnectSystem(systemsID: string): Promise<void> {
        this.getView().setBusy(true);
        try {
            await this.api.delete(`systems/${systemsID}/link`);
            MessageToast.show(this.getText('systemDisconnectedSuccessfully'));
            await this.getKeyConfigData();
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorDisconnectingSystem'));
        } finally {
            this.getView().setBusy(false);
        }
    }

    private async disableKey(keyId: string): Promise<void> {
        this.getView().setBusy(true);
        const payload = {
            enabled: false
        } as KeyPatchPayload;
        try {
            await this.api.patch<KeyPatchPayload, Key>(`keys/${keyId}`, payload);
            MessageToast.show(this.getText('keyDisabledSuccessfully'));
            await this.getKeyConfigData();
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorDisablingKey'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    private async enableKey(keyId: string): Promise<void> {
        this.getView().setBusy(true);
        const payload = {
            enabled: true
        } as KeyPatchPayload;
        try {
            await this.api.patch<KeyPatchPayload, Key>(`keys/${keyId}`, payload);
            MessageToast.show(this.getText('keyEnabledSuccessfully'));
            await this.getKeyConfigData();
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorEnablingKey'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    private async deleteKey(keyId: string): Promise<void> {
        this.getView().setBusy(true);
        try {
            await this.api.delete(`keys/${keyId}`);
            MessageToast.show(this.getText('keyDeletedSuccessfully'));
            this.getRouter().navTo('keyConfigDetail', {
                tenantId: this.tenantId,
                keyConfigId: this.keyConfigId
            });
            await this.getKeyConfigData();
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorDeletingKey'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    private async makeKeyPrimary(key: Key): Promise<void> {
        this.getView().setBusy(true);
        const payload = {
            name: key.name,
            description: key.description,
            enabled: key.enabled,
            isPrimary: true
        }
        try {
            await this.api.patch(`keys/${key.id}`, payload);
            MessageToast.show(this.getText('keyMadePrimarySuccessfully'));
            await this.getKeyConfigData();
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorMakingKeyPrimary'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async deleteKeyConfig(): Promise<void> {
        MessageBox.confirm(this.getText('confirmKeyConfigDelete'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    this.getView().setBusy(true);
                    try {
                        await this.api.delete(`keyConfigurations/${this.keyConfigId}`);
                        MessageToast.show(this.getText('keyConfigDeletedSuccessfully'));
                        this.getRouter().navTo('keyConfigs', {
                            tenantId: this.tenantId
                        });
                    } catch (error) {
                        console.error(error);
                        MessageBox.error(this.getText('errorDeletingKeyConfig'));
                    } finally {
                        this.getView().setBusy(false);
                    }
                }
            }
        });

    }
    private resetConnectSystemModel() {
        const allSystems = this.oneWayModel.getProperty('/allSystems') as System[];
        const connectedSystems = this.oneWayModel.getProperty('/systems') as System[];
        const filteredSystems = allSystems?.filter(system =>
            !connectedSystems?.some(connectedSystem => connectedSystem.id === system.id)
        );

        this.connectSystemModel.setProperty('/systemsList', filteredSystems);
    }
    public async onSwitchKeyConfigPress(event: Button$PressEvent): Promise<void> {
        this.getView().setBusy(true);
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        const component = this.getOwnerComponent();
        const keyConfigs = await this.api.get<KeyConfigsResponse>('keyConfigurations', {});
        const filteredKeyConfigs = keyConfigs.value.filter(keyConfig => keyConfig.id !== this.keyConfigId);
        const connectedKeyConfig = this.oneWayModel.getProperty('/keyConfig') as KeyConfig;

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
            this.getView().setBusy(false);
        } else {
            this.switchKeyConfigDialog.open();
            this.getView().setBusy(false);
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
            await this.api.patch(`systems/${systemId}/link`, { keyConfigurationID: keyConfigId })
            MessageToast.show(this.getText('keyConfigConnectSystemSuccessfully'));
            this.onSwitchKeyConfigCancelPress();
        } catch (error) {
            MessageBox.error(this.getText('keyConfigConnectSystemError'));
            console.error('Error creating key', error);
        } finally {
            await this.getKeyConfigData();
            this.getView().setBusy(false);
        }
    }
    public async onCopyToClipboardPress(event: Button$PressEvent): Promise<void> {
        await copyToClipboard(event);
    }
    private setHyokProviders(): void {
        //@TODO Fetch the HYOK providers from the API when available
        //For now, we are using a static list
        const hyokProviders = [
            HYOKProviders.AWS,
            HYOKProviders.XYZ
        ];
        this.oneWayModel.setProperty('/hyokProviders', hyokProviders);
    }
}