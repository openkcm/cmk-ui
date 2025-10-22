import { ValueState, IndicationColor } from 'sap/ui/core/library';
import { TaskStates, SystemStatus, SystemType, GroupRoles, KeyStates, StateColors } from './Enums';
import { getText } from 'kms/common/Helpers';

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
export function setTaskStatusIndicationState(state: TaskStates): ValueState | IndicationColor {
    switch (state) {
        case TaskStates.SUCCESSFUL:
            return StateColors.GREEN;
        case TaskStates.WAIT_APPROVAL:
        case TaskStates.WAIT_CONFIRMATION:
        case TaskStates.INITIAL:
            return StateColors.BLUE;
        case TaskStates.EXPIRED:
        case TaskStates.REVOKED:
        case TaskStates.REJECTED:
            return StateColors.RED;
        default:
            // Important: Do not return null or undefined or '' as it will break the UI5 control
            // the return value (to set state value of XML ObjectStatus) mustbe  value of the enums sap.ui.core.ValueState or sap.ui.core.IndicationColor
            return StateColors.YELLOW;
    }
}
export function setSystemType(type: SystemType): string {
    switch (type) {
        case SystemType.SYSTEM:
            return getText('SYSTEM');
        case SystemType.SUBACCOUNT:
            return getText('subaccount');
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
export function setGroupRole(role: GroupRoles): string {
    switch (role) {
        case GroupRoles.KEY_ADMINISTRATOR:
            return getText('keyAdministrator');
        case GroupRoles.TENANT_ADMINISTRATOR:
            return getText('tenantAdministrator');
        case GroupRoles.TENANT_AUDITOR:
            return getText('tenantAuditor');
        default:
            return role;
    }
}
export function setKeyStateText(state: string): string {
    switch (state as KeyStates) {
        case KeyStates.DISABLED:
            return getText('disabled');
        case KeyStates.ENABLED:
            return getText('enabled');
        case KeyStates.PENDING_DELETION:
            return getText('pendingDeletion');
        case KeyStates.PENDING_IMPORT:
            return getText('pendingImport');
        case KeyStates.DELETED:
            return getText('deleted');
        case KeyStates.UNKNOWN:
            return getText('unknown');
        default:
            return state;
    }
}
export function setKeyStateColor(state: string): int {
    switch (state as KeyStates) {
        case KeyStates.DISABLED:
            return 2;
        case KeyStates.ENABLED:
            return 8;
        case KeyStates.PENDING_DELETION:
        case KeyStates.DELETED:
            return 5;
        case KeyStates.PENDING_IMPORT:
            return 6;
        case KeyStates.UNKNOWN:
            return 10;
        default:
            return 10;
    }
}
