import BaseController from 'kms/controller/BaseController';
import BindingMode from 'sap/ui/model/BindingMode';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Api from 'kms/services/Api.service';
import { Approver, Task } from 'kms/common/Types';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import { Button$PressEvent } from 'sap/m/Button';
import { AxiosError } from 'axios';
import { copyToClipboard, showErrorMessage } from 'kms/common/Helpers';
import { EventChannelIds, EventIDs, TaskStates, TaskStateTransitionAction } from 'kms/common/Enums';
import MessageToast from 'sap/m/MessageToast';
import EventBus from 'sap/ui/core/EventBus';

interface ApproversResponse {
    value: Approver[]
    count: number
}
interface TaskTransitionActionsObj {
    key: TaskStateTransitionAction
    text: string
    buttonType: 'Accept' | 'Reject'
}

/**
 * @namespace kms
 */
export default class Tasks extends BaseController {
    private api: Api;
    private taskId: string;
    private eventBus = EventBus.getInstance();
    private readonly oneWayModel = new JSONModel({
        task: {} as Task,
        approvers: [] as Approver[],
        taskTransitionActions: [] as TaskTransitionActionsObj[]
    });

    private readonly taskStateTransitionActionMessageParam = {
        [TaskStateTransitionAction.APPROVE]: 'APPROVED',
        [TaskStateTransitionAction.REJECT]: 'REJECTED',
        [TaskStateTransitionAction.CONFIRM]: 'CONFIRMED',
        [TaskStateTransitionAction.REVOKE]: 'REVOKED'
    };

    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('tasksDetail')?.attachPatternMatched({}, (event: Route$PatternMatchedEvent) => {
            this.onRouteMatched(event);
        }, this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    }

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        const routeArgs = event.getParameter('arguments') as { tenantId: string, taskId?: string };
        this.taskId = routeArgs.taskId || '';
        this.api = Api.getInstance();
        this.tenantId = routeArgs?.tenantId;
        this.eventBus.publish(EventChannelIds.TASKS, EventIDs.LOAD_TASKS, { tenantId: this.tenantId });
        this.getTaskDetails().catch((error: unknown) => {
            console.error(error);
        });
    }

    private async getTaskDetails(): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            const task = await this.api.get<Task>(`workflows/${this.taskId}`);
            const approversData = await this.api.get<ApproversResponse>(`workflows/${this.taskId}/approvers`);
            if (task) {
                this.oneWayModel.setProperty('/task', task);
                this.oneWayModel.setProperty('/approvers', approversData?.value);
                this.setTaskActionButtonData(task, approversData?.value);
            }
            else {
                console.error('Task not found');
                this.onCancel();
            }
        }
        catch (error) {
            console.error('Error fetching tasks details', error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingTaskDetails'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    private setTaskActionButtonData(task: Task, approvers: Approver[]): void {
        // const userId: string = 'random_id' //Change this to actuall user id once the data is available;
        let taskTransitionActions = [] as TaskTransitionActionsObj[];
        const approverIds = approvers?.map(approver => approver.id);
        //  const userId: string = approverIds[0]; //Temp Setting to test the Approver action items on tasks
        const userId: string = task?.initiatorID; // Temp Setting to test the Initiator action items on tasks
        const userIsTaskInitiator = userId === task?.initiatorID;
        const userIsTaskApprover = approverIds.includes(userId);
        if (userIsTaskInitiator) {
            if (task?.state === TaskStates.WAIT_APPROVAL) {
                taskTransitionActions = [
                    {
                        key: TaskStateTransitionAction.REVOKE,
                        text: this.getText('Revoke'),
                        buttonType: 'Reject'
                    }];
            }
            else if (task?.state === TaskStates.WAIT_CONFIRMATION) {
                taskTransitionActions = [
                    {
                        key: TaskStateTransitionAction.CONFIRM,
                        text: this.getText('Confirm'),
                        buttonType: 'Accept'
                    },
                    {
                        key: TaskStateTransitionAction.REVOKE,
                        text: this.getText('Revoke'),
                        buttonType: 'Reject'
                    }];
            }
        }
        else if (userIsTaskApprover) {
            if (task.state === TaskStates.WAIT_APPROVAL) {
                taskTransitionActions = [
                    {
                        key: TaskStateTransitionAction.APPROVE,
                        text: this.getText('Approve'),
                        buttonType: 'Accept'
                    },
                    {
                        key: TaskStateTransitionAction.REJECT,
                        text: this.getText('Reject'),
                        buttonType: 'Reject'
                    }];
            }
        }
        else {
            taskTransitionActions = [];
        }
        this.oneWayModel.setProperty('/taskTransitionActions', taskTransitionActions);
    }

    public parseApproverNamesWithDecisions(approvers: Approver[]) {
        const approversParsed = approvers?.map((approver) => {
            return `${approver?.name} (${this.getText('decision')}: ${this.getText(approver?.decision)})`;
        });
        return approversParsed?.join('\r\n');
    }

    public async onTaskActionPress(_event: Button$PressEvent, key: TaskStateTransitionAction) {
        this.getView()?.setBusy(true);
        const payload = { transition: key };
        try {
            await this.api.post(`workflows/${this.taskId}/state`, payload);
            MessageToast.show(this.getText('taskActionSuccessful', this.getText(this.taskStateTransitionActionMessageParam[key]).toLowerCase()));
            this.onCancel();
        }
        catch (error) {
            showErrorMessage(error as AxiosError, this.getText('errorGeneric'));
            console.error('Error while executing Task', error);
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }

    public onCancel(): void {
        this.getRouter().navTo('tasks', {
            tenantId: this.tenantId
        });
    }

    public onRefresh(): void {
        this.getTaskDetails().catch((error: unknown) => {
            console.error(error);
        });
    }

    public async onCopyToClipboardPress(event: Button$PressEvent): Promise<void> {
        await copyToClipboard(event);
    }
}
