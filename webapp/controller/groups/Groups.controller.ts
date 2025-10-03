import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import Api from 'kms/services/Api.service';
import { Groups } from 'kms/common/Types';
import { showErrorMessage, setNameValueState } from 'kms/common/Helpers';
import { AxiosError } from 'axios';
import MessageBox from 'sap/m/MessageBox';
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import Dialog from 'sap/m/Dialog';
import Fragment from 'sap/ui/core/Fragment';
import MessageToast from 'sap/m/MessageToast';
import { EventChannelIds, EventIDs } from 'kms/common/Enums';
import EventBus from 'sap/ui/core/EventBus';
interface GroupsResponse {
    value: Groups[]
    count: number
}
/**
 * @namespace kms
 */
export default class Group extends BaseController {
    private api: Api;
    private readonly oneWayModel = new JSONModel({
        noTableDataText: 'noUserGroupsCreated',
        noTableDataIllustrationType: 'sapIllus-NoData'
    });

    private groupCreatePopover: Dialog | undefined;
    private readonly createGroupModel = new JSONModel({});
    id: string | number;
    groupId: string;
    private skip: number;
    private top: number;
    private currentPage: number;
    private readonly paginationModel = new JSONModel({});
    private eventBus = EventBus.getInstance();

    public onInit(): void {
        super.onInit();
        this.skip = 0;
        this.top = 10;
        this.currentPage = 1;
        this.getRouter()?.getRoute('groups')?.attachPatternMatched({}, (event: Route$PatternMatchedEvent) => {
            this.onRouteMatched(event);
        }, this);
        this.eventBus.subscribe(EventChannelIds.GROUPS, EventIDs.LOAD_GROUPS, (channelId, eventId) => {
            this.onGroupRouteEventTriggered(channelId as EventChannelIds, eventId as EventIDs);
        }, this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.paginationModel, 'pagination');
    };

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        this.resetPagination();
        const routeArgs = event.getParameter('arguments') as { tenantId: string };
        this.api = Api.getInstance();
        this.tenantId = routeArgs?.tenantId;
        this.setGroups().catch((error: unknown) => {
            console.error(error);
        });
    };

    public onGroupRouteEventTriggered(channelId: EventChannelIds, eventId: EventIDs): void {
        if (channelId === EventChannelIds.GROUPS && eventId === EventIDs.LOAD_GROUPS) {
            this.api = Api.getInstance();
        }
        this.setGroups().catch((error: unknown) => {
            console.error(error);
        });
    }

    private async onNextPage() {
        this.currentPage++;
        this.skip += 10;
        await this.setGroups();
    }

    private async onPreviousPage() {
        this.currentPage--;
        this.skip -= 10;
        await this.setGroups();
    }

    private resetPagination(): void {
        this.currentPage = 1;
        this.skip = 0;
        this.paginationModel.setProperty('/currentPage', this.currentPage);
    }

    private async setGroups(): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            const groups = await this.api.get<GroupsResponse>('groups', { $top: this.top, $skip: this.skip });
            const groupsData = groups.value;
            this.oneWayModel.setProperty('/groupsData', groupsData);
            this.oneWayModel.setProperty('/groupsCount', groups.count || 0);
            this.paginationModel.setProperty('/totalPages', Math.ceil(groups.count / this.top));
            this.paginationModel.setProperty('/currentPage', this.currentPage);

            this.createGroupModel.setData({
                name: '' as string,
                description: '' as string,
                adminGroup: '' as string,
                adminGroupList: [
                    {
                        key: '',
                        text: 'Key Administrator'
                    }
                ],
                createButtonEnabled: false as boolean,
                nameValueState: 'None' as string,
                nameValueStateText: '' as string,
                adminGroupValueState: 'None' as string,
                adminGroupValueStateText: '' as string
            }, true);
        }
        catch (error) {
            console.error(error);
            this.oneWayModel.setProperty('/groupsCount', 0);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingGroups'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    public onUserPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource()?.getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
        const selectedGroup = this.oneWayModel.getProperty(path) as { id: string };
        this.groupId = selectedGroup.id;
        this.getRouter().navTo('groupDetail', {
            tenantId: this.tenantId,
            groupId: this.groupId
        });
    };

    public onGroupNameChange(): void {
        const name = this.createGroupModel.getProperty('/name') as string;
        const { valueState, valueStateText } = setNameValueState(name);
        this.createGroupModel.setProperty('/nameValueState', valueState);
        this.createGroupModel.setProperty('/nameValueStateText', valueStateText);
        this.createGroupModel.setProperty('/createButtonEnabled', valueState === 'None');
    };

    public async onCreateGroupPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();
        if (!view || !component) {
            console.error('View or component is undefined');
            return;
        }
        if (!this.groupCreatePopover) {
            this.groupCreatePopover = await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.groups.CreateGroup',
                controller: this
            }) as Dialog;
            this.groupCreatePopover.addStyleClass('sapUiSizeCompact');
            this.groupCreatePopover.setModel(component.getModel('i18n'), 'i18n');
            this.groupCreatePopover.setModel(this.createGroupModel, 'model');
            this.groupCreatePopover.open();
        }
        else {
            this.groupCreatePopover.open();
        }
    };

    public async onGroupCreationCreatePress(): Promise<void> {
        interface GroupPostPayload {
            name: string
            description: string
            role: string
        }

        const name = this.createGroupModel.getProperty('/name') as string;
        const description = this.createGroupModel.getProperty('/description') as string;
        const newGroup = {
            name: name,
            description: description,
            role: 'KEY_ADMINISTRATOR'
        } as GroupPostPayload;

        this.getView()?.setBusy(true);
        try {
            const group = await this.api.post<Groups>('groups', newGroup);
            MessageToast.show(this.getText('groupCreated'));
            this.groupCreatePopover?.close();
            this.groupCreatePopover?.destroy();
            this.groupCreatePopover = undefined;
            this.resetCreateConfigModel();
            this.setGroups().catch((error: unknown) => {
                console.error(error);
            });
            this.getRouter().navTo('groupDetail', {
                tenantId: this.tenantId,
                groupId: group?.id
            });
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorCreatingGroup'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    public resetCreateConfigModel(): void {
        this.createGroupModel.setData({
            name: '' as string,
            description: '' as string,
            createButtonEnabled: false as boolean,
            nameValueState: 'None' as string,
            nameValueStateText: '' as string,
            adminGroupValueState: 'None' as string,
            adminGroupValueStateText: '' as string
        }, true);
    };

    public onGroupCreationCancelPress(): void {
        if (this.groupCreatePopover) {
            this.groupCreatePopover.close();
            this.groupCreatePopover.destroy();
            this.groupCreatePopover = undefined;
        }
        this.resetCreateConfigModel();
    }

    public onKeyTableDeletePress(event: ListItemBase$PressEvent): void {
        const path = event.getSource()?.getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
        const selectedGroup = this.oneWayModel.getProperty(path) as { id: string };
        this.groupId = selectedGroup.id;

        MessageBox.confirm(this.getText('confirmGroupDelete'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    this.getView()?.setBusy(true);
                    try {
                        await this.api.delete(`groups/${this.groupId}`);
                        MessageToast.show(this.getText('groupDeletedSuccessfully'));
                        this.setGroups().catch((error: unknown) => {
                            console.error(error);
                        });
                    }
                    catch (error) {
                        console.error(error);
                        showErrorMessage(error as AxiosError, this.getText('errorDeletingGroup'));
                    }
                    finally {
                        this.getRouter().navTo('groups', {
                            tenantId: this.tenantId
                        });
                        this.getView()?.setBusy(false);
                    }
                }
            }
        });
    }
}
