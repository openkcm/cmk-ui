export default (systemId, keyConfigurationID, operation) => {

    let systems = [{
        id: '12345-23534-34534-3375890',
        identifier: 'JBN',
        keyConfigurationID: '345345-354354-34535-34534536',
        keyConfigurationName: `Key Config One`,
        region: 'eu-central-1',
        metadata: {
            canCancel: true
        },
        properties: {
            roleName: "ABC Analytics Cloud",
            roleID: 'MML',
            externalName: `System One`
        },
        status: 'FAILED',
        type: "SYSTEM"
    },{
        id: '345237-45744-34534-3375890',
        identifier: 'MVP',
        keyConfigurationID: '45634-619854-34535-34534536',
        keyConfigurationName: `Key Config One`,
        region: 'us-east-1',
        metadata: {
            canCancel: false
        },
        properties: {
            roleName: "Main System",
            roleID: 'ASD',
            externalName: `System Two`
        },
        status: 'PROCESSING',
        type: "SYSTEM"
    },{
        id: '98765-45744-34534-3375890',
        identifier: 'IVR',
        keyConfigurationID: '45634-619854-34535-34534536',
        keyConfigurationName: `Key Config One`,
        region: 'us-east-1',
        metadata: {
            canCancel: false
        },
        properties: {
            roleName: "Role 2",
            roleID: 'QTI',
            externalName: `System Nine`
        },
        status: 'PROCESSING',
        type: "SYSTEM"
    },{
        id: '745565-565744-34534-3375890',
        identifier: 'TUI',
        region: 'us-east-1',
        metadata: {
            canCancel: false
        },
        properties: {
            roleName: "Learning",
            roleID: 'DSA',
            externalName: `System Cobra`
        },
        status: 'DISCONNECTED',
        type: "SYSTEM"
    },{
        id: '43567-56744-34534-3375890',
        identifier: 'XYZ',
        keyConfigurationID: '45634-619854-34535-34534536',
        keyConfigurationName: `Key Config One`,
        region: 'us-west-2',
        metadata: {
            canCancel: true
        },
        properties: {
            roleName: "System Capital",
            roleID: 'ASDF',
            externalName: `System Mars`
        },
        status: 'FAILED',
        type: "SYSTEM"
    }];

    if (systemId && !keyConfigurationID && operation === 'getSystems') {
        return systems.find(system => system.id === systemId);
    } else if(!systemId && !keyConfigurationID && operation === 'getSystems') {
        return {
            value: systems,
            count: systems.length
        };
    } else if(systemId && !keyConfigurationID && operation === 'cancel') {
        return {
            id: '12345-23534-34534-3375890',
            status: 'CONNECTED',
            metadata: {
                canCancel: true
            },
            type: "SYSTEM"
        };
    }
}