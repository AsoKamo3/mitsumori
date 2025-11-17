async function fetchJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

async function initRow(tr) {
  const majorSelect   = tr.querySelector('.major');
  const subCodeSelect = tr.querySelector('.sub-code');
  const subNameInput  = tr.querySelector('.sub-name');
  const detailSelect  = tr.querySelector('.detail');
  const codeInput     = tr.querySelector('.code');
  const nameInput     = tr.querySelector('.name');
  const unitInput     = tr.querySelector('.unit');
  const qtyInput      = tr.querySelector('.qty');
  const amountInput   = tr.querySelector('.amount');

  // 大項目一覧をロード（科目）
  const majors = await fetchJSON('/api/majors');
  majorSelect.innerHTML = '<option value="">--選択--</option>';
  majors.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.code;                // "01"
    opt.textContent = `${m.code} ${m.name}`; // "01 映像企画関連費"
    majorSelect.appendChild(opt);
  });

  // 大項目が変わったら → 費目コード一覧を取得・表示
  majorSelect.addEventListener('change', async () => {
    const majorCode = majorSelect.value;
    // リセット
    subCodeSelect.innerHTML = '<option value="">--選択--</option>';
    subNameInput.value = '';
    detailSelect.innerHTML = '<option value="">--選択--</option>';
    resetDetailFields();

    if (!majorCode) return;

    const subs = await fetchJSON(
      `/api/subs?major_code=${encodeURIComponent(majorCode)}`
    );

    // コード→名称のマップをこの行の中で持つ
    const subMap = {};
    subs.forEach(s => {
      subMap[s.code] = s.name;
      const opt = document.createElement('option');
      opt.value = s.code;   // "50"
      opt.textContent = s.code; // 表示は番号だけ
      subCodeSelect.appendChild(opt);
    });

    // 費目コードが変わったら → 費目名称の表示＆摘要候補（details）取得
    subCodeSelect.onchange = async () => {
      const subCode = subCodeSelect.value;
      subNameInput.value = subMap[subCode] || '';  // "アートディレクター費" など表示
      detailSelect.innerHTML = '<option value="">--選択--</option>';
      resetDetailFields();

      if (!subCode) return;

      const details = await fetchJSON(
        `/api/details?major_code=${encodeURIComponent(majorCode)}&sub_code=${encodeURIComponent(subCode)}`
      );

      details.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.code; // detail_code
        // person があれば person をラベルに、なければ品目名
        const label = d.person && d.person.trim() !== "" ? d.person : d.name;
        opt.textContent = label;
        opt.dataset.unit = d.unit_price;
        opt.dataset.person = d.person || '';
        opt.dataset.detailName = d.name; // 品目名（detail_name）を保持
        detailSelect.appendChild(opt);
      });
    };
  });

  // 摘要（detail）が変わったら → コード・品目名・単価・金額を更新
  detailSelect.addEventListener('change', () => {
    const selected = detailSelect.options[detailSelect.selectedIndex];
    if (!selected || !selected.value) {
      resetDetailFields();
      return;
    }

    const majorCode = majorSelect.value;
    const subCode   = subCodeSelect.value;
    const detailCode = selected.value;

    const detailName = selected.dataset.detailName || '';
    const unit       = selected.dataset.unit || '';

    // コードは 01-50-AD の形式
    codeInput.value = `${majorCode}-${subCode}-${detailCode}`;
    // 品目名は detail_name をセット（アートディレクター / 撮影用クレーン Dolly など）
    nameInput.value = detailName;
    unitInput.value = unit;

    calcAmount();
  });

  function calcAmount() {
    const unit = parseInt(unitInput.value || "0", 10);
    const qty  = parseInt(qtyInput.value || "0", 10);
    amountInput.value = unit * qty;
  }

  function resetDetailFields() {
    codeInput.value = '';
    nameInput.value = '';
    unitInput.value = '';
    amountInput.value = '';
  }

  qtyInput.addEventListener('input', calcAmount);
}

window.addEventListener('DOMContentLoaded', async () => {
  const firstRow = document.querySelector('#lines tbody tr');
  await initRow(firstRow);

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
  });
});
