const UNIT_OPTIONS = [
  "式", "日", "時", "本", "台", "人", "人日", "個", "カット", "点", "枚"
];
const TAX_RATE = 0.10; // 10% 消費税

async function fetchJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

// 合計計算
function recalcTotals() {
  const amountInputs = document.querySelectorAll('#lines tbody .amount');
  let subtotal = 0;

  amountInputs.forEach(inp => {
    const v = parseInt(inp.value || "0", 10);
    if (!isNaN(v)) {
      subtotal += v;
    }
  });

  const tax = Math.floor(subtotal * TAX_RATE); // 端数切り捨て（必要に応じて調整可）
  const total = subtotal + tax;

  const subtotalSpan = document.getElementById('subtotal');
  const taxSpan = document.getElementById('tax');
  const totalSpan = document.getElementById('total');

  if (subtotalSpan) subtotalSpan.textContent = subtotal.toString();
  if (taxSpan) taxSpan.textContent = tax.toString();
  if (totalSpan) totalSpan.textContent = total.toString();
}

async function initRow(tr) {
  const majorSelect    = tr.querySelector('.major');
  const subCodeSelect  = tr.querySelector('.sub-code');
  const subNameInput   = tr.querySelector('.sub-name');
  const detailSelect   = tr.querySelector('.detail');
  const codeInput      = tr.querySelector('.code');
  const unitPriceInput = tr.querySelector('.unit-price');
  const qtyInput       = tr.querySelector('.qty');
  const unitTypeSelect = tr.querySelector('.unit-type');
  const amountInput    = tr.querySelector('.amount');
  const deleteButton   = tr.querySelector('.delete-row');

  // 単位の選択肢をセット
  unitTypeSelect.innerHTML = '<option value="">--</option>';
  UNIT_OPTIONS.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u;
    opt.textContent = u;
    unitTypeSelect.appendChild(opt);
  });

  // 科目（大項目）一覧をロード
  const majors = await fetchJSON('/api/majors');
  majorSelect.innerHTML = '<option value="">--選択--</option>';
  majors.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.code;                      // "01"
    opt.textContent = `${m.code} ${m.name}`; // "01 映像企画関連費"
    majorSelect.appendChild(opt);
  });

  // 科目変更 → 費目コード一覧をロード
  majorSelect.addEventListener('change', async () => {
    const majorCode = majorSelect.value;

    // 一旦リセット
    subCodeSelect.innerHTML = '<option value="">--選択--</option>';
    subNameInput.value = '';
    detailSelect.innerHTML = '<option value="">--選択--</option>';
    resetDetailFields();

    if (!majorCode) {
      recalcTotals();
      return;
    }

    const subs = await fetchJSON(
      `/api/subs?major_code=${encodeURIComponent(majorCode)}`
    );

    // コード → 名称のマップをこの行の中だけで保持
    const subMap = {};
    subs.forEach(s => {
      subMap[s.code] = s.name; // "50" -> "アートディレクター費"
      const opt = document.createElement('option');
      opt.value = s.code;
      opt.textContent = s.code; // 表示は番号だけ
      subCodeSelect.appendChild(opt);
    });

    subCodeSelect._subMap = subMap;
    subCodeSelect._majorCode = majorCode;
  });

  // 費目コード変更 → 費目名表示＆摘要候補をロード
  subCodeSelect.addEventListener('change', async () => {
    const subMap    = subCodeSelect._subMap || {};
    const majorCode = subCodeSelect._majorCode || '';
    const subCode   = subCodeSelect.value;

    subNameInput.value = subMap[subCode] || '';
    detailSelect.innerHTML = '<option value="">--選択--</option>';
    resetDetailFields();

    if (!majorCode || !subCode) {
      recalcTotals();
      return;
    }

    const details = await fetchJSON(
      `/api/details?major_code=${encodeURIComponent(majorCode)}&sub_code=${encodeURIComponent(subCode)}`
    );

    details.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.code;       // 摘要コード 01,02,03...
      opt.textContent = d.name; // 摘要（detail_name）
      opt.dataset.unit = d.unit_price;
      opt.dataset.detailName = d.name;
      detailSelect.appendChild(opt);
    });
  });

  // 摘要変更 → コード・単価・金額を更新
  detailSelect.addEventListener('change', () => {
    const selected = detailSelect.options[detailSelect.selectedIndex];
    if (!selected || !selected.value) {
      resetDetailFields();
      recalcTotals();
      return;
    }

    const majorCode  = majorSelect.value;
    const subCode    = subCodeSelect.value;
    const detailCode = selected.value; // detail_code

    const unit = selected.dataset.unit || '';

    // 管理コード：01-50-01 形式
    codeInput.value = `${majorCode}-${subCode}-${detailCode}`;
    unitPriceInput.value = unit;

    calcAmount();
  });

  function calcAmount() {
    const unitPrice = parseInt(unitPriceInput.value || "0", 10);
    const qty       = parseInt(qtyInput.value || "0", 10);
    const amount    = unitPrice * (isNaN(qty) ? 0 : qty);
    amountInput.value = amount;
    recalcTotals();
  }

  function resetDetailFields() {
    codeInput.value = '';
    unitPriceInput.value = '';
    amountInput.value = '';
  }

  // 数量変更 → 金額再計算
  qtyInput.addEventListener('input', calcAmount);

  // 削除ボタン
  if (deleteButton) {
    deleteButton.onclick = () => {
      const tbody = document.querySelector('#lines tbody');
      if (tbody.rows.length > 1) {
        tbody.removeChild(tr);
      } else {
        // 最後の1行は削除せず中身をリセット
        tr.querySelectorAll('select').forEach(sel => {
          sel.value = '';
          if (sel.classList.contains('unit-type')) {
            // 単位だけは '--' に戻す
            sel.selectedIndex = 0;
          }
        });
        tr.querySelectorAll('input').forEach(inp => {
          if (inp.classList.contains('qty')) {
            inp.value = 1;
          } else {
            inp.value = '';
          }
        });
      }
      recalcTotals();
    };
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const firstRow = document.querySelector('#lines tbody tr');
  await initRow(firstRow);
  recalcTotals(); // 初期表示

  document.getElementById('addRow').addEventListener('click', async () => {
    const tbody   = document.querySelector('#lines tbody');
    const baseRow = tbody.rows[0];
    const newRow  = baseRow.cloneNode(true);

    // 値をリセット
    newRow.querySelectorAll('select').forEach(sel => {
      sel.innerHTML = '';
    });
    newRow.querySelectorAll('input').forEach(inp => {
      if (inp.classList.contains('qty')) {
        inp.value = 1;
      } else {
        inp.value = '';
      }
    });

    tbody.appendChild(newRow);
    await initRow(newRow);
    recalcTotals();
  });
});
