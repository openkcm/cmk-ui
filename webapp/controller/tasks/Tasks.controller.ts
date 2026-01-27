import { EventChannelIds, EventIDs, TaskStates, TaskType } from 'kms/common/Enums';
import { Task } from 'kms/common/Types';
import BaseController from 'kms/controller/BaseController';
import Api from 'kms/services/Api.service';
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
import { showErrorMessage } from 'kms/common/Helpers';
import { AxiosError } from 'axios';
import EventBus from 'sap/ui/core/EventBus';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import BindingMode from 'sap/ui/model/BindingMode';
import JSONModel from 'sap/ui/model/json/JSONModel';
interface WorkflowTasksResponse {
    value: Task[]
    count: number
}

/**
 * @namespace kms
 */
export default class Tasks extends BaseController {
    private api: Api;
    private eventBus = EventBus.getInstance();
    private skip: number;
    private top: number;
    private currentPage: number;
    private readonly paginationModel = new JSONModel({});

    private readonly oneWayModel = new JSONModel({
        tasksStatusItems: ['all', ...Object.values(TaskStates).filter(type => type !== TaskStates.INITIAL && type !== TaskStates.EXECUTING)] as TaskStates[] | 'all'[],
        taskTypes: ['all', ...Object.values(TaskType)] as TaskType[] | 'all'[],
        noTableDataText: 'NoTasksAvailable',
        noTableDataIllustrationType: 'sapIllus-NoActivities',
        workflowTasks: [] as WorkflowTasksResponse[],
        workflowTasksCount: 0 as number
    });

    public onInit(): void {
        super.onInit();
        this.skip = 0;
        this.top = 10;
        this.currentPage = 1;
        this.eventBus.subscribe(EventChannelIds.TASKS, EventIDs.LOAD_TASKS, (channelId, eventId, data) => {
            this.onLoadTaskEventTrigger(channelId as EventChannelIds.TASKS, eventId as EventIDs.LOAD_TASKS, data as { tenantId: string });
        }, this);
        this.getRouter().getRoute('tasks')?.attachPatternMatched({}, (event: Route$PatternMatchedEvent) => {
            this.onRouteMatched(event);
        }, this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.paginationModel, 'pagination');
    }

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        this.resetPagination();
        const routeArgs = event.getParameter('arguments') as { tenantId: string };
        this.api = Api.getInstance();
        this.tenantId = routeArgs?.tenantId;
        this.getTasks().catch((error: unknown) => {
            console.error(error);
        });
    }

    private onLoadTaskEventTrigger(channelId: EventChannelIds.TASKS, eventId: EventIDs.LOAD_TASKS, data: { tenantId: string }): void {
        // One pagination is ready, pagination info also needs to be sent as param to the callback function
        if (channelId === EventChannelIds.TASKS && eventId === EventIDs.LOAD_TASKS) {
            this.tenantId = data.tenantId;
            this.api = Api.getInstance();
            this.getTasks().catch((error: unknown) => {
                console.error(error);
            });
        }
    }

    public onTaskPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Path is undefined');
            return;
        }
        const selectedTasks = this.oneWayModel.getProperty(path) as Task;
        const taskId = selectedTasks.id;
        this.getRouter().navTo('tasksDetail', {
            tenantId: this.tenantId,
            taskId
        });
    }

    private async onNextPage() {
        this.currentPage++;
        this.skip += 10;
        await this.getTasks();
    }

    private async onPreviousPage() {
        this.currentPage--;
        this.skip -= 10;
        await this.getTasks();
    }

    private resetPagination(): void {
        this.currentPage = 1;
        this.skip = 0;
        this.paginationModel.setProperty('/currentPage', this.currentPage);
    }

    private async getTasks(): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            const workflowTasks = await this.api.get<WorkflowTasksResponse>('workflows', { $top: this.top, $skip: this.skip });
            if (!workflowTasks) {
                return;
            }
            this.oneWayModel.setProperty('/workflowTasks', workflowTasks.value);
            this.oneWayModel.setProperty('/workflowTasksCount', workflowTasks.count || 0);
            this.paginationModel.setProperty('/totalPages', Math.ceil(workflowTasks.count / this.top));
            this.paginationModel.setProperty('/currentPage', this.currentPage);
        }
        catch (error) {
            console.error('Error fetching tasks', error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingTasks'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }
}
