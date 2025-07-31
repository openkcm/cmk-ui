import { TaskStates, SystemStatus } from "./Enums";

export default class Formatter {
    public static setTaskStatus(state: TaskStates): string {
        switch (state) {
            case TaskStates.SUCCESSFUL:
                return "sap-icon://message-success";
            case TaskStates.WAIT_APPROVAL:
            case TaskStates.WAIT_CONFIRMATION:
            case TaskStates.INITIAL:
                return "sap-icon://lateness";
            case TaskStates.EXPIRED:
            case TaskStates.FAILED:
            case TaskStates.REVOKED:
            case TaskStates.REJECTED:
                return "sap-icon://message-error";
        }

    }
    public static setTaskStatusIndicationState(state: TaskStates): string {
        switch (state) {
            case TaskStates.SUCCESSFUL:
                return "Indication14";
            case TaskStates.WAIT_APPROVAL:
            case TaskStates.WAIT_CONFIRMATION:
            case TaskStates.INITIAL:
                return "Indication15";
            case TaskStates.EXPIRED:
            case TaskStates.REVOKED:
            case TaskStates.REJECTED:
                return "Indication11";
        }
    }

    public static setSystemType(type: string): string {
        switch (type) {
            case 'SYSTEM':
                return 'System';
            case 'SUBACCOUNT':
                return 'Subaccount';
            default:
                return '';
        }
    }

    public static setSystemStatusIcon(status: string): string {
        switch (status) {
            case SystemStatus.CONNECTED:
                return 'sap-icon://sys-enter-2';
            case SystemStatus.PROCESSING:
                return 'sap-icon://lateness';
            case SystemStatus.FAILED:
                return 'sap-icon://message-error';
            default:
                return '';
        }
    }
    public static setSystemStatusColor(status: string): string {
        switch (status) {
            case 'CONNECTED':
                return 'Indication14';
            case 'PROCESSING':
                return 'Indication15';
            case 'FAILED':
                return 'Indication11';
            default:
                return '';
        }
    }
}