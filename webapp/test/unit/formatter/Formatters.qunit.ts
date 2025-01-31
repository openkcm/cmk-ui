import Formatters from "kms/common/Formatters";

QUnit.module("Formatters Unit Tests");

QUnit.test("The timeElapsedSince method with a date 3 years old", function (assert) {
    const date = new Date("2021-12-31T23:59:59Z");
    const result = Formatters.timeElapsedSince(date.toISOString());
    assert.strictEqual(result, "3 Years");
});