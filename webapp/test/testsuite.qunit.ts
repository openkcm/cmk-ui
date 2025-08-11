export default {
    name: 'KMS Unit Test Suite',
    defaults: {
        page: 'ui5://test-resources/kms/Test.qunit.html?testsuite={suite}&test={name}',
        qunit: {
            version: 2
        },
        ui5: {
            theme: 'sap_horizon'
        },
        loader: {
            paths: {
                kms: '../'
            }
        }
    },
    tests: {
        'unit/unitTests': {
            title: 'Unit tests for KMS'
        }
    }
};
