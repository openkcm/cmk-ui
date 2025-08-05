import { ActionTypes, ArtifactTypes, KeyCreationTypes, KeyStates, TaskStates, TaskStatus, SystemStatus } from "kms/common/Enums";

export interface Config {
    apiBaseUrl: string;
}
export interface System {
    id: string;
    externalID: string;
    region: string;
    name: string;
    type: string;
    role: string;
    roleID: string;
    status: SystemStatus;
    keyConfigurationName: string;
    keyConfigurationID: string;
};
export interface Groups {
    id: string;
    groups: Groups[];
    name: string;
    edit: boolean;
};
export interface Group {
    name: string;
    description: string;
};
export interface KeyConfig {
    name: string;
    id: string;
    description: string;
    adminGroupID: string;
    canConnectSystems: boolean;
    metadata: {
        creatorID: string,
        creatorName: string,
        createdAt: string,
        updatedAt: string,
        totalKeys: number,
        totalSystems: number
    },
    primaryKey?: Key;
}
export interface Key {
    id: string,
    name: string,
    description: string,
    enabled: boolean,
    isPrimary: boolean,
    state: string,
    customerHeld: boolean,
    nativeId: string,
    algorithm: string,
    provider: string,
    region: string,
    metadata: {
        createdBy: string,
        createdAt: string,
        updatedBy: string,
        updatedAt: string,
        imported: boolean,
        totalVersions: number,
        primaryVersion: number,
    }
};
export interface KeyVersion {
    version: number;
    state: KeyStates;
    isPrimary: boolean;
    metadata: {
        createdAt: string;
        updatedAt: string;
    }
};
export interface Label {
    id: string;
    name: string;
    value: string;
};

export interface Task {
    id: string,
    initiatorID: string,
    initiatorName: string,
    state: TaskStates,
    actionType: ActionTypes,
    artifactType: ArtifactTypes,
    artifactID: string,
    parameters?: string
    failureReason: string,
    metadata: {
        createdAt: string,
        updatedAt: string
    }
}

export interface Approver {
    id: string,
    name: string,
    decision: TaskStatus.APPROVED | TaskStatus.REJECTED | TaskStatus.PENDING
}

//Change the types once the backlend schema is ready for HYOK
export interface MangedKeyPayload {
    name: string,
    keyConfigurationID: string,
    type: KeyCreationTypes,
    description: string,
    algorithm: string,
    region: string,
    provider: string,
    enabled: boolean
}
export interface HyokKeyPayload {
    name: string,
    keyConfigurationID: string,
    type: KeyCreationTypes,
    description: string,
    enabled: boolean,
    nativeId: string
}