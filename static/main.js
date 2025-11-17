async function fetchJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

async function initRow(tr) {
  const majorSelect  = tr.querySelector('.major');
  const subSelect    = tr.querySelector('.sub');
  const detailSelect = tr.querySelector('.detail');
  const codeInput    = tr.querySelector('.code');
  const nameInput    = tr.querySelector('.name');
  const personInput  = tr.querySelector('.person');
  const unitInput    = tr.querySelector('.unit');
  const qtyInput     = tr.querySelector('.qty');
  const amountInput  = tr.querySelector('.amount');

  // 大項目一覧をロード
  const majors = await fetchJSON('/api/majors');
  majorSelect.innerHTML = '<option value="">--選択--</option>';
  majors.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.code;
    opt.textContent = `${m.code} ${m.name}`;
    majorSelect.appendChild(opt);
  });

  majorSelect.addEventListener('change', async () => {
    const majorCode = majorSelect.value;
    subSelect.innerHTML = '<option value="">--選択--</option>';
    detailSelect.innerHTML = '<option value="">--選択--</option>';
    resetDetailFields();
    if (!majorCode) return;

    const subs = await fetchJSON(`/api/subs?major_code=${encodeURIComponent(majorCode)}`);
    subs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.code;
      opt.textContent = `${s.code} ${s.name}`;
      subSelect.appendChild(opt);
    });
  });

  subSelect.addEventListener('change', async () => {
    const majorCode = majorSelect.value;
    const subCode   = subSelect.value;
    detailSelect.innerHTML = '<option value="">--選択--</option>';
    resetDetailFields();
    if (!majorCode || !subCode) return;

    const details = await fetchJSON(
      `/api/details?major_code=${encodeURIComponent(majorCode)}&sub_code=${encodeURIComponent(subCode)}`
    );
    details.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.code;
      opt.textContent = d.name;
      opt.dataset.unit = d.unit_price;
      opt.dataset.person = d.person || '';
      detailSelect.appendChild(opt);
    });
  });

  detailSelect.addEventListener('change', () => {
    const selected = detailSelect.options[detailSelect.selectedIndex];
    if (!selected || !selected.value) {
      resetDetailFields();
      return;
    }

    const majorCode  = majorSelect.value;
    const subCode    = subSelect.value;
    const detailCode = selected.value;

    codeInput.value   = `${majorCode}-${subCode}-${detailCode}`;
    nameInput.value   = selected.textContent;
    personInput.value = selected.dataset.person || '';
    unitInput.value   = selected.dataset.unit || '';
    calcAmount();
  });

  function calcAmount() {
    const unit = parseInt(unitInput.value || "0", 10);
    const qty  = parseInt(qtyInput.value || "0", 10);
    amountInput.value = unit * qty;
  }

  function resetDetailFields() {
    codeInput.value   = '';
    nameInput.value   = '';
    personInput.value = '';
    unitInput.value   = '';
    amountInput.value = '';
  }

  qtyInput.addEventListener('input', calcAmount);
}

window.addEventListener('DOMContentLoaded', async () => {
  const firstRow = document.querySelector('#lines tbody tr');
  await initRow(firstRow);

  document.getElementById('addRow').addEventListener('click', async () => {
    const tbody  = document.querySelector('#lines tbody');
    const baseRow = tbody.rows[0];
    const newRow = baseRow.cloneNode(true);

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
