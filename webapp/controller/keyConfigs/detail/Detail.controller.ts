import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import { KeyConfig, Key, System, MangedKeyPayload, HyokKeyPayload, KeystoreResponse } from 'kms/common/Types';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import Api from 'kms/services/Api.service';
import MessageBox from 'sap/m/MessageBox';
import Fragment from 'sap/ui/core/Fragment';
import ViewSettingsDialog from 'sap/m/ViewSettingsDialog';
import Dialog from 'sap/m/Dialog';
import MessageToast from 'sap/m/MessageToast';
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
import { isUUIDValid, copyToClipboard, showErrorMessage } from 'kms/common/Helpers';
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
import HyokKeyRegistration from 'kms/component/HyokKeyCreation';
import { AxiosError } from 'axios';
import { zipSync, strToU8 } from 'fflate';

interface KeyConfigPatchPayload {
    name: string
}
interface KeyResponse {
    value: Key[] | undefined
    count: number | undefined
}

interface SystemsResponse {
    value: System[] | undefined
    count: number | undefined
}
interface TagsResponse {
    value: string[] | undefined
    count: number | undefined
}
interface KeyPatchPayload {
    name: string
    description: string
    enabled: boolean
}
interface KeyConfigsResponse {
    value: KeyConfig[]
    count: number
}
interface KeyCreationParams {
    keyConfigId: string
    keyType: KeyCreationTypes
    keySubtype: HYOKProviders | BYOKProviders
}
/**
 * @namespace kms
 */
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
        currentTable: 'keys' as string
    });

    private readonly twoWayModel = new JSONModel({
        keyConfig: {} as KeyConfig
    });

    private keyConfigId: string;
    private readonly keyCreationModel = new JSONModel({});
    private readonly connectSystemModel = new JSONModel({});
    private connectSystemPopover: Dialog | undefined;
    private readonly switchKeyConfigModel = new JSONModel({});
    private readonly importKeyModel = new JSONModel({});
    private switchKeyConfigDialog: Dialog | undefined;
    private importKeyDialog: Dialog | undefined;
    private eventBus = EventBus.getInstance();
    private top: number;
    private keysSkip: number;
    private systemsSkip: number;
    private keysCurrentPage: number;
    private systemsCurrentPage: number;
    private readonly keysPaginationModel = new JSONModel({});
    private readonly systemsPaginationModel = new JSONModel({});

    public onInit(): void {
        super.onInit();
        this.top = 10;
        this.keysSkip = 0;
        this.systemsSkip = 0;
        this.keysCurrentPage = 1;
        this.systemsCurrentPage = 1;

        this.eventBus.subscribe(EventChannelIds.KEYCONFIG, EventIDs.LOAD_KEY_CONFIG_DETAILS, (channelId, eventId, data) => {
            this.onDetailPanelRouteEventTriggered(channelId as EventChannelIds, eventId as EventIDs, data as { keyConfigId: string, tenantId: string });
        }, this);
        this.getRouter().getRoute('keyConfigDetail')?.attachPatternMatched({}, (event: Route$PatternMatchedEvent) => {
            this.onRouteMatched(event);
        }, this);
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

    public onDetailPanelRouteEventTriggered(channelId: EventChannelIds, eventId: EventIDs, data: { keyConfigId: string, tenantId: string }): void {
        this.oneWayModel.setProperty('/keyConfigDetail', true);
        if (channelId === EventChannelIds.KEYCONFIG && eventId === EventIDs.LOAD_KEY_CONFIG_DETAILS) {
            this.keyConfigId = data.keyConfigId;
            this.api = Api.getInstance();
            this.getKeyConfigData().catch((error: unknown) => {
                console.error(error);
            });
        }
    }

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        this.getView()?.setBusy(true);
        this.resetPagination();
        const routeName = event.getParameter('name');
        this.oneWayModel.setProperty('/keyConfigDetail', routeName === 'keyConfigDetail');
        this.setHyokProviders();
        const routeArgs = event.getParameter('arguments') as { 'tenantId': string, 'keyConfigId'?: string, '?query': { connectSystem?: string, createKey?: string, keyType?: KeyCreationTypes, keySubtype?: HYOKProviders | BYOKProviders } };
        const queryParams = routeArgs['?query'] as { connectSystem?: string, createKey?: string, keyType?: KeyCreationTypes, keySubtype?: HYOKProviders | BYOKProviders };
        this.keyConfigId = routeArgs.keyConfigId || '';

        this.api = Api.getInstance();
        this.tenantId = routeArgs?.tenantId;

        if (!isUUIDValid(this.keyConfigId)) {
            console.error('Key config id invalid');
            this.getRouter().navTo('keyConfigs', {
                tenantId: this.tenantId
            });
            return;
        }
        this.getKeyConfigData().catch((error: unknown) => {
            console.error(error);
        });

        if (queryParams?.createKey === 'true') {
            const type = queryParams?.keyType || KeyCreationTypes.SYSTEM_MANAGED;
            const subtype = queryParams?.keySubtype;
            this.getView()?.setBusy(true);
            this.handleCreateKeyRoute(type, subtype);
        }
        else if (queryParams?.connectSystem === 'true') {
            this.getView()?.setBusy(true);
            this.onConnectSystemPress().catch((error: unknown) => {
                console.error(error);
            });
        }
    }

    public async onConnectSystemPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();
        if (!view || !component) {
            console.error('View or component is undefined');
            return;
        }
        if (!this.connectSystemPopover) {
            this.connectSystemPopover = await Fragment.load({
                id: view?.getId() || '',
                name: 'kms.resources.fragments.common.ConnectSystems',
                controller: this
            }) as Dialog;
            this.connectSystemPopover.addStyleClass('sapUiSizeCompact');
            this.connectSystemPopover.setModel(component.getModel('i18n'), 'i18n');
            this.connectSystemPopover.setModel(this.connectSystemModel, 'model');
            this.connectSystemPopover.open();
            this.resetConnectSystemModel();
        }
        else {
            this.connectSystemPopover.open();
            this.resetConnectSystemModel();
        }
    }

    public handleCreateKeyRoute(keyType: KeyCreationTypes, keySubtype?: HYOKProviders | BYOKProviders): void {
        const component = this.getOwnerComponent();
        const i18nModel = component?.getModel('i18n');
        if (!i18nModel) {
            console.error('i18n model is undefined');
            return;
        }

        const keyParams = {
            keyConfigId: this.keyConfigId,
            keyType,
            keySubtype
        } as KeyCreationParams;
        const createKey = async (payload: MangedKeyPayload | HyokKeyPayload) => {
            await this.api.post('keys', payload);
            MessageToast.show(this.getText('keyCreatedSuccessfully'));
            this.getKeyConfigData().catch((error: unknown) => {
                console.error(error);
            });
        };
        switch (keyType) {
            case KeyCreationTypes.SYSTEM_MANAGED:
            case KeyCreationTypes.BYOK: {
                const keyCreatePopover = new KeyCreation('keyCreatePopover');
                keyCreatePopover.openKeyCreationWizard(keyParams, this, createKey);
                break;
            }
            case KeyCreationTypes.HYOK: {
                const keyCreatePopover = new HyokKeyRegistration('hyokRegistrationPopover');
                keyCreatePopover.openHyokKeyCreationWizard(keyParams, this, this.api, createKey);
                break;
            }
            default: {
                console.error('Invalid key type');
                return;
            }
        }
    }

    public onConnectSystemsCancelPress(): void {
        this.connectSystemPopover?.destroy();
        this.connectSystemPopover = undefined;
        this.resetConnectSystemModel();
    }

    public async onConnectSystemsConfirmPress(event: SelectDialog$ConfirmEvent): Promise<void> {
        const systems = event.getParameter('selectedContexts') as Context[];
        const selectedSystemIds = systems.map(system => (system.getObject() as System).id);
        if (selectedSystemIds.length === 0) {
            MessageToast.show(this.getText('noChangesWereMade'));
            return;
        }
        const patchPromises: Promise<void>[] = [];
        selectedSystemIds.forEach((systemId) => {
            patchPromises.push(this.api.patch(`systems/${systemId}/link`, { keyConfigurationID: this.keyConfigId }));
        });
        this.getView()?.setBusy(true);
        try {
            await Promise.all(patchPromises);
            MessageToast.show(this.getText('systemsConnectedSuccessfully'));
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorConnectingSystems'));
        }
        finally {
            await this.getKeyConfigData();
            this.getView()?.setBusy(false);
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
        this.getView()?.setBusy(true);
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
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingKeyConfigDetails'));
        }
        finally {
            this.getView()?.setBusy(false);
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
        this.keysCurrentPage = 1;
        this.keysSkip = 0;
        this.keysPaginationModel.setProperty('/currentPage', this.keysCurrentPage);
        this.systemsCurrentPage = 1;
        this.systemsSkip = 0;
        this.systemsPaginationModel.setProperty('/currentPage', this.systemsCurrentPage);
    }

    private async updateKeysTable() {
        this.oneWayModel.setProperty('/keysTableUpdating', true);
        const keys = await this.getKeys();
        const keystoreSettings = await this.getkeystoreSettings();
        this.oneWayModel.setProperty('/keystoreSettings', keystoreSettings);
        this.oneWayModel.setProperty('/keys', keys?.value);
        this.oneWayModel.setProperty('/keysCount', keys?.count || 0);
        this.keysPaginationModel.setProperty('/totalPages', Math.ceil((keys?.count ?? 0) / this.top));
        this.keysPaginationModel.setProperty('/currentPage', this.keysCurrentPage);
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
        this.systemsPaginationModel.setProperty('/totalPages', Math.ceil((connectedSystems?.count ?? 0) / this.top));
        this.systemsPaginationModel.setProperty('/currentPage', this.systemsCurrentPage);
        this.oneWayModel.setProperty('/allSystemsCount', allSystems?.count || 0);
        this.oneWayModel.setProperty('/systemsTableUpdating', false);
    }

    private async getKeys() {
        try {
            return await this.api.get<KeyResponse>('keys', { keyConfigurationID: this.keyConfigId, $top: this.top, $skip: this.keysSkip });
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingKeyDetails'));
        }
    }

    private async getkeystoreSettings() {
        try {
            return await this.api.get<KeystoreResponse>('tenants/keystores');
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingKeystoreDetails'));
        }
    }

    private async getConnectedSystems() {
        try {
            return await this.api.get<KeyResponse>('systems', { keyConfigurationID: this.keyConfigId, $top: this.top, $skip: this.systemsSkip });
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingSystems'));
        }
    }

    private async getAllSystems() {
        try {
            return await this.api.get<SystemsResponse>('systems');
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingSystems'));
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
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingTags'));
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
        };
        try {
            await this.api.put(`keyConfigurations/${this.keyConfigId}/tags`, payload);
            MessageToast.show(this.getText('tagsUpdatedSuccessfully'));
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorUpdatingTags'));
            const tags = await this.getTags();
            this.oneWayModel.setProperty('/tags', tags?.value || []);
        }
    }

    private async patchKeyConfigData(keyConfig: KeyConfigPatchPayload) {
        try {
            const keyConfigs = await this.api.patch<KeyConfig>(`keyConfigurations/${this.keyConfigId}`, keyConfig);
            MessageToast.show(this.getText('keyConfigSaved'));
            return keyConfigs;
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorPatchingKeyConfigDetails'));
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
        this.getView()?.setBusy(true);
        const keyConfig = this.twoWayModel.getProperty('/keyConfig') as KeyConfig;
        const payload = {
            name: keyConfig.name
        } as KeyConfigPatchPayload;

        try {
            await this.patchKeyConfigData(payload);
            await this.getKeyConfigData();
            await this.onCancelEditPress();
        }
        catch (error) {
            console.error('Error patching key config', error);
            showErrorMessage(error as AxiosError, this.getText('errorPatchingKeyConfigDetails'));
        }
        finally {
            this.getView()?.setBusy(false);
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
        // @TODO Implement sorting for keys table when API is ready
    }

    public onSystemsTableSortApply(): void {
        // @TODO Implement sorting for systems table when API is ready
    }

    public async onKeysTableSortPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();
        if (!view || !component) {
            console.error('View or component is undefined');
            return;
        }
        const columns = [
            { key: 'name', text: this.getText('name') },
            { key: 'createdOn', text: this.getText('createdOn') },
            { key: 'state', text: this.getText('state') }
        ];
        this.viewSettingModel.setProperty('/sortColumns', columns);
        this.viewSettingModel.setProperty('/currentTable', 'keys');
        if (!this.filterPopover) {
            this.filterPopover = await Fragment.load({
                id: view?.getId() || '',
                name: 'kms.resources.fragments.common.TableSorter',
                controller: this
            }) as ViewSettingsDialog;
            this.filterPopover.addStyleClass('sapUiSizeCompact');
            this.filterPopover.setModel(component.getModel('i18n'), 'i18n');
            this.filterPopover.setModel(this.viewSettingModel, 'viewSettingModel');
            this.filterPopover.open();
        }
        else {
            this.filterPopover.open();
        }
    }

    public onKeyTableRowPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
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
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
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

    public async onBYOKDownloadPress(event: Button$PressEvent) {
        const path = event?.getSource()?.getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        await this.downloadBYOKkey(selectedKey);
    }

    public async onBYOKImportPress(event: Button$PressEvent): Promise<void> {
        this.getView()?.setBusy(true);
        const path = event?.getSource()?.getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
        const component = this.getOwnerComponent();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        const importParams = await this.getWrappingParams(selectedKey);

        this.oneWayModel.setProperty('/selectedKey', selectedKey);
        const view = this.getView();

        if (!this.importKeyDialog) {
            this.importKeyDialog = await Fragment.load({
                id: view?.getId(),
                name: 'kms.resources.fragments.common.ImportKey',
                controller: this
            }) as Dialog;
            this.importKeyDialog.addStyleClass('sapUiSizeCompact');
            if (component) {
                this.importKeyDialog.setModel(component.getModel('i18n'), 'i18n');
            }
            else {
                console.error('Component is undefined');
            }
            this.importKeyModel.setData(selectedKey);
            this.importKeyDialog.setModel(this.importKeyModel, 'importKeyModel');
            this.importKeyModel.setProperty('/wrappingAlgorithm', importParams.wrappingAlgorithm);
            this.resetImportKeyModel();
            this.importKeyDialog.open();
            this.getView()?.setBusy(false);
        }
        else {
            this.importKeyDialog.open();
            this.getView()?.setBusy(false);
        }
    }

    public resetImportKeyModel(): void {
        this.importKeyModel.setData({
            keyMaterial: '' as string
        }, true);
    };

    public onMaterialUpload(event: { getParameter: (param: string) => File[] }): void {
        const file = event?.getParameter('files')?.[0];

        if (file && window.FileReader) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const keyMaterial = e.target?.result as string;
                const key = this._parsePEMKey(keyMaterial);
                this.importKeyModel.setProperty('/keyMaterial', key);
            };
            reader.onerror = (e) => {
                console.error('Error reading file:', e);
                MessageBox.error(this.getText('errorReadingFile'));
            };
            reader.readAsText(file);
        }
        else {
            console.error('No file selected or FileReader not supported.');
            MessageBox.error(this.getText('errorNoFileSelected'));
        }
    }

    public _parsePEMKey(keyMaterial: string): string {
        // Removes key armor (if present).
        keyMaterial = keyMaterial.replace(/^(.*)-----BEGIN.*$/m, '');
        keyMaterial = keyMaterial.replace(/^(.*)-----END.*$/m, '');
        // Removes line breaks spaces from base64 encoding
        return keyMaterial.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s/g, '');
    }

    public async onImportKeySubmitPress(): Promise<void> {
        const selectedKey = this.oneWayModel.getProperty('/selectedKey') as Key;
        const keyMaterial = this.importKeyModel.getProperty('/keyMaterial') as string;
        const payload = {
            wrappedKeyMaterial: keyMaterial
        };
        try {
            await this.api.post(`keys/${selectedKey.id}/importKeyMaterial`, payload);
            MessageToast.show(this.getText('keyImportedSuccessfully'));
        }
        catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorImportingKey'));
        }
        finally {
            this.onImportKeyCancelPress();
            await this.getKeyConfigData();
        }
    }

    public onImportKeyCancelPress(): void {
        this.importKeyDialog?.close();
        this.importKeyDialog?.destroy();
        this.importKeyDialog = undefined;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async onKeyTableDeletePress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        if (selectedKey?.isPrimary) {
            if (this.oneWayModel.getProperty('/systemsCount') > 0) {
                MessageBox.error(this.getText('errorDeletingPrimaryKeyWithSystems'));
                return;
            }
        }
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
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
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
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
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
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
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
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
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
        this.getView()?.setBusy(true);
        try {
            await this.api.delete(`systems/${systemsID}/link`);
            MessageToast.show(this.getText('systemDisconnectedSuccessfully'));
            await this.getKeyConfigData();
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorDisconnectingSystem'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    private async disableKey(keyId: string): Promise<void> {
        this.getView()?.setBusy(true);
        const payload = {
            enabled: false
        } as KeyPatchPayload;
        try {
            await this.api.patch<Key>(`keys/${keyId}`, payload);
            MessageToast.show(this.getText('keyDisabledSuccessfully'));
            await this.getKeyConfigData();
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorDisablingKey'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    private async enableKey(keyId: string): Promise<void> {
        this.getView()?.setBusy(true);
        const payload = {
            enabled: true
        } as KeyPatchPayload;
        try {
            await this.api.patch<Key>(`keys/${keyId}`, payload);
            MessageToast.show(this.getText('keyEnabledSuccessfully'));
            await this.getKeyConfigData();
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorEnablingKey'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    private async deleteKey(keyId: string): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            await this.api.delete(`keys/${keyId}`);
            MessageToast.show(this.getText('keyDeletedSuccessfully'));
            this.getRouter().navTo('keyConfigDetail', {
                tenantId: this.tenantId,
                keyConfigId: this.keyConfigId
            });
            await this.getKeyConfigData();
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorDeletingKey'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    private async downloadBYOKkey(key: Key): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            const importParams = await this.getWrappingParams(key);
            this._downloadPublicKeyFile({
                publicKey: importParams.publicKey,
                wrappingAlgorithm: importParams.wrappingAlgorithm as { name: string, hashFunction: string }
            }, key);
            MessageToast.show(this.getText('keyDownloadedSuccessfully'));
        }
        catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorDownloadingKey'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    private _downloadPublicKeyFile(content: { publicKey: string, wrappingAlgorithm: { name: string, hashFunction: string } }, key: Key): void {
        const keyId = key.id || 'unknown';
        const keyType = key.algorithm || 'unknown';

        const wrappingAlgorithmText
            = `KeyID: ${keyId}
            Wrapping Key Size: ${keyType}
            Wrapping Algorithm: ${content.wrappingAlgorithm.name}
            Hash Algorithm: ${content.wrappingAlgorithm.hashFunction}`;

        const files: Record<string, Uint8Array> = {
            'publickey.pem': strToU8(content.publicKey),
            'README.txt': strToU8(wrappingAlgorithmText)
        };

        try {
            const zipData = zipSync(files);
            const blob = new Blob([new Uint8Array(zipData)], { type: 'application/zip' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `WrappingPublicKeyFor-${keyId}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);
        }
        catch (error) {
            console.error('Error generating ZIP file:', error);
            MessageBox.error(this.getText('errorGeneratingZipFile'));
        }
    }

    private async getWrappingParams(key: Key): Promise<{ publicKey: string, wrappingAlgorithm: object }> {
        const importParams = await this.api.get<{ publicKey: string, wrappingAlgorithm: object }>(`keys/${key.id}/importParams`);
        return importParams;
    }

    private async makeKeyPrimary(key: Key): Promise<void> {
        this.getView()?.setBusy(true);
        const payload = {
            name: key.name,
            description: key.description,
            enabled: key.enabled,
            isPrimary: true
        };
        try {
            await this.api.patch(`keys/${key.id}`, payload);
            MessageToast.show(this.getText('keyMadePrimarySuccessfully'));
            await this.getKeyConfigData();
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorMakingKeyPrimary'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async deleteKeyConfig(): Promise<void> {
        if (this.oneWayModel.getProperty('/systemsCount') > 0) {
            MessageBox.error(this.getText('errorDeletingKeyConfigWithSystems'));
            return;
        }
        MessageBox.confirm(this.getText('confirmKeyConfigDelete'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    this.getView()?.setBusy(true);
                    try {
                        await this.api.delete(`keyConfigurations/${this.keyConfigId}`);
                        MessageToast.show(this.getText('keyConfigDeletedSuccessfully'));
                        this.getRouter().navTo('keyConfigs', {
                            tenantId: this.tenantId
                        });
                    }
                    catch (error) {
                        console.error(error);
                        showErrorMessage(error as AxiosError, this.getText('errorDeletingKeyConfig'));
                    }
                    finally {
                        this.getView()?.setBusy(false);
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
        this.getView()?.setBusy(true);
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        const component = this.getOwnerComponent();
        if (!path || !component) {
            console.error('Path or component is undefined');
            this.getView()?.setBusy(false);
            return;
        }
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
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
            this.getView()?.setBusy(false);
        }
        else {
            this.switchKeyConfigDialog.open();
            this.getView()?.setBusy(false);
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
            MessageToast.show(this.getText('keyConfigConnectSystemSuccessfully'));
            this.onSwitchKeyConfigCancelPress();
        }
        catch (error) {
            showErrorMessage(error as AxiosError, this.getText('keyConfigConnectSystemError'));
            console.error('Error creating key', error);
        }
        finally {
            await this.getKeyConfigData();
            this.getView()?.setBusy(false);
        }
    }

    public async onCopyToClipboardPress(event: Button$PressEvent): Promise<void> {
        await copyToClipboard(event);
    }

    private setHyokProviders(): void {
        // @TODO Fetch the HYOK providers from the API when available
        // For now, we are using a static list
        const hyokProviders = [
            HYOKProviders.AWS
        ];
        this.oneWayModel.setProperty('/hyokProviders', hyokProviders);
    }
}
