export default () => {

    const generateKeyStores = () => {
        return  {
            byok: {
                allow: true,
                supportedRegions: [
                    "eu-central-1",
                    "us-east-1"
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