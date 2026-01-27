import BaseController from 'kms/controller/BaseController';
import BindingMode from 'sap/ui/model/BindingMode';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Api from 'kms/services/Api.service';
import { ApprovalGroup, Approver, Task, TaskDecision } from 'kms/common/Types';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import { Button$PressEvent } from 'sap/m/Button';
import { AxiosError } from 'axios';
import { copyToClipboard, showErrorMessage } from 'kms/common/Helpers';
import { EventChannelIds, EventIDs, TaskStates, TaskStateTransitionAction } from 'kms/common/Enums';
import MessageToast from 'sap/m/MessageToast';
import EventBus from 'sap/ui/core/EventBus';

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

            if (task) {
                this.oneWayModel.setProperty('/task', task);
                this.oneWayModel.setProperty('/task/taskDescription', this.setTaskDescription(task));
                this.setTaskActionButtonData(task);
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

    private setTaskDescription(task: Task): string {
        let description = '';
        const parameterDescription = task.parameters ? ` ${this.getText('to')} ${this.getText(task?.parametersResourceType)}: ${task.parametersResourceName}` : '';

        description = `${task.initiatorName} ${this.getText('requestsApprovalFor')}  ${this.getText(task?.actionType)} ${task.artifactType}: ${task.artifactName} ${parameterDescription}.`;
        return description;
    }

    private setTaskActionButtonData(task: Task): void {
        let taskTransitionActions = [] as TaskTransitionActionsObj[];
        const transitionKeysObjMap: Record<string, TaskTransitionActionsObj> = {
            CONFIRM: {
                key: TaskStateTransitionAction.CONFIRM,
                text: this.getText('Confirm'),
                buttonType: 'Accept'
            },
            REVOKE: {
                key: TaskStateTransitionAction.REVOKE,
                text: this.getText('Revoke'),
                buttonType: 'Reject'
            },
            APPROVE: {
                key: TaskStateTransitionAction.APPROVE,
                text: this.getText('Approve'),
                buttonType: 'Accept'
            },
            REJECT: {
                key: TaskStateTransitionAction.REJECT,
                text: this.getText('Reject'),
                buttonType: 'Reject'
            }
        };
        taskTransitionActions = task.availableTransitions?.map((transition) => {
            return transitionKeysObjMap[transition];
        });
        this.oneWayModel.setProperty('/taskTransitionActions', taskTransitionActions);
    }

    public parseApproverGroups(groups: ApprovalGroup[]) {
        const approversParsed = groups?.map((approver) => {
            return approver.name;
        });
        return approversParsed?.join('\r\n');
    }

    public parseApproverNamesWithDecisions(decisions: TaskDecision[]) {
        const approverDecisionParsed = decisions?.map((decisionItem) => {
            return `${decisionItem?.name} (${this.getText('decision')}: ${this.getText(decisionItem?.decision)})`;
        });
        return approverDecisionParsed?.join('\r\n');
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

    public checkMinApproverAttentionRequired(state: TaskStates): boolean {
        let minApproverAttentionRequired = false;
        if (state === TaskStates.WAIT_APPROVAL) {
            minApproverAttentionRequired = true;
        }
        return minApproverAttentionRequired;
    }
}
