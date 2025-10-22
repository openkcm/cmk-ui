import { ActionTypes, ArtifactTypes, KeyCreationTypes, KeyStates, TaskStates, TaskStatus, SystemStatus, HYOKProviders, BYOKProviders } from 'kms/common/Enums';

export interface Config {
    apiBaseUrl: string
}
export interface System {
    id: string
    identifier: string
    region: string
    type: string
    properties?: object
    status: SystemStatus
    keyConfigurationName: string
    keyConfigurationID: string
};
export interface Groups {
    id: string
    groups: Groups[]
    name: string
    edit: boolean
};
export interface Group {
    name: string
    description: string
    id: string
    iamIdentifier: string
    role: string
};
export interface KeyConfig {
    name: string
    id: string
    description: string
    adminGroupID: string
    adminGroup?: Group
    canConnectSystems: boolean
    metadata: {
        creatorID: string
        creatorName: string
        createdAt: string
        updatedAt: string
        totalKeys: number
        totalSystems: number
    }
    primaryKeyID?: string
}
export interface Key {
    id: string
    name: string
    description: string
    enabled: boolean
    isPrimary: boolean
    state: KeyStates
    customerHeld: boolean
    nativeId: string
    algorithm: string
    provider: string
    region: string
    type: KeyCreationTypes
    metadata: {
        createdBy: string
        createdAt: string
        updatedBy: string
        updatedAt: string
        imported: boolean
        totalVersions: number
        primaryVersion: number
    }
};
export interface KeyVersion {
    version: number
    state: KeyStates
    isPrimary: boolean
    metadata: {
        createdAt: string
        updatedAt: string
    }
};
export interface Label {
    id: string
    name: string
    value: string
};

export interface Task {
    id: string
    initiatorID: string
    initiatorName: string
    state: TaskStates
    actionType: ActionTypes
    artifactType: ArtifactTypes
    artifactID: string
    parameters?: string
    failureReason: string
    metadata: {
        createdAt: string
        updatedAt: string
    }
}

export interface Approver {
    id: string
    name: string
    decision: TaskStatus.APPROVED | TaskStatus.REJECTED | TaskStatus.PENDING
}
export interface MangedKeyPayload {
    name: string
    keyConfigurationID: string
    type: KeyCreationTypes
    description: string
    algorithm: string
    region: string
    enabled: boolean
}
export interface AWSAccessDetails {
    roleArn: string
    trustAnchorArn: string
    profileArn: string
};
export interface AccessDetails {
    management: AWSAccessDetails
    crypto: Record<string, AWSAccessDetails>
}
export interface HyokKeyPayload {
    name: string
    nativeId: string
    type: KeyCreationTypes
    keyConfigurationID: string
    description?: string
    enabled?: boolean
    provider: HYOKProviders | BYOKProviders
    accessDetails: AccessDetails
}
export interface AWScertificates {
    name: string
    rootCA: string
    subject: string
}
export interface hyokAWSManagementCertInput {
    trustAnchorARN: string | null
    roleARN: string | null
    rootCA: string | null
}
export interface hyokAWSCryptoCertInput {
    selectedCryptoRolesCertKeys?: string[]
    selectedCryptoCerts?: AWScertificates[]
    trustAnchorCryptoARN: string | null
    roleCryptoARN: string | null
    rootCryptoCA: string | null
}
export interface KeystoreResponse {
    default: {
        allowManaged: boolean
        allowBYOK: boolean
        supportedRegions: string[]
    }
    hyok: {
        allow: boolean
        providers: HYOKProviders[]
    }
}
