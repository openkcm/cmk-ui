import { KeyVersionStates } from "kms/common/Enums";

export interface System {
    id: string;
    keyConfiguration: KeyConfig;
    name: string;
    key: string;
};
export interface Groups {
    id: string;
    groups: Groups[];
    name: string;
};
export interface User {
    id: string;
    name: string;
    email: string;
    groupName: string;
};
export interface KeyConfig {
    name: string;
    id: string;
    description: string;
    adminGroupID: string;
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
    primary: boolean,
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
    id: string;
    status: KeyVersionStates;
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