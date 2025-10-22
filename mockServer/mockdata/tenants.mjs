export default () => {
    const genereateTenants = () => {
        const response = {
            value: [
                {
                    id: "tenant1-id",
                    name: "tenant1",
                    region: "eu10"
                },
                {
                    id: "tenant2-id",
                    name: "tenant2",
                    region: "us10"
                }
            ]
        }
        return response;
    };
    return genereateTenants();
}