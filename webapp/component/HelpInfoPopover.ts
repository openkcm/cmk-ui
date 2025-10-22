import { AxiosError } from 'axios';
import { showErrorMessage } from 'kms/common/Helpers';
import BaseController from 'kms/controller/BaseController';
import Popover from 'sap/m/Popover';
import Fragment from 'sap/ui/core/Fragment';
import JSONModel from 'sap/ui/model/json/JSONModel';

/**
 * @namespace kms
 */
export default class HelpInfoPopover extends BaseController {
    private readonly helpInfoModel = new JSONModel({});
    private helpInfoPopover: Popover | undefined;

    private setKeyCreationWizard(): void {
        const loadFragment = async (): Promise<void> => {
            this.helpInfoPopover = await Fragment.load({
                // DO NOT change this id else Fragment.byId("keyCreatePopoverDialog",.... would stop working.
                // Also DO NOT assign an id the the fragment view in the XML file.
                id: 'keyCreatePopoverDialog',
                name: 'kms.resources.fragments.common.KeyCreationWizard',
                controller: this
            }) as Popover;
            this.getView()?.addDependent(this.helpInfoPopover);
            this.helpInfoPopover.setModel(this.helpInfoModel, 'model');
        };

        if (!this.helpInfoPopover) {
            loadFragment().catch((err: unknown) => {
                console.error('Error loading key creation wizard fragment:', err);
                showErrorMessage(err as AxiosError, this.getText('errorLoadingHelpInfoPopover'));
                this.helpInfoPopover?.destroy();
                this.helpInfoPopover = undefined;
            });
        }
        else {
            this.helpInfoPopover?.destroy();
            loadFragment().catch((err: unknown) => {
                console.error('Error loading key creation wizard fragment:', err);
                showErrorMessage(err as AxiosError, this.getText('errorLoadingHelpInfoPopover'));
                this.helpInfoPopover?.destroy();
                this.helpInfoPopover = undefined;
            });
        }
    }
}
