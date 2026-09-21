/* Build to Multiply EN. Nothing the visitor types leaves the browser. */
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

  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var num = function (id) { var v = parseFloat((document.getElementById(id) || {}).value); return isNaN(v) ? 0 : v; };
  var radio = function (name) { var el = rx.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; };

  function show(i) {
    qs.forEach(function (q, k) { q.hidden = k !== i; });
    cur = i;
    back.hidden = i === 0;
    next.textContent = i === total - 1 ? 'See my result' : 'Next';
    fill.style.width = ((i + 1) / total * 100) + '%';
    count.textContent = (i + 1) + ' of ' + total;
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
      titulo: 'Unclaimed 401(k) match',
      valor: matchPerdido,
      desc: matchPerdido > 0
        ? 'You contribute ' + contrib + '% and the match goes up to ' + match + '%' + (naoSeiMatch ? ' (an assumption, because you chose "I don\'t know")' : '') + '. The ' + gap.toFixed(1) + '% gap is employer money that stays behind.'
        : 'You already contribute enough to get the full match. This is the most expensive item on the list and you have it handled.'
    });

    // 2. HSA
    var hsa = radio('hsa'), hsaV = 0, hsaDesc = '';
    if (hsa === 'naousa') { hsaV = Math.max(0, num('rx-hsa')); hsaDesc = 'Your employer contributes and you are not using it. It is money already approved for you.'; }
    else if (hsa === 'usa') hsaDesc = 'You already use it. The HSA is the most tax-efficient account in the American system.';
    else if (hsa === 'naosei') hsaDesc = 'Worth five minutes in your benefits portal to find out. Many people have one and do not know.';
    else hsaDesc = 'Your plan does not offer one. Nothing to do here for now.';
    total$ += hsaV;
    itens.push({ titulo: 'Unused employer HSA contribution', valor: hsaV, desc: hsaDesc });

    // 3. verba de educacao
    var edu = radio('edu'), eduV = 0, eduDesc = '';
    if (edu === 'naousa') { eduV = Math.max(0, num('rx-edu')); eduDesc = 'A budget that exists and goes back to the company if you do not use it. It often pays for certifications and courses.'; }
    else if (edu === 'usa') eduDesc = 'You already use it. It is the cheapest way to raise your market value.';
    else if (edu === 'naosei') eduDesc = 'Ask HR about tuition reimbursement or an education stipend. It is common and underused.';
    else eduDesc = 'Your company does not offer one.';
    total$ += eduV;
    itens.push({ titulo: 'Unused education budget', valor: eduV, desc: eduDesc });

    // 4 e 5: nao entram na soma, porque seriam chute. Entram como alerta.
    var nuncaNegociou = radio('neg') === 'nao';
    var naoSabeFaixa = radio('faixa') === 'nao';

    document.getElementById('rx-total').textContent = money(total$);
    document.getElementById('rx-sub').textContent = total$ > 0
      ? 'This is the estimate of what is being left behind each year, adding up only what you entered. It does not include salary, because that would be a guess.'
      : 'Based on what you entered, you are not leaving obvious money on the table. That is rare. The two items below still apply.';

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
        linhas += '<tr><td>' + anos + ' years</td><td>' + money(fv) + '</td></tr>';
      });
      comp.innerHTML = linhas;
      comp.closest('.compound').hidden = false;
    } else {
      comp.closest('.compound').hidden = true;
    }

    // proximos passos
    var passos = [];
    if (matchPerdido > 0) passos.push(['Raise your contribution to ' + match + '%', 'It is the only decision on this list with a guaranteed same-day return. It takes five minutes in your 401(k) portal.']);
    if (naoSeiMatch) passos.push(['Find out your real match', 'Look for "401(k) match" or "employer contribution" in your benefits summary. 4% was used as an assumption, and your reality may be quite different.']);
    if (hsa === 'naousa' || hsa === 'naosei') passos.push(['Open and use the HSA', 'If you are on a high-deductible plan, it is the only account that can be tax-free going in, while it grows, and coming out for qualified medical expenses.']);
    if (edu === 'naousa' || edu === 'naosei') passos.push(['Spend the education budget this year', 'It does not roll over. If you do not use it, it goes back to the company on December 31 under most plans.']);
    if (nuncaNegociou) passos.push(['Prepare a pay conversation', 'Never having negotiated is the most expensive item that cannot be calculated here, because base salary is what raises, bonus and match are all calculated from.']);
    if (naoSabeFaixa) passos.push(['Find the pay range for your level', 'Every mid-size or large company has a minimum, midpoint and maximum per level. Knowing where you sit changes the raise conversation completely.']);
    if (!passos.length) passos.push(['You are ahead of most people', 'The next step is the Control stage: know your savings rate and automate your margin.']);

    document.getElementById('rx-next-steps').innerHTML =
      '<h3>What to do now, in order</h3>' + passos.map(function (p) {
        return '<div class="step-card"><strong>' + p[0] + '</strong><span>' + p[1] + '</span></div>';
      }).join('');

    document.getElementById('rx-form').hidden = true;
    document.getElementById('rx-res').hidden = false;
    window.scrollTo({ top: rx.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  }

  show(0);
})();

/* ---- MailerLite: newsletter goes straight to the list; community waitlist is also added (Formspree still emails the answers) ---- */
(function(){
  var ML='https://assets.mailerlite.com/jsonp/2421436/forms/189845758067869550/subscribe';
  function send(email,name,lang){
    var d=new URLSearchParams(); d.append('fields[email]',email); if(name)d.append('fields[name]',name);
    d.append('ml-submit','1'); d.append('anticsrf','true');
    try{ return fetch(ML,{method:'POST',mode:'no-cors',keepalive:true,body:d}); }catch(e){ return Promise.resolve(); }
  }
  var lang=document.documentElement.lang||'en';
  document.querySelectorAll('form.nl-form').forEach(function(f){
    f.addEventListener('submit',function(ev){
      ev.preventDefault();
      var i=f.querySelector('input[type=email]'); if(!i||!i.value)return;
      if(f.querySelector('[name=_gotcha]')&&f.querySelector('[name=_gotcha]').value)return;
      send(i.value,'',lang).then(function(){
        f.innerHTML='<p class="nl-ok"><strong>'+(lang.indexOf('pt')===0?'Pronto! Confira o seu e-mail.':'Done! Check your inbox.')+'</strong></p>';
        if(typeof gtag==='function')gtag('event','newsletter_signup',{page_lang:lang});
      });
    });
  });
  document.querySelectorAll('form.contact-form').forEach(function(f){
    f.addEventListener('submit',function(){
      var e=f.querySelector('input[type=email]'),n=f.querySelector('input[name=nome]');
      if(e&&e.value){ send(e.value,n?n.value:'',lang); if(typeof gtag==='function')gtag('event','waitlist_signup',{page_lang:lang}); }
    });
  });
})();
