export default () => {

    const generateKeyStores = () => {
        return  {
            systemManaged: {
                allow: true
            },
            byok: {
                allow: true,
                supportedRegions: [
                    { name: "eu-west-1", technicalName: "EU West 1" },
                    { name: "us-east-1", technicalName: "US East 1" },
                    { name: "us-west-2", technicalName: "US West 2" }
                ]
            },
            hyok: {
                allow: true,
                providers: [
                    "AWS"
                ]
            }
        }
    };
    return generateKeyStores();
}
