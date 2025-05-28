import Event from "sap/ui/base/Event";
import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
import { $ControlSettings } from "sap/ui/core/Control";

declare module "./Pagination" {

    /**
     * Interface defining the settings object used in constructor calls
     */
    interface $PaginationSettings extends $ControlSettings {
        totalPages?: number | PropertyBindingInfo | `{${string}}`;
        currentPage?: number | PropertyBindingInfo | `{${string}}`;
        onNextPage?: (event: Pagination$OnNextPageEvent) => void;
        onPreviousPage?: (event: Pagination$OnPreviousPageEvent) => void;
    }

    export default interface Pagination {

        // property: totalPages
        getTotalPages(): number;
        setTotalPages(totalPages: number): this;

        // property: currentPage
        getCurrentPage(): number;
        setCurrentPage(currentPage: number): this;

        // event: onNextPage
        attachOnNextPage(fn: (event: Pagination$OnNextPageEvent) => void, listener?: object): this;
        attachOnNextPage<CustomDataType extends object>(data: CustomDataType, fn: (event: Pagination$OnNextPageEvent, data: CustomDataType) => void, listener?: object): this;
        detachOnNextPage(fn: (event: Pagination$OnNextPageEvent) => void, listener?: object): this;
        fireOnNextPage(parameters?: Pagination$OnNextPageEventParameters): this;

        // event: onPreviousPage
        attachOnPreviousPage(fn: (event: Pagination$OnPreviousPageEvent) => void, listener?: object): this;
        attachOnPreviousPage<CustomDataType extends object>(data: CustomDataType, fn: (event: Pagination$OnPreviousPageEvent, data: CustomDataType) => void, listener?: object): this;
        detachOnPreviousPage(fn: (event: Pagination$OnPreviousPageEvent) => void, listener?: object): this;
        fireOnPreviousPage(parameters?: Pagination$OnPreviousPageEventParameters): this;
    }

    /**
     * Interface describing the parameters of Pagination's 'onNextPage' event.
     */
    // eslint-disable-next-line
    export interface Pagination$OnNextPageEventParameters {
    }

    /**
     * Interface describing the parameters of Pagination's 'onPreviousPage' event.
     */
    // eslint-disable-next-line
    export interface Pagination$OnPreviousPageEventParameters {
    }

    /**
     * Type describing the Pagination's 'onNextPage' event.
     */
    export type Pagination$OnNextPageEvent = Event<Pagination$OnNextPageEventParameters>;

    /**
     * Type describing the Pagination's 'onPreviousPage' event.
     */
    export type Pagination$OnPreviousPageEvent = Event<Pagination$OnPreviousPageEventParameters>;
}
