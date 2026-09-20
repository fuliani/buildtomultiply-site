/* Build to Multiply PT. Nada do que o visitante digita sai do navegador. */
(function () {
  'use strict';

  var toggle = document.querySelector('.menu-toggle'), nav = document.querySelector('.nav-links');
  if (toggle && nav) toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  var rx = document.getElementById('rx');
  if (!rx) return;

  var qs = Array.prototype.slice.call(rx.querySelectorAll('.q')),
      total = qs.length, cur = 0,
      next = document.getElementById('rx-next'),
      back = document.getElementById('rx-back'),
      fill = document.getElementById('rx-fill'),
      count = document.getElementById('rx-count');

  var money = function (n) { return '$' + Math.round(n).toLocaleString('pt-BR'); };
  var num = function (id) { var v = parseFloat((document.getElementById(id) || {}).value); return isNaN(v) ? 0 : v; };
  var radio = function (name) { var el = rx.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; };

  function show(i) {
    qs.forEach(function (q, k) { q.hidden = k !== i; });
    cur = i;
    back.hidden = i === 0;
    next.textContent = i === total - 1 ? 'Ver o resultado' : 'Próxima';
    fill.style.width = ((i + 1) / total * 100) + '%';
    count.textContent = (i + 1) + ' de ' + total;
  }

  // mostrar campos condicionais
  rx.addEventListener('change', function (ev) {
    if (ev.target.name === 'hsa') {
      document.getElementById('rx-hsa-wrap').hidden = ev.target.value !== 'naousa';
    }
    if (ev.target.name === 'edu') {
      document.getElementById('rx-edu-wrap').hidden = ev.target.value !== 'naousa';
    }
    if (ev.target.id === 'rx-match-nao-sei') {
      document.getElementById('rx-match').disabled = ev.target.checked;
    }
  });
  var hw = document.getElementById('rx-hsa-wrap'); if (hw) hw.hidden = radio('hsa') !== 'naousa';
  var ew = document.getElementById('rx-edu-wrap'); if (ew) ew.hidden = radio('edu') !== 'naousa';

  next.addEventListener('click', function () { if (cur < total - 1) show(cur + 1); else resultado(); });
  back.addEventListener('click', function () { if (cur > 0) show(cur - 1); });
  document.getElementById('rx-restart').addEventListener('click', function () {
    document.getElementById('rx-res').hidden = true;
    document.getElementById('rx-form').hidden = false;
    show(0);
    window.scrollTo({ top: rx.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  });

  function resultado() {
    var salario = Math.max(0, num('rx-salario')),
        contrib = Math.min(100, Math.max(0, num('rx-contrib'))),
        naoSeiMatch = document.getElementById('rx-match-nao-sei').checked,
        match = naoSeiMatch ? 4 : Math.min(100, Math.max(0, num('rx-match')));

    var itens = [], total$ = 0;

    // 1. match nao capturado: conta exata, so com o que a pessoa informou
    var gap = Math.max(0, match - contrib);
    var matchPerdido = salario * gap / 100;
    total$ += matchPerdido;
    itens.push({
      titulo: 'Match do 401(k) não capturado',
      valor: matchPerdido,
      desc: matchPerdido > 0
        ? 'Você contribui ' + contrib + '% e o match vai até ' + match + '%' + (naoSeiMatch ? ' (hipótese, porque você marcou "não sei")' : '') + '. A diferença de ' + gap.toFixed(1) + '% do seu salário é dinheiro do empregador que fica lá.'
        : 'Você já contribui o suficiente para pegar o match inteiro. Esse é o item mais caro da lista e você resolveu.'
    });

    // 2. HSA
    var hsa = radio('hsa'), hsaV = 0, hsaDesc = '';
    if (hsa === 'naousa') { hsaV = Math.max(0, num('rx-hsa')); hsaDesc = 'Seu empregador deposita e você não está usando. É dinheiro já aprovado para você.'; }
    else if (hsa === 'usa') hsaDesc = 'Você já usa. A HSA é a conta mais eficiente do sistema americano.';
    else if (hsa === 'naosei') hsaDesc = 'Vale cinco minutos no portal de benefícios para descobrir. Muita gente tem e não sabe.';
    else hsaDesc = 'Seu plano não oferece. Nada a fazer aqui por enquanto.';
    total$ += hsaV;
    itens.push({ titulo: 'Contribuição de HSA não usada', valor: hsaV, desc: hsaDesc });

    // 3. verba de educacao
    var edu = radio('edu'), eduV = 0, eduDesc = '';
    if (edu === 'naousa') { eduV = Math.max(0, num('rx-edu')); eduDesc = 'Verba que existe e volta para a empresa se você não usar. Costuma pagar certificação, curso e às vezes inglês.'; }
    else if (edu === 'usa') eduDesc = 'Você já usa. É a forma mais barata de aumentar o seu valor de mercado.';
    else if (edu === 'naosei') eduDesc = 'Pergunte ao RH: tuition reimbursement ou education stipend. É comum e pouco usado.';
    else eduDesc = 'Sua empresa não oferece.';
    total$ += eduV;
    itens.push({ titulo: 'Verba de educação não usada', valor: eduV, desc: eduDesc });

    // 4 e 5: nao entram na soma, porque seriam chute. Entram como alerta.
    var nuncaNegociou = radio('neg') === 'nao';
    var naoSabeFaixa = radio('faixa') === 'nao';

    document.getElementById('rx-total').textContent = money(total$);
    document.getElementById('rx-sub').textContent = total$ > 0
      ? 'É a estimativa do que está ficando para trás por ano, somando só o que você informou. Não inclui salário, porque isso seria chute.'
      : 'Pelo que você informou, você não está deixando dinheiro óbvio na mesa. Isso é raro. As duas frentes abaixo continuam valendo.';

    document.getElementById('rx-breakdown').innerHTML = itens.map(function (i) {
      return '<li><span class="bl">' + i.titulo + '<span class="bd">' + i.desc + '</span></span>' +
             '<span class="bv' + (i.valor > 0 ? '' : ' zero') + '">' + (i.valor > 0 ? money(i.valor) : 'ok') + '</span></li>';
    }).join('');

    // juro composto sobre o valor recuperado
    var comp = document.getElementById('rx-comp');
    if (total$ > 0) {
      var r = 0.07, linhas = '';
      [5, 10, 20].forEach(function (anos) {
        var fv = total$ * ((Math.pow(1 + r, anos) - 1) / r);
        linhas += '<tr><td>' + anos + ' anos</td><td>' + money(fv) + '</td></tr>';
      });
      comp.innerHTML = linhas;
      comp.closest('.compound').hidden = false;
    } else {
      comp.closest('.compound').hidden = true;
    }

    // proximos passos
    var passos = [];
    if (matchPerdido > 0) passos.push(['Aumente sua contribuição até ' + match + '%', 'É a única decisão desta lista que dá retorno garantido no mesmo dia. Leva cinco minutos no portal do 401(k).']);
    if (naoSeiMatch) passos.push(['Descubra o match de verdade', 'Procure "401(k) match" ou "employer contribution" no seu resumo de benefícios. Usei 4% como hipótese, e a sua realidade pode ser bem diferente.']);
    if (hsa === 'naousa' || hsa === 'naosei') passos.push(['Abra e use a HSA', 'Se o seu plano é de franquia alta, é a única conta que pode ser isenta de imposto na entrada, no crescimento e na saída para despesa médica.']);
    if (edu === 'naousa' || edu === 'naosei') passos.push(['Gaste a verba de educação este ano', 'Ela não acumula. Se não usar, volta para a empresa em 31 de dezembro na maioria dos planos.']);
    if (nuncaNegociou) passos.push(['Prepare uma conversa de salário', 'Nunca ter negociado é o item mais caro que não dá para calcular aqui, porque o salário base é a conta de onde saem aumento, bônus e match.']);
    if (naoSabeFaixa) passos.push(['Descubra a faixa do seu nível', 'Toda empresa média ou grande tem mínimo, ponto médio e máximo por nível. Saber onde você está muda completamente a conversa de aumento.']);
    if (!passos.length) passos.push(['Você está na frente da maioria', 'O próximo passo é a etapa Controlar: saber sua taxa de poupança e automatizar a margem.']);

    document.getElementById('rx-next-steps').innerHTML =
      '<h3>O que fazer agora, em ordem</h3>' + passos.map(function (p) {
        return '<div class="step-card"><strong>' + p[0] + '</strong><span>' + p[1] + '</span></div>';
      }).join('');

    document.getElementById('rx-form').hidden = true;
    document.getElementById('rx-res').hidden = false;
    window.scrollTo({ top: rx.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  }

  show(0);
})();
