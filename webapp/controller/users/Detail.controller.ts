import BaseController from "kms/controller/BaseController";
import BindingMode from "sap/ui/model/BindingMode";
import JSONModel from "sap/ui/model/json/JSONModel";
import Api from "kms/services/Api.service";
import { User } from "kms/common/Types";
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import MessageBox from "sap/m/MessageBox";

export default class UsersDetail extends BaseController {
    private api: Api;
    private userCount: string;

    private readonly oneWayModel = new JSONModel({
        user: [] as User[],
        name: '' as string
    });

    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('usersDetail').attachPatternMatched({}, (event: Route$PatternMatchedEvent) => this.onRouteMatched(event), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    }

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        const routeArgs = event.getParameter('arguments') as { tenantId: string, userID?: string };
        this.tenantId = routeArgs?.tenantId;
        this.userCount = routeArgs.userID;
        this.oneWayModel.setProperty('/userCount', this.userCount);
        this.setUser().catch((error) => {
            console.error(error);
        });
    };

    private async setUser(): Promise<void> {
        this.getView().setBusy(true);
        try {
            const user = await this.api.get<User[]>(`user/${this.userCount}`)
            this.oneWayModel.setProperty('/user', user);
            this.oneWayModel.setProperty('/groupName', user[0].groupName);
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingUser'));
        } finally {
            this.getView().setBusy(false);
        }
    };

    public onCancel(): void {
        this.getRouter().navTo('users', {
            tenantId: this.tenantId
        });
    }
}