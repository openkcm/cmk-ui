import Fragment from 'sap/ui/core/Fragment';
import Popover from 'sap/m/Popover';
import Control from 'sap/ui/core/Control';
import View from 'sap/ui/core/mvc/View';
import Controller from 'sap/ui/core/mvc/Controller';
import JSONModel from 'sap/ui/model/json/JSONModel';
const popoverCache = new Map<string, Promise<Popover>>();

async function getPopover(
    view: View,
    fragmentController: Controller
): Promise<Popover> {
    const viewId = view.getId();

    let popover = popoverCache.get(viewId);
    if (!popover) {
        popover = Fragment.load({
            id: viewId,
            name: 'kms.resources.fragments.common.HelpInfoPopover',
            controller: fragmentController
        }).then((fragment) => {
            const popover = fragment as Popover;
            view.addDependent(popover);

            // Remove automatically when the view is destroyed
            view.attachBeforeExit(() => {
                popoverCache.delete(viewId);
            });
            return popover;
        });
        popoverCache.set(viewId, popover);
    }
    return popover;
}

export async function open(
    view: View,
    fragmentController: Controller,
    source: Control,
    text: string
): Promise<void> {
    const popover = await getPopover(view, fragmentController);
    let helpModel = popover.getModel('helpModel') as JSONModel;
    if (!helpModel) {
        helpModel = new JSONModel();
        popover.setModel(helpModel, 'helpModel');
    }
    helpModel.setData({ text: text });
    popover.getModel('helpModel')?.refresh(true);
    popover.openBy(source);
}
