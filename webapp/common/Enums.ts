import { IndicationColor } from 'sap/ui/core/library';

export enum KeyStates {
    ENABLED = 'ENABLED',
    DISABLED = 'DISABLED',
    PENDING_DELETION = 'PENDING_DELETION',
    PENDING_IMPORT = 'PENDING_IMPORT',
    DELETED = 'DELETED',
    UNKNOWN = 'UNKNOWN'
}

export enum CloudProviders {
    AWS = 'AWS',
    AZURE = 'AZURE',
    GCP = 'GCP'
}

export enum KeyCreationTypes {
    SYSTEM_MANAGED = 'SYSTEM_MANAGED',
    HYOK = 'HYOK',
    BYOK = 'BYOK'
}

export enum KeyConfigDetailPanelTypes {
    SYSTEM = 'system',
    KEY = 'key'
}

export enum TaskStatus {
    APPROVED = 'APPROVED',
    PENDING = 'PENDING',
    REJECTED = 'REJECTED',
    CONFIRMED = 'CONFIRMED'
}

export enum TaskStateTransitionAction {
    APPROVE = 'APPROVE',
    REJECT = 'REJECT',
    CONFIRM = 'CONFIRM',
    REVOKE = 'REVOKE'
}

export enum TaskStates {
    INITIAL = 'INITIAL',
    REVOKED = 'REVOKED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED',
    WAIT_APPROVAL = 'WAIT_APPROVAL',
    WAIT_CONFIRMATION = 'WAIT_CONFIRMATION',
    EXECUTING = 'EXECUTING',
    SUCCESSFUL = 'SUCCESSFUL',
    FAILED = 'FAILED'
}

export enum ActionTypes {
    UPDATE_STATE = 'UPDATE_STATE',
    UPDATE_PRIMARY_KEY = 'UPDATE_PRIMARY_KEY',
    LINK = 'LINK',
    UNLINK = 'UNLINK',
    SWITCH = 'SWITCH',
    DELETE = 'DELETE'
}

export enum ArtifactTypes {
    KEY = 'KEY',
    KEY_CONFIGURATION = 'KEY_CONFIGURATION',
    SYSTEM = 'SYSTEM'
}

export enum TaskType {
    KEY = 'KEY',
    SYSTEM = 'SYSTEM',
    USER = 'USER'
}

export enum EventChannelIds {
    TASKS = 'TASKS',
    SYSTEMS = 'SYSTEMS',
    KEYCONFIG = 'KEYCONFIG',
    GROUPS = 'GROUPS'
}

export enum EventIDs {
    LOAD_TASKS = 'LOAD_TASKS',
    LOAD_SYSTEMS = 'LOAD_SYSTEMS',
    LOAD_KEY_CONFIG_DETAILS = 'LOAD_KEY_CONFIG_DETAILS',
    LOAD_GROUPS = 'LOAD_GROUPS'
}

export enum HYOKProviders {
    AWS = 'AWS'
}

export enum BYOKProviders {

}

export enum SystemStatus {
    CONNECTED = 'CONNECTED',
    DISCONNECTED = 'DISCONNECTED',
    PROCESSING = 'PROCESSING',
    FAILED = 'FAILED'
}

export enum SystemType {
    SYSTEM = 'SYSTEM',
    SUBACCOUNT = 'SUBACCOUNT'
}

export enum GroupRoles {
    KEY_ADMINISTRATOR = 'KEY_ADMINISTRATOR',
    TENANT_ADMINISTRATOR = 'TENANT_ADMINISTRATOR',
    TENANT_AUDITOR = 'TENANT_AUDITOR'
}

export const StateColors = {
    GREEN: IndicationColor.Indication14,
    BLUE: IndicationColor.Indication15,
    RED: IndicationColor.Indication11,
    YELLOW: IndicationColor.Indication13,
    PURPLE: IndicationColor.Indication17,
    GRAY: IndicationColor.Indication20
};
export const WorkflowStatus = {
    WORKFLOW_ALREADY_EXISTS: 'WORKFLOW_ALREADY_EXISTS',
    WORKFLOW_NOT_REQUIRED: 'WORKFLOW_NOT_REQUIRED',
    WORKFLOW_REQUIRED: 'WORKFLOW_REQUIRED',
    ERROR: 'ERROR'
};

export const UserRoles = {
    KEY_ADMINISTRATOR: 'KEY_ADMINISTRATOR',
    TENANT_ADMINISTRATOR: 'TENANT_ADMINISTRATOR',
    TENANT_AUDITOR: 'TENANT_AUDITOR'
};

export default { KeyStates, CloudProviders, KeyCreationTypes, KeyConfigDetailPanelTypes, TaskStatus, TaskStateTransitionAction, TaskStates, ActionTypes, ArtifactTypes, TaskType, EventChannelIds, EventIDs, HYOKProviders, BYOKProviders, SystemStatus, SystemType, GroupRoles, WorkflowStatus };
