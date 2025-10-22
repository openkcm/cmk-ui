import BaseController from 'kms/controller/BaseController';
import BindingMode from 'sap/ui/model/BindingMode';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Api from 'kms/services/Api.service';
import { System, KeyConfig } from 'kms/common/Types';
import { showErrorMessage } from 'kms/common/Helpers';
import { AxiosError } from 'axios';
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
import { Button$PressEvent } from 'sap/m/Button';
import Dialog from 'sap/m/Dialog';
import Fragment from 'sap/ui/core/Fragment';
import MessageToast from 'sap/m/MessageToast';
import EventBus from 'sap/ui/core/EventBus';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import { EventChannelIds, EventIDs } from 'kms/common/Enums';

interface SystemsResponse {
    value: System[]
    count: number
}

interface KeyConfigsResponse {
    value: KeyConfig[]
    count: number
}
/**
 * @namespace kms
 */
export default class Systems extends BaseController {
    private api: Api;
    private connectTargetSystem: Dialog | undefined;
    private readonly connectSystemModel = new JSONModel({});

    private readonly oneWayModel = new JSONModel({
        systems: [] as System[],
        systemsCount: 0 as number,
        isSytemsView: true as boolean,
        noTableDataText: 'noSystemsAvailable',
        noTableDataIllustrationType: 'sapIllus-NoColumnsSet',
        systemsTableUpdating: false as boolean
    });

    private readonly filterModel = new JSONModel({
        regions: [] as { key: string, text: string }[],
        types: [
            { key: 'all', text: this.getText('all') },
            { key: 'SUBACCOUNT', text: this.getText('subaccount') },
            { key: 'SYSTEM', text: this.getText('SYSTEM') }
        ] as { key: string, text: string }[],
        keyConfigs: [] as { key: string, text: string }[],
        selectedRegion: 'all' as string,
        selectedType: 'all' as string,
        selectedKeyConfig: 'all' as string
    });

    private eventBus = EventBus.getInstance();
    private skip: number;
    private top: number;
    private currentPage: number;
    private readonly paginationModel = new JSONModel({});

    public onInit(): void {
        super.onInit();
        this.skip = 0;
        this.top = 10;
        this.currentPage = 1;
        this.getRouter().getRoute('systems')?.attachPatternMatched({}, (event: Route$PatternMatchedEvent) => {
            this.onRouteMatched(event);
        }, this);
        this.eventBus.subscribe(EventChannelIds.SYSTEMS, EventIDs.LOAD_SYSTEMS, (channelId, eventId) => {
            this.onSystemRouteEventTriggered(channelId as EventChannelIds, eventId as EventIDs);
        }, this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.paginationModel, 'pagination');
        this.setModel(this.filterModel, 'filterModel');
    };

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        this.resetPagination();
        const routeArgs = event.getParameter('arguments') as { tenantId: string };
        this.api = Api.getInstance();
        this.tenantId = routeArgs?.tenantId;
        this.updateSystemsTable();
    };

    public onSystemRouteEventTriggered(channelId: EventChannelIds, eventId: EventIDs): void {
        if (channelId === EventChannelIds.SYSTEMS && eventId === EventIDs.LOAD_SYSTEMS) {
            this.api = Api.getInstance();
            this.updateSystemsTable();
        }
    }

    private updateSystemsTable(filter = false): void {
        this.oneWayModel.setProperty('/systemsTableUpdating', true);
        this.getSystems(filter).catch((error: unknown) => {
            console.error(error);
        }).finally(() => {
            this.oneWayModel.setProperty('/systemsTableUpdating', false);
        });
    }

    private onNextPage() {
        this.currentPage++;
        this.skip += 10;
        this.updateSystemsTable();
    }

    private onPreviousPage() {
        this.currentPage--;
        this.skip -= 10;
        this.updateSystemsTable();
    }

    private resetPagination(): void {
        this.currentPage = 1;
        this.skip = 0;
        this.paginationModel.setProperty('/currentPage', this.currentPage);
    }

    private async getSystems(filter = false): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            let systems;
            if (filter) {
                const selectedRegion = this.filterModel.getProperty('/selectedRegion') as string;
                const selectedType = this.filterModel.getProperty('/selectedType') as string;
                const selectedKeyConfig = this.filterModel.getProperty('/selectedKeyConfig') as string;
                const params: Record<string, string | number | boolean> = { $top: this.top, $skip: this.skip };
                if (selectedRegion !== 'all') params.region = selectedRegion;
                if (selectedType !== 'all') params.type = selectedType;
                if (selectedKeyConfig !== 'all') params.keyConfigurationID = selectedKeyConfig;
                systems = await this.api.get<SystemsResponse>('systems', params);
            }
            else {
                systems = await this.api.get<SystemsResponse>('systems', { $top: this.top, $skip: this.skip });
            }
            if (!systems) {
                return;
            }
            this.oneWayModel.setProperty('/systems', systems.value);
            this.oneWayModel.setProperty('/systemsCount', systems.count || 0);
            if (!filter) {
                this.setFilterData(systems.value);
            }
            this.paginationModel.setProperty('/totalPages', Math.ceil(systems.count / this.top));
            this.paginationModel.setProperty('/currentPage', this.currentPage);
        }
        catch (error) {
            console.error('Error fetching systems', error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingSystems'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    private setFilterData(systems: System[]): void {
        this.filterModel.setProperty(
            '/keyConfigs',
            [
                { key: 'all', text: this.getText('all') },
                ...systems.map((system: System) => ({
                    key: system.keyConfigurationID,
                    text: system.keyConfigurationName
                }))
            ]
        );
        const regions = [
            { key: 'all', text: this.getText('all') },
            ...Array.from(new Set(systems.map((system: System) => system.region)))
                .filter(region => region)
                .map(region => ({
                    key: region,
                    text: region
                }))
        ];
        this.filterModel.setProperty('/regions', regions);
    }

    public onResetFilters(): void {
        this.filterModel.setProperty('/selectedRegion', 'all');
        this.filterModel.setProperty('/selectedType', 'all');
        this.filterModel.setProperty('/selectedKeyConfig', 'all');
        this.resetPagination();
        this.updateSystemsTable();
    };

    public applyFilters(): void {
        this.resetPagination();
        this.updateSystemsTable(true);
    }

    public onSystemPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Path is undefined');
            return;
        }
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        const systemId = selectedSystem.id;
        this.getRouter().navTo('systemsDetail', {
            tenantId: this.tenantId,
            systemId: systemId
        });
    };

    public handleStatusPressed(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Path is undefined');
            return;
        }
        const selectedConfig = this.oneWayModel.getProperty(path) as System;
        const keyConfigId: string = selectedConfig.keyConfigurationID;
        this.getRouter().navTo('keyConfigDetail', {
            tenantId: this.tenantId,
            keyConfigId: keyConfigId
        });
    }

    public async onTargetConnectSystemPress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay')?.getPath();
        const component = this.getOwnerComponent();
        const keyConfigs = await this.api.get<KeyConfigsResponse>('keyConfigurations', {});
        if (!path || !component) {
            console.error('Path or component is undefined');
            return;
        }
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        if (!this.connectTargetSystem) {
            this.connectTargetSystem = await Fragment.load({
                name: 'kms.resources.fragments.common.ConnectTargetSystem',
                controller: this
            }) as Dialog;
            // TODO:Perhaps it is better to have this filter in the backend.
            const keyConfigsData = keyConfigs.value.filter((keyConfig: KeyConfig) => keyConfig?.canConnectSystems);
            this.connectTargetSystem.addStyleClass('sapUiSizeCompact');
            this.connectTargetSystem.setModel(component.getModel('i18n'), 'i18n');
            this.connectSystemModel.setData(selectedSystem);
            this.connectTargetSystem.setModel(this.connectSystemModel, 'connectSystemModel');
            this.connectSystemModel.setProperty('/KeyConfigList', keyConfigsData);
            this.connectTargetSystem.open();
        }
        else {
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
            await this.api.patch(`systems/${systemId}/link`, { keyConfigurationID: keyConfigId });
            MessageToast.show(this.getText('keyConfigConnectSystemSuccessfully'));
            this.connectTargetSystem?.close();
            this.connectTargetSystem?.destroy();
            this.connectTargetSystem = undefined;
            this.updateSystemsTable();
        }
        catch (error) {
            showErrorMessage(error as AxiosError, this.getText('keyConfigConnectSystemError'));
            console.error(error);
        }
        finally {
            this.getView()?.setBusy(false);
        }
    }
}
