import UIComponent from 'sap/ui/core/UIComponent';
import IllustrationPool from 'sap/m/IllustrationPool';
import Theming from 'sap/ui/core/Theming';
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
        this.getRouter().initialize();
        if (window.location.hash === '') {
            this.getRouter().navTo('home', {}, true);
        }
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            Theming.setTheme('sap_horizon_dark');
        }
        this.watchForThemeChanges();
        const tntSet = {
            setFamily: 'tnt',
            setURI: sap.ui.require.toUrl('sap/tnt/themes/base/illustrations')
        };

        IllustrationPool.registerIllustrationSet(tntSet, false);
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