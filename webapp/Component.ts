import UIComponent from 'sap/ui/core/UIComponent';
import IllustrationPool from 'sap/m/IllustrationPool';
import Theming from 'sap/ui/core/Theming';
import { loadConfig } from './utils/Config';
import Api from './services/Api.service';
import MessageBox from 'sap/m/MessageBox';
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
            } catch (error) {
                const datetime = new Date().toISOString().split('.')[0];
                MessageBox.error("Failed to initialize API service. Contact an administrator with the details below if the problem persists.", {
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
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            const newColorScheme = event.matches ? 'dark' : 'light';
            if (newColorScheme === 'dark') {
                Theming.setTheme('sap_horizon_dark');
            } else if (newColorScheme === 'light') {
                Theming.setTheme('sap_horizon');
            }
        });
    }

    public _currentRoute: { name: string } | undefined;
}