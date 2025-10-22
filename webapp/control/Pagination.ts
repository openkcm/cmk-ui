/* eslint-disable @typescript-eslint/no-useless-constructor */
import Control from 'sap/ui/core/Control';
import HBox from 'sap/m/HBox';
import VBox from 'sap/m/VBox';
import Text from 'sap/m/Text';
import Button from 'sap/m/Button';
import CustomData from 'sap/ui/core/CustomData';
import FlexItemData from 'sap/m/FlexItemData';
import RenderManager from 'sap/ui/core/RenderManager';
import type { MetadataOptions } from 'sap/ui/core/Element';

/**
 * @namespace kms.control
 */
/**
 * @namespace kms
 */
export default class Pagination extends Control {
    // The following three lines were generated and should remain as-is to make TypeScript aware of the constructor signatures
    constructor(idOrSettings?: string | $PaginationSettings);
    constructor(id?: string, settings?: $PaginationSettings);
    constructor(id?: string, settings?: $PaginationSettings) { super(id, settings); }

    static readonly metadata: MetadataOptions = {
        properties: {
            totalPages: { type: 'int', defaultValue: 0 },
            currentPage: { type: 'int', defaultValue: 0 }
        },
        events: {
            onNextPage: {},
            onPreviousPage: {}
        }
    };

    renderer = {
        render: (rm: RenderManager, control: Pagination) => {
            rm.openStart('div', control);
            rm.openEnd();

            const currentPage = control.getProperty('currentPage') as number;
            const previousButtonCustomData = new CustomData({
                key: 'testId',
                value: 'pagination-previousButton',
                writeToDom: true
            });
            const nextButtonCustomData = new CustomData({
                key: 'testId',
                value: 'pagination-nextButton',
                writeToDom: true
            });
            const paginationControls = new HBox({
                alignItems: 'Center',
                justifyContent: 'Center',
                items: [
                    new Button({
                        icon: 'sap-icon://navigation-left-arrow',
                        type: 'Transparent',
                        enabled: currentPage > 1,
                        press: () => { control._onPreviousPage(); }
                    }).addCustomData(previousButtonCustomData),
                    new Text({
                        text: `Page ${String(currentPage)} of ${String(control.getProperty('totalPages'))}`
                    }),
                    new Button({
                        icon: 'sap-icon://navigation-right-arrow',
                        type: 'Transparent',
                        enabled: currentPage < control.getProperty('totalPages'),
                        press: () => { control._onNextPage(); }
                    }).addCustomData(nextButtonCustomData)
                ],
                layoutData: new FlexItemData({
                    growFactor: 0
                })
            });
            const container = new VBox({
                visible: control.getProperty('totalPages') > 1,
                alignItems: 'Center',
                justifyContent: 'Center',
                items: [paginationControls],
                width: '100%'
            }).addStyleClass('sapUiTinyMarginTop');

            rm.renderControl(container);
            rm.close('div');
        }
    };

    private _onPreviousPage(): void {
        const page = this.getProperty('currentPage') as number;
        if (page > 1) {
            this.setProperty('currentPage', page - 1, true);
            this.fireEvent('onPreviousPage', { page: page - 1 });
            this.invalidate();
        }
    }

    private _onNextPage(): void {
        const page = this.getProperty('currentPage') as number;
        this.setProperty('currentPage', page + 1, true);
        this.fireEvent('onNextPage', { page: page + 1 });
        this.invalidate();
    }
}
