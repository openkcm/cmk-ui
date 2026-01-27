import BaseController from 'kms/controller/BaseController';
import BindingMode from 'sap/ui/model/BindingMode';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Api from 'kms/services/Api.service';
import { Group, GroupIAMExistance } from 'kms/common/Types';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import { showErrorMessage, setNameValueState } from 'kms/common/Helpers';
import { AxiosError } from 'axios';
import MessageBox from 'sap/m/MessageBox';
import { Input$LiveChangeEvent } from 'sap/m/Input';
import { TextArea$LiveChangeEvent } from 'sap/m/TextArea';
import { EventChannelIds, EventIDs } from 'kms/common/Enums';
import EventBus from 'sap/ui/core/EventBus';
interface IamResponse {
    value: GroupIAMExistance[]
}
interface GroupPayload {
    name: string
    description: string
}

/**
 * @namespace kms
 */
export default class GroupDetail extends BaseController {
    private api: Api;
    private groupId: string;

    private readonly oneWayModel = new JSONModel();
    private eventBus = EventBus.getInstance();

    public onInit(): void {
        super.onInit();
        this.getRouter()?.getRoute('groupDetail')?.attachPatternMatched({}, (event: Route$PatternMatchedEvent) => {
            this.onRouteMatched(event);
        }, this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.oneWayModel.setProperty('/groupValid', false);
    }

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        const routeArgs = event.getParameter('arguments') as { tenantId: string, groupId?: string };
        this.api = Api.getInstance();
        this.tenantId = routeArgs?.tenantId;
        this.groupId = routeArgs.groupId || '';
        this.getGroup().catch((error: unknown) => {
            console.error(error);
        });
        this.eventBus.publish(EventChannelIds.GROUPS, EventIDs.LOAD_GROUPS, { groupId: this.groupId, tenantId: this.tenantId });
    };

    private async getGroup(): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            const group = await this.api.get<Group>(`groups/${this.groupId}`);
            this.oneWayModel.setProperty('/groupData', group);
            this.groupIAMCheck(group?.iamIdentifier).catch((error: unknown) => {
                console.error(error);
            });
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingUser'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    private async groupIAMCheck(iamIdentifier: string | undefined): Promise<void> {
        this.getView()?.setBusy(true);
        if (!iamIdentifier) {
            console.warn('No IAM Identifier found for group');
            return;
        }
        const payload = {
            iamIdentifiers: [
                iamIdentifier
            ]
        };
        try {
            const iamResponse = await this.api.post<IamResponse>('groups/iamCheck', payload);
            this.oneWayModel.setProperty('/groupData/groupInIAM', iamResponse?.value[0].exists);
        }
        catch (error) {
            console.error(error);
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    public onGroupEditDetailsPress(): void {
        this.oneWayModel.setProperty('/editMode', true);
    };

    public onGroupCancelPress(): void {
        this.oneWayModel.setProperty('/editMode', false);
    };

    public onGroupNameChanged(event: Input$LiveChangeEvent): void {
        const newGroupName = event.getParameter('value') ?? '';
        const groupName = this.oneWayModel.getProperty('/groupData/name') as string;
        const { valueState, valueStateText } = setNameValueState(newGroupName);
        this.oneWayModel.setProperty('/groupNameValueState', valueState);
        this.oneWayModel.setProperty('/groupNameValueStateText', valueStateText);
        this.oneWayModel.setProperty('/groupValid', newGroupName !== groupName && valueState === 'None');
        this.oneWayModel.setProperty('/newGroupName', newGroupName);
    };

    public onGroupDescriptionChanged(event: TextArea$LiveChangeEvent): void {
        const newGroupDescription = event.getParameter('value');
        const groupDescription = this.oneWayModel.getProperty('/groupData/description') as string;
        if (newGroupDescription === groupDescription) {
            this.oneWayModel.setProperty('/groupValid', false);
        }
        else {
            this.oneWayModel.setProperty('/groupValid', true);
            this.oneWayModel.setProperty('/newGroupDescription', newGroupDescription);
        }
    };

    public async onGroupSavePress(): Promise<void> {
        this.getView()?.setBusy(true);

        const payload: GroupPayload = {
            name: this.oneWayModel.getProperty('/newGroupName') as string,
            description: this.oneWayModel.getProperty('/newGroupDescription') as string
        };
        try {
            await this.api.patch(`groups/${this.groupId}`, payload);
            MessageBox.success(this.getText('groupUpdatedSuccessfully'));
            await this.getGroup();
            this.getRouter().navTo('groups', {
                tenantId: this.tenantId
            });
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorUpdatingGroup'));
        }
        finally {
            this.oneWayModel.setProperty('/editMode', false);
            this.getView()?.setBusy(false);
            this.getRouter().navTo('groupDetail', {
                tenantId: this.tenantId,
                groupId: this.groupId
            });
        }
    };

    public onCancel(): void {
        this.oneWayModel.setProperty('/editMode', false);
        this.getRouter().navTo('groups', {
            tenantId: this.tenantId
        });
    }
}
