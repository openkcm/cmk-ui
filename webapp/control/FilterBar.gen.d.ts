import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";
import SimpleForm from "sap/ui/layout/form/SimpleForm";
import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
import { AggregationBindingInfo } from "sap/ui/base/ManagedObject";
import { $ControlSettings } from "sap/ui/core/Control";

declare module "./FilterBar" {

    /**
     * Interface defining the settings object used in constructor calls
     */
    interface $FilterBarSettings extends $ControlSettings {
        title?: string | PropertyBindingInfo;
        filters?: Control[] | Control | AggregationBindingInfo | `{${string}}`;
        layoutForm?: SimpleForm;
        reset?: (event: FilterBar$ResetEvent) => void;
    }

    export default interface FilterBar {

        // property: title
        getTitle(): string;
        setTitle(title: string): this;

        // aggregation: filters
        getFilters(): Control[];
        addFilter(filters: Control): this;
        insertFilter(filters: Control, index: number): this;
        removeFilter(filters: number | string | Control): Control | null;
        removeAllFilters(): Control[];
        indexOfFilter(filters: Control): number;
        destroyFilters(): this;

        // aggregation: layoutForm
        getLayoutForm(): SimpleForm;
        setLayoutForm(layoutForm: SimpleForm): this;
        destroyLayoutForm(): this;

        // event: reset
        attachReset(fn: (event: FilterBar$ResetEvent) => void, listener?: object): this;
        attachReset<CustomDataType extends object>(data: CustomDataType, fn: (event: FilterBar$ResetEvent, data: CustomDataType) => void, listener?: object): this;
        detachReset(fn: (event: FilterBar$ResetEvent) => void, listener?: object): this;
        fireReset(parameters?: FilterBar$ResetEventParameters): this;
    }

    /**
     * Interface describing the parameters of FilterBar's 'reset' event.
     */
    // eslint-disable-next-line
    export interface FilterBar$ResetEventParameters {
    }

    /**
     * Type describing the FilterBar's 'reset' event.
     */
    export type FilterBar$ResetEvent = Event<FilterBar$ResetEventParameters>;
}
