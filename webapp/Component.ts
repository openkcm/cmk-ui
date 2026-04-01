import UIComponent from 'sap/ui/core/UIComponent';
import JSONModel from 'sap/ui/model/json/JSONModel';
import IllustrationPool from 'sap/m/IllustrationPool';
import Theming from 'sap/ui/core/Theming';
import { loadConfig, loadYAMLConfig } from './utils/Config';
import * as yaml from 'js-yaml';
import Api, { ApiAccessError } from './services/Api.service';
import Ora from './services/Ora.service';
import ResourceModel from 'sap/ui/model/resource/ResourceModel';
import Core from 'sap/ui/core/Core';
import Auth from './services/Auth.service';
import { initLanguageConfig } from 'kms/common/Language.Helpers';
import { RoleBasedAccessData, TenantsList, UserData } from './common/Types';
import { UserRoles } from './common/Enums';
import SplashScreen from './utils/SplashScreen';
import ForbiddenStateService from './utils/ForbiddenState';
import ResourceBundle from 'sap/base/i18n/ResourceBundle';
/**
 * @namespace kms
 */
export default class Component extends UIComponent {
    public static readonly metadata = {
        manifest: 'json',
        interfaces: ['sap.ui.core.IAsyncContentCreation']
    };

    private initialSetupPromise: Promise<void>;
    private forbiddenService: ForbiddenStateService;

    public init(): void {
        this.forbiddenService = ForbiddenStateService.getInstance();
        this.setModel(this.forbiddenService.getModel(), 'forbidden');

        this.initialSetupPromise = this.doGlobalSetup();
        super.init();
    }

    private async doGlobalSetup(): Promise<void> {
        const i18nModel = new ResourceModel({
            bundleName: 'kms.i18n.i18n'
        });
        this.setModel(i18nModel, 'i18n');
        // The method below is deprecated but there is no acceptable alternative to set a global model, so this is needed for now
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        Core.setModel(i18nModel, 'i18n');
        initLanguageConfig();
        try {
            const config = await loadConfig();
            Auth.init(config.apiBaseUrl);
            Api.init(config.apiBaseUrl);
            const api = Api.getInstance();

            const yamlText = await loadYAMLConfig();
            const doc = yaml.load(yamlText);
            Ora.init(doc as object);

            const currentUrl = window.location.hash;
            const tenantIdMatch = /#\/([^/]+)/.exec(currentUrl);
            const tenantId = tenantIdMatch?.[1];

            if (!tenantId) {
                console.error('No tenant ID found in URL. Cannot start the application.');
                this.showSplashScreenError('errorNoTenantSelected');
                return;
            }
            Api.updateTenantId(tenantId);

            let tenantsResponse, userInfo;
            try {
                [tenantsResponse, userInfo] = await Promise.all([
                    api.getTenantsForTenant(),
                    api.get<UserData>('userInfo')
                ]);
            }
            catch (error) {
                // the error is thrown to and handled in the outer catch block
                console.error('Error during initial tenant and user setup');
                throw error;
            }

            if (!userInfo) {
                console.error('Failed to fetch user information.');
                return;
            }
            if (!tenantsResponse?.value || tenantsResponse.value.length === 0) {
                console.error('No tenants found for this user.');
                return;
            }
            const tenants = tenantsResponse?.value;

            this.setGlobalModel(tenants ?? [], tenantId, userInfo);

            this.setInitialTheme();
            this.registerIllustrationSet();
            SplashScreen.hide();
        }
        catch (error) {
            console.error('Initialization error:', error);
            // If forbidden state was set (e.g. 403 during init), hide splash and throw error.
            // Let App.controller catch block handle the navigation after router is initialized
            if (this.forbiddenService.isForbidden()) {
                SplashScreen.hide();
                throw error;
            }

            if (error instanceof ApiAccessError) {
                this.showSplashScreenError(error.message);
            }
            else {
                this.showSplashScreenError('errorAppInitializationFail');
            }
            throw error;
        }
    }

    public getInitialSetupFinishedPromise(): Promise<void> {
        return this.initialSetupPromise;
    }

    private setGlobalModel(tenants: TenantsList[], selectedTenantId: string, userInfo: UserData) {
        const selectedTenant = tenants?.find(tenant => tenant.id === selectedTenantId);

        this.setModel(new JSONModel(userInfo), 'userInfo');
        this.setModel(new JSONModel({ tenants }), 'tenants');
        this.setModel(new JSONModel({
            selectedKey: '',
            selectedTenant: selectedTenantId,
            selectedTenantName: selectedTenant?.name || ''
        }), 'selectedTenant');
        const roleBasedAccessModelData: RoleBasedAccessData = {
            keyConfig: {
                canView: this.hasRole(userInfo, UserRoles.TENANT_AUDITOR) || this.hasRole(userInfo, UserRoles.KEY_ADMINISTRATOR),
                canManage: this.hasRole(userInfo, UserRoles.KEY_ADMINISTRATOR)
            },
            systems: {
                canView: this.hasRole(userInfo, UserRoles.TENANT_AUDITOR) || this.hasRole(userInfo, UserRoles.KEY_ADMINISTRATOR),
                canManage: this.hasRole(userInfo, UserRoles.KEY_ADMINISTRATOR)
            },
            tasks: {
                canView: this.hasRole(userInfo, UserRoles.TENANT_AUDITOR) || this.hasRole(userInfo, UserRoles.KEY_ADMINISTRATOR),
                canManage: this.hasRole(userInfo, UserRoles.KEY_ADMINISTRATOR)
            },
            userGroups: {
                canView: this.hasRole(userInfo, UserRoles.TENANT_AUDITOR) || this.hasRole(userInfo, UserRoles.KEY_ADMINISTRATOR) || this.hasRole(userInfo, UserRoles.TENANT_ADMINISTRATOR),
                canManage: this.hasRole(userInfo, UserRoles.TENANT_ADMINISTRATOR)
            },
            settings: {
                canView: this.hasRole(userInfo, UserRoles.TENANT_AUDITOR) || this.hasRole(userInfo, UserRoles.KEY_ADMINISTRATOR) || this.hasRole(userInfo, UserRoles.TENANT_ADMINISTRATOR),
                canManage: this.hasRole(userInfo, UserRoles.TENANT_ADMINISTRATOR)
            }
        };
        const roleBasedAccessModel = new JSONModel(roleBasedAccessModelData);
        this.setModel(roleBasedAccessModel, 'roleBasedAccess');
    }

    private hasRole(userInfo: UserData, role: string): boolean {
        return userInfo?.role === role;
    }

    private watchForThemeChanges() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
            const newColorScheme = event.matches ? 'dark' : 'light';
            if (newColorScheme === 'dark') {
                Theming.setTheme('sap_horizon_dark');
            }
            else if (newColorScheme === 'light') {
                Theming.setTheme('sap_horizon');
            }
        });
    }

    public _currentRoute: { name: string } | undefined;

    private setInitialTheme() {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            Theming.setTheme('sap_horizon_dark');
        }
        this.watchForThemeChanges();
    }

    private registerIllustrationSet() {
        const tntSet = {
            setFamily: 'tnt',
            setURI: sap.ui.require.toUrl('sap/tnt/themes/base/illustrations')
        };
        IllustrationPool.registerIllustrationSet(tntSet, false, []);
    }

    private showSplashScreenError(errorMessageI8nKey: string) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const i18nModel = Core.getModel('i18n') as ResourceModel;
        const resourceBundle = i18nModel?.getResourceBundle() as ResourceBundle;
        const errorMessage = resourceBundle?.getText(errorMessageI8nKey);
        SplashScreen.showError(errorMessage || 'Something went wrong. Try again later');
    }
}
