import Control from "sap/ui/core/Control";
import type { MetadataOptions } from "sap/ui/core/Element";
/**
 * @namespace kms.control
 */
export default class FilterBarItem extends Control {
    static readonly metadata: MetadataOptions = {
        properties: {
            label: { type: "string" },
        },
        aggregations: {
            content: { type: "sap.ui.core.Control", multiple: false }
        },
        defaultAggregation: 'content',

    };

    getContent(): Control {
        return this.getAggregation("content") as Control;
    }
}
