import { TaskStates, SystemStatus } from './Enums';

export function setTaskStatus(state: TaskStates): string {
    switch (state) {
        case TaskStates.SUCCESSFUL:
            return 'sap-icon://message-success';
        case TaskStates.WAIT_APPROVAL:
        case TaskStates.WAIT_CONFIRMATION:
        case TaskStates.INITIAL:
            return 'sap-icon://lateness';
        case TaskStates.EXPIRED:
        case TaskStates.FAILED:
        case TaskStates.REVOKED:
        case TaskStates.REJECTED:
            return 'sap-icon://message-error';
        default:
            return 'sap-icon://question-mark';
    }
}
export function setTaskStatusIndicationState(state: TaskStates): string {
    switch (state) {
        case TaskStates.SUCCESSFUL:
            return 'Indication14';
        case TaskStates.WAIT_APPROVAL:
        case TaskStates.WAIT_CONFIRMATION:
        case TaskStates.INITIAL:
            return 'Indication15';
        case TaskStates.EXPIRED:
        case TaskStates.REVOKED:
        case TaskStates.REJECTED:
            return 'Indication11';
        default:
            return '';
    }
}
export function setSystemType(type: string): string {
    switch (type) {
        case 'SYSTEM':
            return 'System';
        case 'SUBACCOUNT':
            return 'Subaccount';
        default:
            return '';
    }
}
export function setSystemRole(role?: string, roleID?: string): string {
    if (role && roleID) {
        return `${roleID} - ${role}`;
    }
    if (roleID) {
        return roleID;
    }
    return role || '';
}
export function setSystemStatusIcon(status: SystemStatus | undefined): string | null {
    switch (status) {
        case SystemStatus.CONNECTED:
            return 'sap-icon://sys-enter-2';
        case SystemStatus.PROCESSING:
            return 'sap-icon://lateness';
        case SystemStatus.FAILED:
            return 'sap-icon://message-error';
        default:
            return null;
    }
}
export function setSystemStatusColor(status: SystemStatus | undefined): string | null {
    switch (status) {
        case SystemStatus.CONNECTED:
            return 'Indication14';
        case SystemStatus.PROCESSING:
            return 'Indication15';
        case SystemStatus.FAILED:
            return 'Indication11';
        default:
            return null;
    }
}
export function formatCert(rootCA: string, subject: string): string {
    const cert = `Root CA:\n ${rootCA}\nSubject:\n${subject}`;
    return cert;
}
