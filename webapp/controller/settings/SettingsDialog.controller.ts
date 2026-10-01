import Fragment from 'sap/ui/core/Fragment';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Dialog from 'sap/m/Dialog';
import NavContainer from 'sap/m/NavContainer';
import Popover from 'sap/m/Popover';
import Text from 'sap/m/Text';
import Control from 'sap/ui/core/Control';
import Storage from 'sap/ui/util/Storage';
import { ListBase$SelectionChangeEvent } from 'sap/m/ListBase';
import { RadioButtonGroup$SelectEvent } from 'sap/m/RadioButtonGroup';
import { setLanguage } from 'kms/common/Language.Helpers';
import MessageToast from 'sap/m/MessageToast';
import Api from 'kms/services/Api.service';
import { AxiosError } from 'axios';
import { getText, showErrorMessage } from 'kms/common/Helpers';
import View from 'sap/ui/core/mvc/View';
import { ValueState } from 'sap/ui/core/library';
import BaseEvent from 'sap/ui/base/Event';

const localStorage = new Storage(Storage.Type.local);

const languageMapping: Record<string, number> = {
    DE: 0, EN: 1, ZH: 2, FR: 3, JA: 4, PT: 5, ES: 6
};

const languageNames: Record<string, string> = {
    DE: 'German',
    EN: 'English (US)',
    ZH: 'Chinese',
    FR: 'French',
    JA: 'Japanese',
    PT: 'Portuguese',
    ES: 'Spanish'
};

const MIN_APPROVALS = 2;
const MAX_APPROVALS = 5;
const MIN_RETENTION_PERIOD_DAYS = 7;
const MAX_RETENTION_PERIOD_DAYS = 30;
const MAX_EXPIRY_PERIOD_DAYS = 7;

interface WorkflowSettings {
    enabled: boolean
    minimumApprovals: number
    defaultExpiryPeriodDays: number
    maxExpiryPeriodDays: number
    retentionPeriodDays: number
}

interface WorkflowSettingsResponse extends WorkflowSettings {
    maxApprovals: number
    maxRetentionPeriodDays: number
    minRetentionPeriodDays: number
}

interface RoleBasedAccessSettings {
    canManage: boolean
}

export default class SettingsDialogHandler {
    private view: View;
    private settingsDialog: Dialog | null = null;
    private settingsOneWayModel: JSONModel = new JSONModel({});
    private settingsWorkflowModel: JSONModel = new JSONModel({});
    private originalWorkflowSettings: WorkflowSettings | null = null;

    constructor(view: View) {
        this.view = view;
    }

    public async open(): Promise<void> {
        if (!this.settingsDialog) {
            this.settingsDialog = await Fragment.load({
                id: this.view.getId(),
                name: 'kms.resources.fragments.settings.SettingsDialog',
                controller: this
            }) as Dialog;
            this.view.addDependent(this.settingsDialog);

            this.settingsDialog.setModel(this.settingsOneWayModel, 'oneWay');
            this.settingsDialog.setModel(this.settingsWorkflowModel, 'workflow');
            this.settingsWorkflowModel.attachPropertyChange(this.onWorkflowSettingsChange.bind(this));
        }

        const currentLanguage = localStorage.get('sap-language') as string || 'EN';
        const selectedLanguage: number = languageMapping[currentLanguage];
        this.settingsOneWayModel.setProperty('/selectedLanguageIndex', selectedLanguage >= 0 ? selectedLanguage : 1);
        this.settingsOneWayModel.setProperty('/selectedLanguageName', languageNames[currentLanguage] || 'English (US)');

        this.setWorkflowSettingsEditability();
        this.setWorkflowEnabledEditability();
        await this.loadWorkflowSettingsData();

        this.settingsDialog.open();
    }

    public onCloseSettingsDialog(): void {
        this.settingsDialog?.close();
    }

    public onSettingsNavSelect(event: ListBase$SelectionChangeEvent): void {
        const selectedItem = event.getParameter('listItem');
        const selectedKey = selectedItem?.data('key') as string;

        const viewId = this.view.getId();
        if (!viewId) return;

        const navContainer = Fragment.byId(viewId, 'settingsNavContainer') as NavContainer;

        if (navContainer && selectedKey) {
            const pageId = Fragment.createId(viewId, `${selectedKey}SettingsPage`);
            navContainer.to(pageId);
        }
    }

    public onSelectedLanguageChanged(event: RadioButtonGroup$SelectEvent): void {
        this.settingsOneWayModel.setProperty('/selectedLanguageIndex', event.getParameters().selectedIndex);
    }

    public onLanguageChanged(): void {
        const selectedLanguageIndex: number = this.settingsOneWayModel.getProperty('/selectedLanguageIndex') as number;
        const selectedLanguage = Object.entries(languageMapping)
            .find(([, value]) => value === selectedLanguageIndex);
        if (!selectedLanguage) {
            throw new Error('Invalid language index');
        }
        setLanguage(selectedLanguage[0], false);
    }

    public onMinimumApprovalsChange(): void {
        this.validateAllFields();
    }

    public onExpiryPeriodChange(): void {
        this.validateAllFields();
    }

    public onRetentionPeriodChange(): void {
        this.validateAllFields();
    }

    private onWorkflowSettingsChange(): void {
        const hasChanges = this.checkForWorkflowSettingsChanges();
        this.settingsOneWayModel.setProperty('/hasWorkflowSettingsChanges', hasChanges);
        this.validateAllFields();
    }

    private validateAllFields(): void {
        const hasMinApprovalsError = this.validateMinimumApprovals();
        const hasExpiryError = this.validateExpiryPeriods();
        const hasRetentionError = this.validateRetentionPeriod();

        this.settingsOneWayModel.setProperty('/hasValidationError', hasMinApprovalsError || hasExpiryError || hasRetentionError);
    }

    private validateMinimumApprovals(): boolean {
        const currentSettings = this.settingsWorkflowModel.getData() as WorkflowSettings;
        const minimumApprovals = currentSettings.minimumApprovals;

        if (minimumApprovals < MIN_APPROVALS || minimumApprovals > MAX_APPROVALS) {
            this.settingsOneWayModel.setProperty('/minimumApprovalsValueState', ValueState.Error);
            this.settingsOneWayModel.setProperty('/minimumApprovalsValueStateText', getText('minimumApprovalsRangeError'));
            return true;
        }
        else {
            this.settingsOneWayModel.setProperty('/minimumApprovalsValueState', ValueState.None);
            this.settingsOneWayModel.setProperty('/minimumApprovalsValueStateText', '');
            return false;
        }
    }

    private validateExpiryPeriods(): boolean {
        const currentSettings = this.settingsWorkflowModel.getData() as WorkflowSettings;
        const defaultExpiry = currentSettings.defaultExpiryPeriodDays;
        const maxExpiry = currentSettings.maxExpiryPeriodDays;
        let hasError = false;

        if (maxExpiry > MAX_EXPIRY_PERIOD_DAYS) {
            this.settingsOneWayModel.setProperty('/maxExpiryValueState', ValueState.Error);
            this.settingsOneWayModel.setProperty('/maxExpiryValueStateText', getText('maxExpiryExceedsLimitError'));
            hasError = true;
        }
        else if (defaultExpiry > maxExpiry) {
            this.settingsOneWayModel.setProperty('/defaultExpiryValueState', ValueState.Error);
            this.settingsOneWayModel.setProperty('/defaultExpiryValueStateText', getText('defaultExpiryExceedsMaxError'));
            this.settingsOneWayModel.setProperty('/maxExpiryValueState', ValueState.Error);
            this.settingsOneWayModel.setProperty('/maxExpiryValueStateText', getText('maxExpiryBelowDefaultError'));
            hasError = true;
        }
        else {
            this.settingsOneWayModel.setProperty('/defaultExpiryValueState', ValueState.None);
            this.settingsOneWayModel.setProperty('/defaultExpiryValueStateText', '');
            this.settingsOneWayModel.setProperty('/maxExpiryValueState', ValueState.None);
            this.settingsOneWayModel.setProperty('/maxExpiryValueStateText', '');
        }
        return hasError;
    }

    private validateRetentionPeriod(): boolean {
        const currentSettings = this.settingsWorkflowModel.getData() as WorkflowSettings;
        const retentionPeriod = currentSettings.retentionPeriodDays;

        if (retentionPeriod < MIN_RETENTION_PERIOD_DAYS || retentionPeriod > MAX_RETENTION_PERIOD_DAYS) {
            this.settingsOneWayModel.setProperty('/retentionPeriodValueState', ValueState.Error);
            this.settingsOneWayModel.setProperty('/retentionPeriodValueStateText', getText('retentionPeriodRangeError'));
            return true;
        }
        else {
            this.settingsOneWayModel.setProperty('/retentionPeriodValueState', ValueState.None);
            this.settingsOneWayModel.setProperty('/retentionPeriodValueStateText', '');
            return false;
        }
    }

    private checkForWorkflowSettingsChanges(): boolean {
        if (!this.originalWorkflowSettings) {
            return false;
        }
        const currentSettings = this.settingsWorkflowModel.getData() as WorkflowSettings;
        return (
            currentSettings.enabled !== this.originalWorkflowSettings.enabled
            || currentSettings.minimumApprovals !== this.originalWorkflowSettings.minimumApprovals
            || currentSettings.defaultExpiryPeriodDays !== this.originalWorkflowSettings.defaultExpiryPeriodDays
            || currentSettings.maxExpiryPeriodDays !== this.originalWorkflowSettings.maxExpiryPeriodDays
            || currentSettings.retentionPeriodDays !== this.originalWorkflowSettings.retentionPeriodDays
        );
    }

    private setWorkflowSettingsEditability(): void {
        const component = this.view.getController()?.getOwnerComponent?.();
        const roleBasedAccessModel = component?.getModel('roleBasedAccess') as JSONModel;
        const settingsAccess = roleBasedAccessModel?.getProperty('/settings') as RoleBasedAccessSettings;
        const canEditWorkflowSettings = settingsAccess?.canManage ?? false;
        this.settingsOneWayModel.setProperty('/canEditWorkflowSettings', canEditWorkflowSettings);
    }

    private setWorkflowEnabledEditability(): void {
        const component = this.view.getController()?.getOwnerComponent?.();
        const selectedTenantModel = component?.getModel('selectedTenant') as JSONModel;
        const tenantRole = selectedTenantModel?.getProperty('/selectedTenantRole') as string;
        const canEditWorkflowEnabled = tenantRole === 'TEST';
        this.settingsOneWayModel.setProperty('/canEditWorkflowEnabled', canEditWorkflowEnabled);
    }

    private async loadWorkflowSettingsData(): Promise<void> {
        await this.getWorkflowSettings();
    }

    private async getWorkflowSettings(): Promise<void> {
        try {
            const api = Api.getInstance();
            const workflowSettingsResponse = await api.get<WorkflowSettingsResponse>('tenantConfigurations/workflow');
            if (workflowSettingsResponse) {
                const workflowSettings: WorkflowSettings = {
                    enabled: workflowSettingsResponse.enabled,
                    minimumApprovals: workflowSettingsResponse.minimumApprovals,
                    defaultExpiryPeriodDays: workflowSettingsResponse.defaultExpiryPeriodDays,
                    maxExpiryPeriodDays: workflowSettingsResponse.maxExpiryPeriodDays,
                    retentionPeriodDays: workflowSettingsResponse.retentionPeriodDays
                };

                this.originalWorkflowSettings = { ...workflowSettings };
                this.settingsWorkflowModel.setProperty('/', workflowSettings);
                this.settingsOneWayModel.setProperty('/hasWorkflowSettingsChanges', false);
                this.settingsOneWayModel.setProperty('/workflowEnabled', workflowSettings.enabled);
                this.resetValidationStates();
            }
        }
        catch (error) {
            console.error('Error fetching workflow settings:', error);
            showErrorMessage(error as AxiosError, getText('errorFetchingWorkflowSettings'));
        }
    }

    private resetValidationStates(): void {
        this.settingsOneWayModel.setProperty('/hasValidationError', false);
        this.settingsOneWayModel.setProperty('/minimumApprovalsValueState', ValueState.None);
        this.settingsOneWayModel.setProperty('/minimumApprovalsValueStateText', '');
        this.settingsOneWayModel.setProperty('/defaultExpiryValueState', ValueState.None);
        this.settingsOneWayModel.setProperty('/defaultExpiryValueStateText', '');
        this.settingsOneWayModel.setProperty('/maxExpiryValueState', ValueState.None);
        this.settingsOneWayModel.setProperty('/maxExpiryValueStateText', '');
        this.settingsOneWayModel.setProperty('/retentionPeriodValueState', ValueState.None);
        this.settingsOneWayModel.setProperty('/retentionPeriodValueStateText', '');
    }

    public async onSaveWorkflowSettings(): Promise<void> {
        try {
            const api = Api.getInstance();
            const workflowSettings = this.settingsWorkflowModel.getData() as WorkflowSettings;
            await api.patch<WorkflowSettings>('tenantConfigurations/workflow', workflowSettings);
            this.originalWorkflowSettings = { ...workflowSettings };
            this.settingsOneWayModel.setProperty('/hasWorkflowSettingsChanges', false);
            this.settingsOneWayModel.setProperty('/workflowEnabled', workflowSettings.enabled);
            MessageToast.show(getText('workflowSettingsSaved'));
        }
        catch (error) {
            console.error('Error saving workflow settings:', error);
            showErrorMessage(error as AxiosError, getText('workflowSettingsSaveError'));
        }
    }

    public onMinimumApprovalsInfoPress(event: BaseEvent): void {
        this.showInfoPopover(event.getSource() as unknown as Control, getText('minimumApprovalsInfoText'));
    }

    public onRetentionPeriodInfoPress(event: BaseEvent): void {
        this.showInfoPopover(event.getSource() as unknown as Control, getText('retentionPeriodInfoText'));
    }

    private showInfoPopover(source: Control, text: string): void {
        const popover = new Popover({
            placement: 'Auto',
            showHeader: false,
            contentWidth: '15rem',
            content: [new Text({ text }).addStyleClass('sapUiSmallMargin')]
        });
        this.settingsDialog?.addDependent(popover);
        popover.attachAfterClose(() => {
            popover.destroy();
        });
        popover.openBy(source);
    }
}
