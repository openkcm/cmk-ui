import BaseController from "kms/controller/BaseController";
import BindingMode from "sap/ui/model/BindingMode";
import JSONModel from "sap/ui/model/json/JSONModel";
import Api from "kms/services/Api.service";
import { System } from "kms/common/Types";
import { KeyConfig } from 'kms/common/Types';
import MessageBox from "sap/m/MessageBox";
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
import { Button$PressEvent } from 'sap/m/Button';
import Dialog from 'sap/m/Dialog';
import Fragment from 'sap/ui/core/Fragment';
import MessageToast from 'sap/m/MessageToast';
import EventBus from "sap/ui/core/EventBus";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { EventChannelIds, EventIDs } from "kms/common/Enums";

interface SystemsResponse {
    value: Systems[];
    count: number;
}

interface KeyConfigsResponse {
    value: KeyConfig[];
    count: number;
}
export default class Systems extends BaseController {
    private api: Api;
    private connectTargetSystem: Dialog | undefined;
    private readonly connectSystemModel = new JSONModel({});

    private readonly oneWayModel = new JSONModel({
        systems: [] as System[],
        systemsCount: 0 as number,
        noTableDataText: 'noSystemsAvailable',
        noTableDataIllustrationType: 'tnt-NoApplications'
    });
    private eventBus = EventBus.getInstance();

    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('systems').attachPatternMatched({}, (event: Route$PatternMatchedEvent) => this.onRouteMatched(event), this);
        this.eventBus.subscribe(EventChannelIds.SYSTEMS, EventIDs.LOAD_SYSTEMS, (channelId, eventId) => this.onSystemRouteEventTriggered(channelId, eventId), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    };
    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        const routeArgs = event.getParameter('arguments') as { tenantId: string };
        this.api = new Api(routeArgs?.tenantId);
        this.tenantId = routeArgs?.tenantId;
        this.getSystems().catch((error) => {
            console.error(error);
        });
    };
    public onSystemRouteEventTriggered(channelId: string, eventId: string): void {
        if (channelId === 'systems' && eventId === 'loadSystems') {
            this.getSystems().catch((error) => {
                console.error(error);
            });
        }
    }
    private async getSystems(): Promise<void> {
        this.getView().setBusy(true);
        try {
            const systems = await this.api.get<SystemsResponse>('systems', {});
            if (!systems) {
                return;
            };
            this.oneWayModel.setProperty('/systems', systems.value);
            this.oneWayModel.setProperty('/systemsCount', systems.count || 0);
        } catch (error) {
            console.error('Error fetching systems', error);
            MessageBox.error(this.getText('errorFetchingSystems'));
        } finally {
            this.getView().setBusy(false);
        }
    };

    public onSystemPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        const systemId = selectedSystem.id;
        this.getRouter().navTo('systemsDetail', {
            tenantId: this.tenantId,
            systemId: systemId
        });
    };

    public handleStatusPressed(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedConfig = this.oneWayModel.getProperty(path) as System;
        const keyConfigId: string = selectedConfig.keyConfigurationID;
        this.getRouter().navTo('keyConfigDetail', {
            tenantId: this.tenantId,
            keyConfigId: keyConfigId
        });
    }

    public async onTargetConnectSystemPress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        const component = this.getOwnerComponent();
        const keyConfigs = await this.api.get<KeyConfigsResponse>('keyConfigurations', {});

        if (!this.connectTargetSystem) {
            this.connectTargetSystem = await Fragment.load({
                name: 'kms.resources.fragments.common.ConnectTargetSystem',
                controller: this
            }) as Dialog;
            const keyConfigsData = keyConfigs.value;
            this.connectTargetSystem.addStyleClass('sapUiSizeCompact');
            this.connectTargetSystem.setModel(component.getModel('i18n'), 'i18n');
            this.connectSystemModel.setData(selectedSystem);
            this.connectTargetSystem.setModel(this.connectSystemModel, 'connectSystemModel');
            this.connectSystemModel.setProperty('/KeyConfigList', keyConfigsData);
            this.connectTargetSystem.open();
        } else {
            this.connectTargetSystem.open();
        }
    }

    public onConnectSystemCancelPress(): void {
        this.connectTargetSystem?.close();
        this.connectTargetSystem?.destroy();
        this.connectTargetSystem = undefined;
    }

    public async onConnectSystemSubmitPress(): Promise<void> {
        const systemId: string = this.connectSystemModel.getProperty('/id') as string;
        const keyConfigId: string = this.connectSystemModel.getProperty('/selectedKeyConfig') as string;
        try {
            await this.api.patch(`systems/${systemId}/link`, { keyConfigurationID: keyConfigId })
            MessageToast.show(this.getText('keyConfigConnectSystemSuccessfully'));
            this.connectTargetSystem?.close();
            this.connectTargetSystem?.destroy();
            this.connectTargetSystem = undefined;
            this.getSystems().catch((error) => {
                console.error(error);
            });
        } catch (error) {
            MessageBox.error(this.getText('keyConfigConnectSystemError'));
            console.error(error);
        } finally {
            this.getView().setBusy(false);
        }
    }
}