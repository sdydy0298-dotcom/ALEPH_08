const items = [
  {
    title: '맡은 일에 최선을 다하는 사람',
    s: '과제를 진행하면서 여러 요구사항을 한 번에 구현하면 빠뜨리는 부분이 생길 수 있는 상황이었습니다.',
    a: '요구사항을 표로 정리하고, 레이아웃과 기능을 단계별로 확인하면서 하나씩 수정해 나갔습니다.',
    r: '요구사항을 놓치지 않고 점검할 수 있었고, 문제를 발견할 때마다 수정하면서 결과물을 점차 완성도 있게 다듬을 수 있었습니다.',
    link: 'https://drive.google.com/drive/folders/10MOFXeU7zZUAiHGCPaa-F-zkM6A3XjQl?usp=sharing',
    doc: 'Google Drive 문서 보기 ↗'
  },
  {
    title: '스스로 답을 찾아가는 사람',
    s: '기술을 공부하거나 업무를 진행할 때 결과만 확인하고 넘어갈 수도 있는 부분에서 의문이 생기곤 했습니다.',
    a: '이해되지 않는 부분은 자료를 찾아보고 직접 확인하면서, 스스로 납득할 수 있을 때까지 답을 찾아갔습니다.',
    r: '기능을 단순히 사용하는 데서 그치지 않고 원리까지 더 깊이 이해할 수 있었고, 알아가는 과정 자체에도 흥미를 느꼈습니다.',
    link: '',
    doc: ''
  },
  {
    title: '새로운 도전을 두려워하지 않는 사람',
    s: '백엔드 개발을 경험한 뒤, 이전과는 다른 Windows 시스템·보안 개발 분야를 접하게 되었습니다.',
    a: '익숙한 분야에만 머무르지 않고 새로운 직무에 도전해 C/C++, MiniFilter Driver와 보안 기능 개발을 경험했습니다.',
    r: '백엔드에서 시스템·보안까지 개발 경험의 범위를 넓혔고, 새로운 분야에도 직접 부딪혀 적응할 수 있다는 자신감을 얻었습니다.',
    link: '',
    doc: ''
  }
];

const buttons = [...document.querySelectorAll('.strength-tabs button')];
const els = {
  title: document.querySelector('#e-title'),
  s: document.querySelector('#e-s'),
  a: document.querySelector('#e-a'),
  r: document.querySelector('#e-r'),
  doc: document.querySelector('#e-doc'),
  docRow: document.querySelector('.doc')
};

function select(index) {
  const item = items[index];

  buttons.forEach((button, i) => {
    const selected = i === index;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  els.title.textContent = item.title;
  els.s.textContent = item.s;
  els.a.textContent = item.a;
  els.r.textContent = item.r;

  const hasEvidence = Boolean(item.link);
  els.docRow.hidden = !hasEvidence;

  if (hasEvidence) {
    els.doc.href = item.link;
    els.doc.target = '_blank';
    els.doc.rel = 'noopener';
    els.doc.textContent = item.doc;
  } else {
    els.doc.removeAttribute('href');
    els.doc.textContent = '';
  }
}

buttons.forEach((button, index) => {
  button.addEventListener('click', () => select(index));

  button.addEventListener('keydown', event => {
    // 첫 번째 강점 다음에는 근거 링크로 이동합니다.
    if (index === 0 && event.key === 'Tab' && !event.shiftKey && !els.docRow.hidden) {
      event.preventDefault();
      els.doc.focus();
      return;
    }

    // 역방향에서는 두 번째 강점 -> 근거 -> 첫 번째 강점 순서가 됩니다.
    if (index === 1 && event.key === 'Tab' && event.shiftKey && !els.docRow.hidden) {
      event.preventDefault();
      els.doc.focus();
    }
  });
});

els.doc.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;

  event.preventDefault();
  if (event.shiftKey) {
    buttons[0].focus();
  } else {
    buttons[1].focus();
  }
});

select(0);
