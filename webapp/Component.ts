import UIComponent from "sap/ui/core/UIComponent";
import IllustrationPool from "sap/m/IllustrationPool";
/**
 * @namespace kms
 */
export default class Component extends UIComponent {
    public static readonly metadata = {
        manifest: "json",
        interfaces: ["sap.ui.core.IAsyncContentCreation"]
    };

    public init(): void {
        super.init();
        this.getRouter().initialize();
        if (window.location.hash === '') {
            this.getRouter().navTo("home", {}, true);
        }
        const tntSet = {
            setFamily: "tnt",
            setURI: sap.ui.require.toUrl("sap/tnt/themes/base/illustrations")
        };

        // register tnt illustration set
        IllustrationPool.registerIllustrationSet(tntSet, false);
    }

    public _currentRoute: { name: string } | undefined;
}