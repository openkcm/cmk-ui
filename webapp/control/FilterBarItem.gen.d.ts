import Control from "sap/ui/core/Control";
import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
import { $ControlSettings } from "sap/ui/core/Control";

declare module "./FilterBarItem" {

    /**
     * Interface defining the settings object used in constructor calls
     */
    interface $FilterBarItemSettings extends $ControlSettings {
        label?: string | PropertyBindingInfo;
        content?: Control;
    }

    export default interface FilterBarItem {

        // property: label
        getLabel(): string;
        setLabel(label: string): this;

        // aggregation: content
        getContent(): Control;
        setContent(content: Control): this;
        destroyContent(): this;
    }
}
