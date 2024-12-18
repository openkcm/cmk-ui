import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import Api from 'kms/services/Api.service';
import { Groups } from 'kms/common/Types';
import MessageBox from 'sap/m/MessageBox';
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
interface GroupsResponse {
    value: Groups[];
    count: number;
}
export default class Users extends BaseController {
    private readonly api: Api = new Api();
    private readonly oneWayModel = new JSONModel({});
    private userCount: number = 0;


    public onInit(): void {
        super.onInit();
        this.getRouter().attachRouteMatched(this.onRouteMatched.bind(this));
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    };

    public onRouteMatched(): void {
        this.setGroups().catch((error) => {
            console.error(error);
        });
    };

    private async setGroups(): Promise<void> {
        this.getView().setBusy(true);
        try {
            const groups = await this.api.get<GroupsResponse>('groups', {});
            const groupsData = groups.value;
            this.oneWayModel.setProperty('/groupsData', groupsData);
            this.oneWayModel.setProperty('/groupsCount', groups.count || 0);

        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingGroups'));
        } finally {
            this.getView().setBusy(false);
        }
    };

    public onUserPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedUser = this.oneWayModel.getProperty(path) as Users;
        this.userCount = selectedUser.userCount;
        this.oneWayModel.setProperty('/userCount', this.userCount || 0);

        this.getRouter().navTo('usersDetail', {
            userID: this.userCount
        });
    };
}