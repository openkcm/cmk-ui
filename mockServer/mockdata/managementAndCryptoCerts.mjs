const now = new Date();
const old = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
export default (keyConfigurationID) => {
    const generateManagementCerts = (count, keyConfigurationID) => {
        const response = Array.from({ length: count }, (_, index) => (
            {
                rootCA: `http://aia.pki.co.example.com/aia/EXAMPLE%20Cloud%20Root%20CA.crt ${index + 1}`,
                subject: `C=DE,O=EXAMPLE,OU=EXAMPLE,OU=Canary,OU=xxyyzz,L=abcd,CN=01234 ${index + 1}`
            }
        ));
        return {
            value: response,
            count: response.length
        };
    };
    const generatecryptoCerts = (count, keyConfigurationID) => {
        const response = Array.from({ length: count }, (_, index) => (
            {
                name: `Crypto UNIQUE NAME ${index + 1}`,
                rootCA: `http://aia.pki.co.example.com/aia/EXAMPLE%20Cloud%20Root%20CACrypto.crt ${index + 1}`,
                subject: `C=DE,O=EXAMPLE,OU=EXAMPLE,OU=Canary,OU=xxyyzz,L=abcd,CN=01234 ${index + 1}`
            }
        ));
        return {
            value: response,
            count: response.length
        };
    }

    return { tenantDefault: generateManagementCerts(1, keyConfigurationID), crypto: generatecryptoCerts(5, keyConfigurationID) };
}