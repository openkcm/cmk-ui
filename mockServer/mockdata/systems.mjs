export default () => {
    return [
        {
            name: "SuccessFactors_aws",
            region: "eu-central-1",
            sid: "P12",
            applicationRole: "SuccessFactors Learning",
            systemRole: "HEC_HANA",
            status: "connected",
            keyConfig: "Systems Europe"
        },
        {
            name: "SAC_aws",
            region: "eu-central-1",
            sid: "P25",
            applicationRole: "SAP Analytics Cloud",
            systemRole: "HEC_HANA",
            status: "Connecting",
            keyConfig: ""
        },
        {
            name: "Ariba_azure",
            region: "eu-central-1",
            sid: "P29",
            applicationRole: "SAP Ariba",
            systemRole: "HEC_HANA",
            status: "Disconnecting",
            keyConfig: ""
        }
    ];
}