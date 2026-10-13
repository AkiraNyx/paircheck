(() => {
  const core = globalThis.PairCheck;
  const $ = id => document.getElementById(id);
  const tables = { left: null, right: null };
  const versions = { left: 0, right: 0 };
  let result = null;

  function message(text, error = false) {
    $("message").textContent = text;
    $("message").classList.toggle("error", error);
  }

  function invalidate() {
    result = null;
    $("results").hidden = true;
    $("result-body").replaceChildren();
    $("compare").disabled = !(tables.left && tables.right &&
      ["left-key", "left-amount", "right-key", "right-amount"].every(id => $(id).value));
  }

  function setTable(side, table, name, demo = false) {
    tables[side] = table;
    $(side + "-meta").textContent = `${name} · ${table.rows.length.toLocaleString()} 条`;
    $(side + "-meta").title = name;
    for (const kind of ["key", "amount"]) {
      const select = $(side + "-" + kind);
      select.replaceChildren(new Option("请选择" + (kind === "key" ? "编号" : "金额") + "列", ""));
      for (const header of table.headers) select.add(new Option(header, header));
      select.disabled = false;
      if (demo) select.value = table.headers[kind === "key" ? 0 : 1];
    }
    invalidate();
  }

  function resetSide(side) {
    tables[side] = null;
    $(side + "-meta").textContent = "尚未选择";
    $(side + "-meta").removeAttribute("title");
    for (const kind of ["key", "amount"]) {
      const select = $(side + "-" + kind);
      select.replaceChildren(new Option("先选择文件", ""));
      select.disabled = true;
    }
    invalidate();
  }

  async function loadFile(side) {
    const token = ++versions[side];
    const file = $(side + "-file").files[0];
    resetSide(side);
    if (!file) return;
    message(`正在本地读取${side === "left" ? "左表" : "右表"}…`);
    try {
      if (!/\.csv$/i.test(file.name)) throw new Error("请选择 .csv 文件；Excel 文件请先另存为 CSV。");
      if (file.size > 5 * 1024 * 1024) throw new Error("每份 CSV 文件上限为 5 MB。");
      const bytes = await file.arrayBuffer();
      if (token !== versions[side]) return;
      let text;
      try { text = new TextDecoder($(side + "-encoding").value, { fatal: true }).decode(bytes); }
      catch { throw new Error("无法按当前编码读取文件，请检查“文件编码”，或另存为 CSV UTF-8。"); }
      setTable(side, core.parseCSV(text), file.name);
      message("文件已在本地读取。请为每张表明确选择编号列和金额列。");
    } catch (error) {
      if (token === versions[side]) message(error.message, true);
    }
  }

  function render() {
    if (!result) return;
    const rows = $("show-all").checked ? result.rows : result.rows.filter(x => x.status !== "same");
    const tbody = $("result-body");
    tbody.replaceChildren();
    for (const row of rows.slice(0, 100)) {
      const tr = document.createElement("tr");
      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "status " + row.status;
      badge.textContent = core.statusLabels[row.status];
      statusCell.append(badge); tr.append(statusCell);
      for (const value of [row.id, row.left || "—", row.right || "—", row.delta || "—", `${row.leftRecord || "—"} / ${row.rightRecord || "—"}`]) {
        const cell = document.createElement("td");
        cell.textContent = value; cell.title = value; tr.append(cell);
      }
      tbody.append(tr);
    }
    if (!rows.length) {
      const tr = document.createElement("tr"), td = document.createElement("td");
      td.colSpan = 6; td.className = "empty"; td.textContent = "所选编号与金额全部一致，没有异常记录。";
      tr.append(td); tbody.append(tr);
    }
    $("preview-limit").textContent = rows.length > 100 ? `当前仅预览前 100 条；导出包含全部 ${result.rows.filter(x => x.status !== "same").length} 条异常。` : "导出包含全部异常记录，并保留原表记录号。";
  }

  function run() {
    invalidate();
    if (!tables.left || !tables.right) return;
    try {
      result = core.compare(tables.left, tables.right, {
        leftKey: $("left-key").value, leftAmount: $("left-amount").value,
        rightKey: $("right-key").value, rightAmount: $("right-amount").value
      });
      for (const [status, count] of Object.entries(result.counts)) $("count-" + status).textContent = count.toLocaleString();
      const differences = result.rows.length - result.counts.same;
      $("result-note").textContent = `左表 ${result.leftCount.toLocaleString()} 条 · 右表 ${result.rightCount.toLocaleString()} 条 · ${differences.toLocaleString()} 条异常`;
      $("results").hidden = false;
      message(`核对完成：${result.counts.same.toLocaleString()} 条一致，${differences.toLocaleString()} 条异常。请结合业务口径复核。`);
      render();
    } catch (error) { message(error.message, true); }
  }

  function demo(scroll = false) {
    for (const side of ["left", "right"]) {
      versions[side]++;
      $(side + "-file").value = "";
      $(side + "-encoding").value = "utf-8";
    }
    setTable("left", core.parseCSV("订单编号,订单金额\n0001,199.00\n0002,88.50\n0003,39.90\n0004,12.00\n"), "合成订单样例.csv", true);
    setTable("right", core.parseCSV("交易编号,实收金额\n0004,12.00\n0002,85.50\n0001,199.00\n0005,49.00\n"), "合成收款样例.csv", true);
    $("show-all").checked = false;
    run();
    if (scroll) $("workbench").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  for (const side of ["left", "right"]) {
    $(side + "-file").addEventListener("change", () => loadFile(side));
    $(side + "-encoding").addEventListener("change", () => { if ($(side + "-file").files.length) loadFile(side); });
    for (const kind of ["key", "amount"]) $(side + "-" + kind).addEventListener("change", () => {
      invalidate(); message("字段已改变，请重新核对。");
    });
  }
  $("compare").addEventListener("click", run);
  $("load-demo").addEventListener("click", () => demo());
  $("hero-demo").addEventListener("click", () => demo(true));
  $("show-all").addEventListener("change", render);
  $("clear").addEventListener("click", () => {
    for (const side of ["left", "right"]) {
      versions[side]++; $(side + "-file").value = ""; resetSide(side);
    }
    $("show-all").checked = false;
    message("已清空浏览器中的当前数据。");
  });
  $("export").addEventListener("click", () => {
    if (!result) return;
    const data = core.exportCSV(result.rows.filter(row => row.status !== "same"));
    const url = URL.createObjectURL(new Blob([data], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "paircheck-differences.csv"; document.body.append(link);
    link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    message("异常报告已生成；文件包含原始编号和金额，请妥善保管。");
  });
})();
