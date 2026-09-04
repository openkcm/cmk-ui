import Fragment from 'sap/ui/core/Fragment';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Dialog from 'sap/m/Dialog';
import NavContainer from 'sap/m/NavContainer';
import Storage from 'sap/ui/util/Storage';
import { ListBase$SelectionChangeEvent } from 'sap/m/ListBase';
import { RadioButtonGroup$SelectEvent } from 'sap/m/RadioButtonGroup';
import { setLanguage } from 'kms/common/Language.Helpers';
import MessageToast from 'sap/m/MessageToast';
import MessageBox from 'sap/m/MessageBox';
import Api from 'kms/services/Api.service';
import { AxiosError } from 'axios';
import { getText, showErrorMessage } from 'kms/common/Helpers';
import View from 'sap/ui/core/mvc/View';

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

interface WorkflowSettings {
    enabled: boolean
    minimumApprovals: number
    maxApprovals: number
    defaultExpiryPeriodDays: number
    maxExpiryPeriodDays: number
    retentionPeriodDays: number
    minRetentionPeriodDays: number
    maxRetentionPeriodDays: number
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

    private onWorkflowSettingsChange(): void {
        const hasChanges = this.checkForWorkflowSettingsChanges();
        this.settingsOneWayModel.setProperty('/hasWorkflowSettingsChanges', hasChanges);
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
            const workflowSettings = await api.get<WorkflowSettings>('tenantConfigurations/workflow');
            if (workflowSettings) {
                this.originalWorkflowSettings = { ...workflowSettings };
                this.settingsWorkflowModel.setProperty('/', workflowSettings);
                this.settingsOneWayModel.setProperty('/hasWorkflowSettingsChanges', false);
                this.settingsOneWayModel.setProperty('/workflowEnabled', workflowSettings.enabled);
            }
        }
        catch (error) {
            console.error('Error fetching workflow settings:', error);
            showErrorMessage(error as AxiosError, getText('errorFetchingWorkflowSettings'));
        }
    }

    public async onSaveWorkflowSettings(): Promise<void> {
        const workflowSettings = this.settingsWorkflowModel.getData() as WorkflowSettings;

        if (workflowSettings.minimumApprovals < 2 || workflowSettings.minimumApprovals > workflowSettings.maxApprovals) {
            MessageBox.error(getText('workflowSettingsOutOfBounds', [
                getText('minimumApprovals'), String(2), String(workflowSettings.maxApprovals)
            ]));
            return;
        }
        if (workflowSettings.defaultExpiryPeriodDays < 1 || workflowSettings.defaultExpiryPeriodDays > workflowSettings.maxExpiryPeriodDays) {
            MessageBox.error(getText('workflowSettingsOutOfBounds', [
                getText('defaultExpiryPeriodDays'), String(1), String(workflowSettings.maxExpiryPeriodDays)
            ]));
            return;
        }
        if (workflowSettings.retentionPeriodDays < workflowSettings.minRetentionPeriodDays || workflowSettings.retentionPeriodDays > workflowSettings.maxRetentionPeriodDays) {
            MessageBox.error(getText('workflowSettingsOutOfBounds', [
                getText('retentionPeriodDays'), String(workflowSettings.minRetentionPeriodDays), String(workflowSettings.maxRetentionPeriodDays)
            ]));
            return;
        }

        try {
            const api = Api.getInstance();
            await api.patch<WorkflowSettings>('tenantConfigurations/workflow', {
                enabled: workflowSettings.enabled,
                minimumApprovals: workflowSettings.minimumApprovals,
                defaultExpiryPeriodDays: workflowSettings.defaultExpiryPeriodDays,
                retentionPeriodDays: workflowSettings.retentionPeriodDays
            });
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
}
