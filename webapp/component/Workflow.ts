import { AxiosError } from 'axios';
import { showErrorMessage } from 'kms/common/Helpers';
import { WorkflowParams } from 'kms/common/Types';
import BaseController from 'kms/controller/BaseController';
import Api from 'kms/services/Api.service';
import MessageBox from 'sap/m/MessageBox';

interface WorkflowCheckResponse {
    required: boolean
    exists: boolean
}

export default class Workflow extends BaseController {
    private api: Api;

    public init(): void {
        this.api = Api.getInstance();
    }

    public async createWorkflow(workflowParams: WorkflowParams): Promise<void> {
        try {
            const workflow = await this.api.post<{ id?: string }>('workflows', workflowParams);
            MessageBox.success(this.getText('workflowSuccessfullyCreated', workflow?.id ?? ''));
        }
        catch (error) {
            console.error('Error creating workflow:', error);
            showErrorMessage(error as AxiosError, this.getText('errorCreatingWorflow'));
            // Handle the error as per error codes
        }
    }

    public async checkWorkflowStatus(workflowParams: WorkflowParams, options: {
        onWorkflowExists?: () => void
        onWorkflowNotRequired?: () => void
        onWorkflowRequired?: () => void
        onError?: () => void
    }): Promise<void> {
        try {
            const response = await this.api.post<WorkflowCheckResponse>('workflows/check', workflowParams);
            if (!response) {
                console.error('No response from server');
                options?.onError?.();
                return;
            }

            if (response.exists) {
                console.error('Workflow already exists');
                MessageBox.error(this.getText('workflowAlreadyExistsMessage'));
                options?.onWorkflowExists?.();
            }
            else {
                if (response.required) {
                    options?.onWorkflowRequired?.();
                }
                else {
                    options?.onWorkflowNotRequired?.();
                }
            }
        }
        catch (error) {
            console.error('Error checking workflow requirement:', error);
            showErrorMessage(error as AxiosError, this.getText('errorCheckingWorkflowRequirement'));
            options?.onError?.();
        }
    }
}
