import { EventChannelIds, EventIDs, TaskStates, TaskType } from "kms/common/Enums";
import { Task } from "kms/common/Types";
import BaseController from "kms/controller/BaseController";
import Api from "kms/services/Api.service";
import { ListItemBase$PressEvent } from "sap/m/ListItemBase";
import MessageBox from "sap/m/MessageBox";
import EventBus from "sap/ui/core/EventBus";
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import BindingMode from 'sap/ui/model/BindingMode';
import JSONModel from "sap/ui/model/json/JSONModel";

interface WorkflowTasksResponse {
    value: Task[],
    count: number
}

export default class Tasks extends BaseController {
    private api: Api;
    private eventBus = EventBus.getInstance();

    private readonly oneWayModel = new JSONModel({
        tasksStatusItems: ['All', ...Object.values(TaskStates).filter(type => type !== 'INITIAL' && type !== 'EXECUTING')] as TaskStates[] | 'All'[],
        taskTypes: ['All', ...Object.values(TaskType)] as TaskType[] | 'All'[],
        noTableDataText: 'NoTasksAvailable',
        noTableDataIllustrationType: 'sapIllus-NoTasks_v1',
        workflowTasks: [] as WorkflowTasksResponse[],
        workflowTasksCount: 0 as number
    })

    public onInit(): void {
        super.onInit();
        this.eventBus.subscribe(EventChannelIds.TASKS, EventIDs.LOAD_TASKS, (channelId, eventId, data) => this.onLoadTaskEventTrigger(channelId as EventChannelIds.TASKS, eventId as EventIDs.LOAD_TASKS, data as { tenantId: string }), this);
        this.getRouter().getRoute('tasks').attachPatternMatched({}, (event: Route$PatternMatchedEvent) => this.onRouteMatched(event), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    }

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        const routeArgs = event.getParameter('arguments') as { tenantId: string };
        this.api = new Api(routeArgs?.tenantId);
        this.tenantId = routeArgs?.tenantId;
        this.getTasks().catch((error) => {
            console.error(error);
        });
    }
    private onLoadTaskEventTrigger(channelId: EventChannelIds.TASKS, eventId: EventIDs.LOAD_TASKS, data: { tenantId: string }): void {
        //One pagination is ready, pagination info also needs to be sent as param to the callback function
        if (channelId === EventChannelIds.TASKS && eventId === EventIDs.LOAD_TASKS) {
            this.tenantId = data.tenantId;
            if (!this.api || this.tenantId !== data.tenantId) {
                this.tenantId = data.tenantId;
                this.api = new Api(this.tenantId);
            }
            this.getTasks().catch((error) => {
                console.error(error);
            });
        }
    }

    public onTaskPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedTasks = this.oneWayModel.getProperty(path) as Task;
        const taskId = selectedTasks.id;
        this.getRouter().navTo('tasksDetail', {
            tenantId: this.tenantId,
            taskId
        });
    }


    private async getTasks(): Promise<void> {
        this.getView().setBusy(true);
        try {
            const workflowTasks = await this.api.get<WorkflowTasksResponse>('workflows', {});
            if (!workflowTasks) {
                return;
            };
            this.oneWayModel.setProperty('/workflowTasks', workflowTasks.value);
            this.oneWayModel.setProperty('/workflowTasksCount', workflowTasks.count || 0);
        } catch (error) {
            console.error('Error fetching systems', error);
            MessageBox.error(this.getText('errorFetchingTasks'));
        } finally {
            this.getView().setBusy(false);
        }
    }
}