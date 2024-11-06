QUnit.config.autostart = false;

sap.ui.require([
    "sap/ui/core/Core",
    "kms/test/unit/AllTests",
    "sap/ui/qunit/qunit-coverage-istanbul"
], async (Core) => {
    "use strict";

    await Core.ready();
    QUnit.start();
});
