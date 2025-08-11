/* eslint-disable @typescript-eslint/no-useless-constructor */
import Control from 'sap/ui/core/Control';
import type { MetadataOptions } from 'sap/ui/core/Element';
/**
 * @namespace kms.control
 */
export default class FilterBarItem extends Control {
    // The following three lines were generated and should remain as-is to make TypeScript aware of the constructor signatures
    constructor(idOrSettings?: string | $FilterBarItemSettings);
    constructor(id?: string, settings?: $FilterBarItemSettings);
    constructor(id?: string, settings?: $FilterBarItemSettings) { super(id, settings); }
    static readonly metadata: MetadataOptions = {
        properties: {
            label: { type: 'string' }
        },
        aggregations: {
            content: { type: 'sap.ui.core.Control', multiple: false }
        },
        defaultAggregation: 'content'

    };

    getContent(): Control {
        return this.getAggregation('content') as Control;
    }
}
