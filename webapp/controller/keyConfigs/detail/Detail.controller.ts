import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import { KeyConfig } from 'kms/common/Types';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import Api from 'kms/services/Api.service';
import MessageBox from 'sap/m/MessageBox';
import Fragment from 'sap/ui/core/Fragment';
import ViewSettingsDialog from 'sap/m/ViewSettingsDialog';
import Dialog from 'sap/m/Dialog';
import NavContainer from 'sap/m/NavContainer';
import Wizard from 'sap/m/Wizard';
import Page from 'sap/m/Page';
import MessageToast from 'sap/m/MessageToast';
interface KeyConfigPatchPayload {
    name: string;
}
export default class KeyConfigDetail extends BaseController {
    private readonly api: Api = new Api();
    private filterPopover: ViewSettingsDialog | undefined;
    private readonly oneWayModel = new JSONModel({
        keyConfig: {} as KeyConfig,
        keysCount: 0 as number,
        systemsCount: 0 as number,
        edit: false as boolean
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
    private keyCreatePopover: Dialog | undefined;
    private keyCreationNavContainer: NavContainer | undefined;
    private keyCreationWizard: Wizard | undefined;
    private keyCreationWizardPage: Page | undefined;
    private keyCreationReviewPage: Page | undefined;

    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('keyConfigDetail').attachPatternMatched({}, (event: Route$PatternMatchedEvent) => this.onRouteMatched(event), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.twoWayModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.viewSettingModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.keyCreationModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.twoWayModel, 'twoWay');
        this.setModel(this.viewSettingModel, 'viewSettingModel');
        this.setModel(this.keyCreationModel, 'keyCreationModel');
    };
    private isUUIDValid(uuid: string): boolean {
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        return uuidRegex.test(uuid);
    }
    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        this.getView().setBusy(true);
        const routeArgs = event.getParameter('arguments') as { keyConfigId?: string, '?query': { createKey?: string } };
        const queryParams = routeArgs['?query'] as { createKey?: string };
        this.keyConfigId = routeArgs.keyConfigId;

        if (!this.isUUIDValid(this.keyConfigId)) {
            console.error('Key config id invalid');
            this.getRouter().navTo('keyConfigs');
            return;
        }
        this.setKeyConfigData();

        if (queryParams?.createKey === 'true') {
            this.getView().setBusy(true);
            this.handleCreateKeyRoute().then(() => {
            }).catch((error) => {
                console.error('Error handling create key route', error);
            }).finally(() => {
                this.getView().setBusy(false);
            });
        }
    }
    private async handleCreateKeyRoute(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();

        if (!this.keyCreatePopover) {
            await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.common.KeyCreationWizard',
                controller: this
            }).then((popover) => {
                this.keyCreatePopover = popover as Dialog;
                this.keyCreatePopover.addStyleClass('sapUiSizeCompact');
                this.keyCreatePopover.setModel(component.getModel('i18n'), 'i18n');
                this.keyCreatePopover.setModel(this.keyCreationModel, 'model');
                this.keyCreatePopover.open();
                this.resetKeyCreationModel()
                this.keyCreationWizard = this.byId('keyCreationWizard') as Wizard;
                this.keyCreationNavContainer = this.byId('keyCreationNavContainer') as NavContainer;
                this.keyCreationReviewPage = this.byId('keyCreationReviewPage') as Page;
                this.keyCreationWizardPage = this.byId('keyCreationWizardPage') as Page;
                this.keyCreationNavContainer?.to(this.keyCreationWizardPage);
            });
        } else {
            this.keyCreatePopover.open();
            this.resetKeyCreationModel()
            this.keyCreationNavContainer = this.byId('keyCreationNavContainer') as NavContainer;
            this.keyCreationReviewPage = this.byId('keyCreationReviewPage') as Page;
            this.keyCreationWizardPage = this.byId('keyCreationWizardPage') as Page;
            this.keyCreationNavContainer?.to(this.keyCreationWizardPage);
        }
    }
    public onKeyCreationWizardCancelPress(): void {
        MessageBox.warning(this.getText('confirmCancelKeyCreation'), {
            styleClass: 'sapUiSizeCompact',
            emphasizedAction: MessageBox.Action.NO,
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    this.keyCreatePopover?.close();
                    this.keyCreatePopover?.destroy();
                    this.keyCreatePopover = undefined;
                    this.resetKeyCreationModel();
                }
            }
        });
    }
    public async onKeyCreationWizardSubmitPress(): Promise<void> {
        const payload = {
            name: this.keyCreationModel.getProperty('/name') as string,
            description: this.keyCreationModel.getProperty('/description') as string,
            algorithm: this.keyCreationModel.getProperty('/algorithm') as string,
            region: this.keyCreationModel.getProperty('/region') as string,
            provider: this.keyCreationModel.getProperty('/provider') as string,
            enabled: this.keyCreationModel.getProperty('/enabled') as boolean
        }
        try {
            await this.api.post('keys', payload);
            MessageToast.show(this.getText('keyCreatedSuccessfully'));
            this.keyCreatePopover?.close();
            this.keyCreatePopover?.destroy();
            this.keyCreatePopover = undefined;
            this.resetKeyCreationModel();
            this.setKeyConfigData()
        } catch (error) {
            MessageBox.error(this.getText('errorCreatingKey'));
            console.error('Error creating key', error);
        } finally {
            this.getView().setBusy(false);
        }
    }
    public onKeyCreateNameChanged(): void {
        const keyName = this.keyCreationModel.getProperty('/name') as string;
        if (!keyName || keyName.length < 2) {
            this.keyCreationModel.setProperty('/keyNameValueState', 'Error');
            this.keyCreationModel.setProperty('/keyNameValueStateText', this.getText('keyNameRequired'));
            this.keyCreationModel.setProperty('/detailsStepValid', false);
        } else {
            this.keyCreationModel.setProperty('/keyNameValueState', 'None');
            this.keyCreationModel.setProperty('/keyNameValueStateText', '');
            this.keyCreationModel.setProperty('/detailsStepValid', true);
        }
    }
    public onKeyCreateRegionChanged(): void {
        const region = this.keyCreationModel.getProperty('/region') as string;
        if (region === '') {
            this.keyCreationModel.setProperty('/keyRegionStepValid', false);
        } else {
            const regionList = this.keyCreationModel.getProperty('/regionList') as { key: string, text: string, provider: string }[];
            const selectedRegion = regionList.find(item => item.key === region);
            this.keyCreationModel.setProperty('/provider', selectedRegion?.provider);
            this.keyCreationModel.setProperty('/keyRegionStepValid', true);
        }
    }
    public onKeyCreationWizardComplete(): void {
        const detailsStepValid = this.keyCreationModel.getProperty('/detailsStepValid') as boolean;
        const keyTypeStepValid = this.keyCreationModel.getProperty('/keyTypeStepValid') as boolean;
        const keyRegionStepValid = this.keyCreationModel.getProperty('/keyRegionStepValid') as boolean;

        if (detailsStepValid && keyTypeStepValid && keyRegionStepValid) {
            this.keyCreationModel.setProperty('/createKeyEnabled', true);
            this.keyCreationNavContainer?.to(this.keyCreationReviewPage);
        } else {
            this.keyCreationModel.setProperty('/createKeyEnabled', false);
        }
    }
    public onNavBackToStepPress(stepNumber: number): void {
        const fnAfterNavigate = function (this: KeyConfigDetail) {
            this.keyCreationWizard.goToStep(this.keyCreationWizard.getSteps()[stepNumber], true);
            this.keyCreationNavContainer.detachAfterNavigate(fnAfterNavigate);
        }.bind(this);

        this.keyCreationNavContainer.attachAfterNavigate(fnAfterNavigate);
        this.keyCreationNavContainer.backToPage(this.keyCreationWizardPage.getId());
    }
    private setKeyConfigData() {
        this.getKeyConfigData().then((keyConfigs) => {
            if (!keyConfigs) {
                return;
            }
            interface KeyConfigsResponse {
                data: KeyConfig[];
                count: number;
            }
            const keyConfigsResponse = keyConfigs as unknown as KeyConfigsResponse;
            const keyConfigsData = keyConfigsResponse.data;
            this.oneWayModel.setProperty('/keyConfig', keyConfigsData[0]);
            this.oneWayModel.setProperty('/keysCount', keyConfigsData[0]?.keys?.length);
            this.oneWayModel.setProperty('/systemsCount', keyConfigsData[0]?.systems?.length);
            this.twoWayModel.setProperty('/keyConfig', keyConfigsData[0]);
        }).catch((error) => {
            console.error('Error parsing key config', error);
        }).finally(() => {
            this.getView().setBusy(false);
        });
    }
    private async getKeyConfigData() {
        try {
            const keyConfigs = await this.api.get<KeyConfig[]>('keyConfig', { id: this.keyConfigId });
            return keyConfigs;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingKeyConfigDetails'));
        }
    }
    private async patchKeyConfigData(keyConfig: KeyConfigPatchPayload) {
        try {
            const keyConfigs = await this.api.patch<KeyConfigPatchPayload, KeyConfig>('keyConfig', keyConfig);
            return keyConfigs;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorPatchingKeyConfigDetails'));
        }
    }
    public onEditDetailsPress(): void {
        this.oneWayModel.setProperty('/edit', true);
    }
    public onCancelEditPress(): void {
        this.oneWayModel.setProperty('/edit', false);
    }
    public onSaveKeyConfigPress(): void {
        this.getView().setBusy(true);
        const keyConfig = this.twoWayModel.getProperty('/keyConfig') as KeyConfig;
        const payload = {
            id: keyConfig.id,
            name: keyConfig.name
        } as KeyConfigPatchPayload;

        this.patchKeyConfigData(payload).then(() => {
            this.setKeyConfigData();
            this.onCancelEditPress();
        }).catch((error) => {
            console.error('Error patching key config', error);
        }).finally(() => {
            this.getView().setBusy(false);
        });
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
            await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.common.TableSorter',
                controller: this
            }).then((dialog) => {
                this.filterPopover = dialog as ViewSettingsDialog;
                this.filterPopover.addStyleClass('sapUiSizeCompact');
                this.filterPopover.setModel(component.getModel('i18n'), 'i18n');
                this.filterPopover.setModel(this.viewSettingModel, 'viewSettingModel');
                this.filterPopover.open();
            });
        } else {
            this.filterPopover.open();
        }
    }
    private resetKeyCreationModel() {
        this.keyCreationModel.setData({
            name: '' as string,
            description: '' as string,
            algorithm: 'AES256' as string,
            region: '' as string,
            regionList: [
                { key: '', text: 'Select Region', provider: this.Enums.CloudProviders.AWS },
                { key: 'us-east-1', text: 'US East (N. Virginia)', provider: this.Enums.CloudProviders.AWS },
                { key: 'us-east-2', text: 'US East (Ohio)', provider: this.Enums.CloudProviders.AWS },
                { key: 'us-west-1', text: 'US West (N. California)', provider: this.Enums.CloudProviders.AWS },
                { key: 'us-west-2', text: 'US West (Oregon)', provider: this.Enums.CloudProviders.AWS }
            ] as object[],
            provider: '' as string,
            enabled: true as boolean,
            detailsStepValid: false as boolean,
            keyTypeStepValid: true as boolean,
            keyRegionStepValid: false as boolean,
            keyNameValueState: 'None' as string,
            keyNameValueStateText: '' as string,
            createKeyEnabled: false as boolean
        }, true);
    }
}