import Control from 'sap/ui/core/Control';
import SimpleForm from 'sap/ui/layout/form/SimpleForm';
import HBox from 'sap/m/HBox';
import Label from 'sap/m/Label';
import VBox from 'sap/m/VBox';
import Button from 'sap/m/Button';
import RenderManager from 'sap/ui/core/RenderManager';
import GridData from 'sap/ui/layout/GridData';
import FilterBarItem from 'kms/control/FilterBarItem';
import type { MetadataOptions } from 'sap/ui/core/Element';

/**
 * @namespace kms.control
 */
export default class FilterBar extends Control {

    static readonly metadata: MetadataOptions = {
        properties: {
            title: { type: 'string', defaultValue: 'Filters' },
        },
        aggregations: {
            filters: { type: 'sap.ui.core.Control', multiple: true },
            layoutForm: {
                type: 'sap.ui.layout.form.SimpleForm',
                multiple: false,
                visibility: 'hidden'
            }
        },
        defaultAggregation: 'filters',
        events: {
            search: {},
            reset: {}
        }
    }

    private layoutForm: SimpleForm;

    constructor(id?: string) {
        super(id);

        this.layoutForm = new SimpleForm({
            editable: true,
            layout: "ResponsiveGridLayout",
            columnsL: 4,
            columnsM: 3,
            labelSpanL: 0,
            labelSpanM: 0,
            labelSpanS: 0
        });

        this.setAggregation('layoutForm', this.layoutForm);
    }

    renderer = {
        render: (rm: RenderManager, control: FilterBar) => {
            rm.openStart('div', control);
            rm.openEnd();

            const toolbar = new HBox({
                justifyContent: "End",
                items: [
                    new Button({
                        text: 'Go',
                        type: 'Emphasized',
                        press: () => control.fireEvent('search'),
                    }).addStyleClass('sapUiTinyMargin'),
                    new Button({
                        text: 'Reset',
                        press: () => control.fireEvent('reset'),
                    }).addStyleClass('sapUiTinyMargin'),
                ]
            });

            rm.renderControl(control.layoutForm);
            rm.renderControl(toolbar);
            rm.close('div');
        },
    };

    onBeforeRendering(): void {
        const form = this.layoutForm;
        form.removeAllContent();

        const items = this.getAggregation("filters") as FilterBarItem[] || [];

        items.forEach((item) => {
            const label = new Label({
                text: `${item.getProperty("label") as string}:`,
                labelFor: item.getContent()?.getId()
            });

            const container = new VBox({
                items: [label, item.getContent()]
            });

            container.setLayoutData(new GridData({
                span: "L3 M4 S12"
            }));

            form.addContent(container);
        });
    }

    getFilters(): Control[] {
        return this.getAggregation('filters') as Control[] || [];
    }

    setTitle(title: string): this {
        this.setProperty('title', title);
        return this;
    }
}
