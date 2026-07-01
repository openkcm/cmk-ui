const now = new Date();
const old = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
export default (keyConfigurationID) => {
    const generateManagementCerts = (count, keyConfigurationID) => {
        const response = Array.from({ length: count }, (_, index) => (
            {
                name: `hyok-default-${index + 1}`,
                rootCA: `http://aia.pki.co.example.com/aia/EXAMPLE%20Cloud%20Root%20CA.crt ${index + 1}`,
                subject: {
                    C: 'DE',
                    CN: `kms-management-${index + 1}`,
                    L: 'abcd',
                    O: 'EXAMPLE',
                    OU: ['EXAMPLE', 'Canary', 'xxyyzz']
                }
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
                subject: {
                    C: 'DE',
                    CN: `kms-crypto-${index + 1}`,
                    L: 'abcd',
                    O: 'EXAMPLE',
                    OU: ['EXAMPLE', 'Canary', 'xxyyzz']
                }
            }
        ));
        return {
            value: response,
            count: response.length
        };
    }

    return { tenantDefault: generateManagementCerts(1, keyConfigurationID), crypto: generatecryptoCerts(5, keyConfigurationID) };
}