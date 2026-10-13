const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseCSV, parseAmount, formatAmount, compare, exportCSV, MAX_ROWS } = require("../docs/engine.js");
const map = { leftKey: "id", leftAmount: "amount", rightKey: "id", rightAmount: "amount" };
const run = (a, b) => compare(parseCSV(a), parseCSV(b), map);

test("order-independent matching preserves leading zeros and exact decimal amounts", () => {
  const result = run("id,amount\n0001,0.300000\n0002,9007199254740993.01", "id,amount\n0002,9007199254740993.010\n0001,0.3");
  assert.deepEqual(result.counts, { same: 2, changed: 0, left_only: 0, right_only: 0 });
  assert.equal(result.rows[0].id, "0001");
});
test("sample distinguishes changes and missing keys, retaining record numbers", () => {
  const result = run("id,amount\n0001,199\n0002,88.50\n0003,39.90\n0004,12", "id,amount\n0004,12\n0002,85.50\n0001,199\n0005,49");
  assert.deepEqual(result.counts, { same: 2, changed: 1, left_only: 1, right_only: 1 });
  assert.equal(result.rows[1].delta, "3.00");
  assert.equal(result.rows[1].leftRecord, 3);
  assert.equal(result.rows.at(-1).delta, "");
});
test("UTF-8 BOM, CRLF, escaped quotes, commas and multiline fields parse intact", () => {
  const table = parseCSV('\uFEFFid,amount,note\r\n"a,b",1.2,"line 1\nline ""2"""\r\n');
  assert.deepEqual(table.rows, [["a,b", "1.2", 'line 1\nline "2"']]);
});
test("blank physical lines do not manufacture records", () => {
  assert.equal(parseCSV("id,amount\n\n001,1\n\n").rows.length, 1);
});
test("malformed CSV fails closed", () => {
  for (const text of ['id,amount\n"001,1', 'id,amount\n001,1,extra', 'id,id\n1,2', 'id,\n1,2', 'id,amount\n"x"oops,2', 'id,amount\nx"y,1', 'id,amount\n', 'id,amount\nx,1\0']) {
    assert.throws(() => parseCSV(text));
  }
});
test("duplicate and blank keys abort instead of choosing a record or summing", () => {
  assert.throws(() => run("id,amount\na,1\n a ,2", "id,amount\na,1"), /重复编号/);
  assert.throws(() => run("id,amount\n,1", "id,amount\na,1"), /编号为空/);
});
test("invalid, currency-decorated, grouped and over-precision amounts abort", () => {
  for (const amount of ["", "NaN", "Infinity", "1e3", "$29.00", "1,000.00", "0.1234567", ".5", "1.2.3"]) assert.throws(() => parseAmount(amount));
  assert.throws(() => run("id,amount\na,invalid", "id,amount\na,1"), /左表第 2/);
});
test("negative refunds and six decimal places compare with no floating point rounding", () => {
  assert.equal(formatAmount(parseAmount("-0.1") - parseAmount("0.2")), "-0.30");
  assert.equal(formatAmount(parseAmount("0.000001")), "0.000001");
  assert.equal(formatAmount(parseAmount("-0.00")), "0.00");
  assert.equal(formatAmount(parseAmount("+00012.5000")), "12.50");
});
test("column mapping is explicit and cannot reuse a single column", () => {
  const left = parseCSV("订单,金额\na,1"), right = parseCSV("编号,实收\na,2");
  assert.equal(compare(left, right, { leftKey: "订单", leftAmount: "金额", rightKey: "编号", rightAmount: "实收" }).rows[0].delta, "-1.00");
  assert.throws(() => compare(left, right, map), /请选择/);
  assert.throws(() => compare(left, right, { leftKey: "订单", leftAmount: "订单", rightKey: "编号", rightAmount: "实收" }), /请选择/);
});
test("data limit is enforced, including the exact boundary", () => {
  const text = "id,amount\n" + Array.from({ length: MAX_ROWS }, (_, i) => `${i},1`).join("\n");
  assert.equal(parseCSV(text).rows.length, MAX_ROWS);
  assert.throws(() => parseCSV(text + "\nextra,1"), /最多支持/);
  assert.throws(() => parseCSV("x".repeat(5 * 1024 * 1024 + 1)), /文件过大/);
});
test("CSV export escapes formulas, commas, quotes and newlines while preserving exact differences", () => {
  const result = run('id,amount\n"=1+1",5\n"a,""b""",-2\n"line\nbreak",1', 'id,amount\nx,1');
  const csv = exportCSV(result.rows);
  assert.ok(csv.startsWith("\uFEFF"));
  const exported = parseCSV(csv);
  assert.equal(exported.rows[0][1], "'=1+1");
  assert.equal(exported.rows[1][1], 'a,"b"');
  assert.equal(exported.rows[1][2], "-2");
  assert.equal(exported.rows[2][1], "line\nbreak");
  for (const id of ["+cmd", "-cmd", "@SUM(1)", "\t=HYPERLINK(1)"]) {
    assert.ok(exportCSV([{ id, status: "left_only", left: "1", right: "", delta: "", leftRecord: 2, rightRecord: "" }]).includes("'" + id));
  }
});
test("case-sensitive and internally spaced identifiers remain distinct", () => {
  const result = run("id,amount\nAb,1\nA b,2", "id,amount\nab,1\nA b,2");
  assert.deepEqual(result.counts, { same: 1, changed: 0, left_only: 1, right_only: 1 });
});
test("large values and small deltas are not rounded away", () => {
  const result = run("id,amount\na,9007199254740993.010001", "id,amount\na,9007199254740993.010000");
  assert.equal(result.rows[0].delta, "0.000001");
});
test("all differences are exported, independent of the UI preview limit", () => {
  const result = run("id,amount\n" + Array.from({length: 120}, (_, i) => `${i},2`).join("\n"), "id,amount\n" + Array.from({length: 120}, (_, i) => `${i},1`).join("\n"));
  assert.equal(parseCSV(exportCSV(result.rows)).rows.length, 120);
});
