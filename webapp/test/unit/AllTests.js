sap.ui.define([
], function () {
    "use strict";
    QUnit.module("addone");

    function addOne(input) {
        return input + 1;
    }
    QUnit.test("Should add one", function (assert) {
        assert.equal(addOne(1), 2);
    });

});