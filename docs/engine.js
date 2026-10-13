/* PairCheck: deterministic browser-local comparison, no network or storage. */
(() => {
  const MAX_ROWS = 20000;
  const SCALE = 1000000n;

  function parseCSV(input) {
    const text = input.replace(/^\uFEFF/, "");
    if (text.length > 5 * 1024 * 1024) throw new Error("文件过大：每份 CSV 上限为 5 MB。");
    if (text.includes("\0")) throw new Error("文件包含空字符，请导出为文本 CSV。");
    const records = [];
    let row = [], field = "", quoted = false, closed = false, touched = false;
    const endField = () => { row.push(field); field = ""; closed = false; };
    const endRow = () => {
      endField();
      if (touched) records.push(row);
      if (records.length > MAX_ROWS + 1) throw new Error(`每份 CSV 最多支持 ${MAX_ROWS} 条数据。`);
      row = []; touched = false;
    };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') { quoted = false; closed = true; }
        else field += c;
      } else if (c === ",") { touched = true; endField(); }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        endRow();
      } else if (c === '"' && field === "" && !closed) { quoted = true; touched = true; }
      else {
        if (closed || c === '"') throw new Error(`第 ${records.length + 1} 条记录的引号格式无效。`);
        field += c; touched = true;
      }
    }
    if (quoted) throw new Error("CSV 中有未闭合的引号。");
    if (touched || row.length || field) endRow();
    if (records.length < 2) throw new Error("CSV 至少需要表头和一条数据。");
    const headers = records.shift().map(x => x.trim());
    if (headers.some(x => !x) || new Set(headers).size !== headers.length) {
      throw new Error("表头不能留空或重复，请先修正列名。");
    }
    records.forEach((record, i) => {
      if (record.length !== headers.length) throw new Error(`第 ${i + 2} 条记录的列数与表头不一致。`);
    });
    return { headers, rows: records };
  }

  function parseAmount(value) {
    const match = /^([+-]?)(\d{1,24})(?:\.(\d{1,6}))?$/.exec(value.trim());
    if (!match) throw new Error("金额须为十进制数，最多 6 位小数，不含货币符号或千分位。");
    const amount = BigInt(match[2]) * SCALE + BigInt((match[3] || "").padEnd(6, "0"));
    return match[1] === "-" ? -amount : amount;
  }

  function formatAmount(amount) {
    const absolute = amount < 0n ? -amount : amount;
    const fraction = (absolute % SCALE).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
    return `${amount < 0n ? "-" : ""}${absolute / SCALE}.${fraction}`;
  }

  function indexTable(table, keyColumn, amountColumn, side) {
    const keyIndex = table.headers.indexOf(keyColumn), amountIndex = table.headers.indexOf(amountColumn);
    if (keyIndex < 0 || amountIndex < 0 || keyIndex === amountIndex) {
      throw new Error(`${side}：请选择两个不同的列，分别用作编号和金额。`);
    }
    const indexed = new Map();
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i], id = row[keyIndex].trim(), record = i + 2;
      if (!id) throw new Error(`${side}第 ${record} 条记录的编号为空。`);
      if (indexed.has(id)) throw new Error(`${side}存在重复编号「${id.slice(0, 80)}」（记录 ${indexed.get(id).record}、${record}）。请先汇总或修正，工具不会自行合并。`);
      let amount;
      try { amount = parseAmount(row[amountIndex]); }
      catch (error) { throw new Error(`${side}第 ${record} 条记录：${error.message}`); }
      indexed.set(id, { amount, raw: row[amountIndex], record });
    }
    return indexed;
  }

  function compare(left, right, mapping) {
    const a = indexTable(left, mapping.leftKey, mapping.leftAmount, "左表");
    const b = indexTable(right, mapping.rightKey, mapping.rightAmount, "右表");
    const counts = { same: 0, changed: 0, left_only: 0, right_only: 0 };
    const rows = [];
    for (const id of new Set([...a.keys(), ...b.keys()])) {
      const l = a.get(id), r = b.get(id);
      const status = !l ? "right_only" : !r ? "left_only" : l.amount === r.amount ? "same" : "changed";
      counts[status]++;
      rows.push({ id, status, left: l?.raw ?? "", right: r?.raw ?? "", leftRecord: l?.record ?? "", rightRecord: r?.record ?? "", delta: l && r ? formatAmount(l.amount - r.amount) : "" });
    }
    return { rows, counts, leftCount: left.rows.length, rightCount: right.rows.length };
  }

  const statusLabels = { same: "一致", changed: "金额不同", left_only: "仅左表", right_only: "仅右表" };
  function exportCSV(rows) {
    const cell = value => {
      let text = String(value);
      // Prevent spreadsheet formula execution when exported identifiers are opened in Excel.
      if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) && !/^[+-]?\d+(?:\.\d+)?$/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const data = [["状态", "编号", "左表原金额", "右表原金额", "差额（左减右）", "左表记录号", "右表记录号"]];
    for (const row of rows) data.push([statusLabels[row.status], row.id, row.left, row.right, row.delta, row.leftRecord, row.rightRecord]);
    return "\uFEFF" + data.map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
  }

  const api = { parseCSV, parseAmount, formatAmount, compare, exportCSV, statusLabels, MAX_ROWS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.PairCheck = api;
})();
