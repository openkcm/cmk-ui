import UIComponent from 'sap/ui/core/UIComponent';
import IllustrationPool from 'sap/m/IllustrationPool';
import Theming from 'sap/ui/core/Theming';
import { loadConfig } from './utils/Config';
import Api from './services/Api.service';
import { Config } from './common/Types';
import MessageBox from 'sap/m/MessageBox';
/**
 * @namespace kms
 */
export default class Component extends UIComponent {
    public static readonly metadata = {
        manifest: 'json',
        interfaces: ['sap.ui.core.IAsyncContentCreation']
    };

    public init(): void {
        super.init();
        void loadConfig().then((config: Config) => {
            Api.init(config.apiBaseUrl).catch((error) => {
                const datetime = new Date().toISOString().split('.')[0];
                MessageBox.error("Failed to initialize API service. Contact an administrator with the details below if the problem persists.", {
                    title: 'Initialization Error',
                    details: "<p><strong>" + "Error Details:" + "</strong></p>" +
                        "<ul>" +
                        "<li><strong>" + "Error Message: " + "</strong>" + error + "</li>" +
                        "<li><strong>" + "Timestamp (UTC): " + "</strong>" + datetime + "</li>" +
                        "</ul>",
                    styleClass: 'sapUiUserSelectable'
                });
            });
        });

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