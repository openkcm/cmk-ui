export default () => {

    const generateKeyStores = () => {
        return  {
            default: {
                allowManaged: true,
                allowBYOK: true,
                supportedRegions: [
                    "eu10"
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