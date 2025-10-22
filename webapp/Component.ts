import UIComponent from 'sap/ui/core/UIComponent';
import IllustrationPool from 'sap/m/IllustrationPool';
import Theming from 'sap/ui/core/Theming';
import { loadConfig } from './utils/Config';
import Api from './services/Api.service';
import MessageBox from 'sap/m/MessageBox';
import ResourceModel from 'sap/ui/model/resource/ResourceModel';
import Core from 'sap/ui/core/Core';
/**
 * @namespace kms
 */
export default class Component extends UIComponent {
    public static readonly metadata = {
        manifest: 'json',
        interfaces: ['sap.ui.core.IAsyncContentCreation']
    };

    public apiInitializedPromise: Promise<void>;

    public init(): void {
        void this.asyncInit();
    }

    private async asyncInit(): Promise<void> {
        super.init();

        const i18nModel = new ResourceModel({
            bundleName: 'kms.i18n.i18n'
        });
        this.setModel(i18nModel, 'i18n');
        // The method below is deprecated but there is no acceptable alternative to set a global model, so this is needed for now
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        Core.setModel(i18nModel, 'i18n');

        this.apiInitializedPromise = (async () => {
            try {
                const config = await loadConfig();
                await Api.init(config.apiBaseUrl);

                this.getRouter().initialize();
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    Theming.setTheme('sap_horizon_dark');
                }
                this.watchForThemeChanges();
                const tntSet = {
                    setFamily: 'tnt',
                    setURI: sap.ui.require.toUrl('sap/tnt/themes/base/illustrations')
                };
                IllustrationPool.registerIllustrationSet(tntSet, false, []);
            }
            catch (error) {
                const datetime = new Date().toISOString().split('.')[0];
                MessageBox.error('Failed to initialize API service. Contact an administrator with the details below if the problem persists.', {
                    title: 'Initialization Error',
                    details: `<p><strong>Error Details:</strong></p>
                          <ul>
                              <li><strong>Error Message: </strong>${JSON.stringify(error)}</li>
                              <li><strong>Timestamp (UTC): </strong>${datetime}</li>
                          </ul>`,
                    actions: [MessageBox.Action.CLOSE],
                    onClose: () => {
                        location.reload();
                    },
                    styleClass: 'sapUiUserSelectable'
                });
                throw error;
            }
        })();
        await this.apiInitializedPromise;
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
}
