(function(app) {
  var $ = app.$;
  var mode = 'mobile', target = '', code = '', expires = 0, tries = 0, tmr = null, flashTmr = null;
  var OTP_LEN = 6, RESEND_SEC = 30, VALID_SEC = 300, MAX_TRIES = 5;

  function sendOtp(kind, value) {
    code = String(Math.floor(100000 + Math.random() * 900000));
    expires = Date.now() + VALID_SEC * 1000;
    tries = 0;
    return Promise.resolve({ ok: true });
  }

  function verifyOtp(kind, value, entered) {
    if (Date.now() > expires) return Promise.resolve({ ok: false, msg: 'Code expired. Request a new one.' });
    if (tries >= MAX_TRIES) return Promise.resolve({ ok: false, msg: 'Too many tries. Request a new code.' });
    if (entered !== code) {
      tries++;
      return Promise.resolve({ ok: false, msg: 'Wrong code. ' + (MAX_TRIES - tries) + ' attempts left.' });
    }
    return Promise.resolve({ ok: true });
  }

  function showFlashCode(otpCode) {
    clearInterval(flashTmr);
    var box = $('flashBox');
    var codeEl = $('demoCode');
    var secEl = $('flashSec');
    var left = 10;

    box.classList.remove('expired');
    codeEl.textContent = otpCode;
    secEl.textContent = left + 's';

    flashTmr = setInterval(function() {
      left--;
      if (left > 0) {
        secEl.textContent = left + 's';
      } else {
        clearInterval(flashTmr);
        secEl.textContent = 'Hidden';
        codeEl.textContent = '••••••';
        box.classList.add('expired');
      }
    }, 1000);
  }

  function show(id) {
    ['s1', 's2'].forEach(function(s) {
      $(s).classList.toggle('hide', s !== id);
    });
  }

  function setMode(m) {
    mode = m;
    var M = m === 'mobile';
    $('tabM').setAttribute('aria-selected', M);
    $('tabE').setAttribute('aria-selected', !M);
    $('pre').style.display = M ? '' : 'none';
    $('idLabel').textContent = M ? 'Mobile number' : 'Email address';
    var i = $('id');
    i.value = '';
    i.maxLength = M ? 10 : 100;
    i.inputMode = M ? 'numeric' : 'email';
    i.placeholder = M ? '98765 43210' : 'you@example.com';
    $('e1').textContent = '';
    i.focus();
  }

  $('tabM').onclick = function() { setMode('mobile'); };
  $('tabE').onclick = function() { setMode('email'); };
  $('id').addEventListener('input', function() {
    if (mode === 'mobile') this.value = this.value.replace(/\D/g, '');
    $('e1').textContent = '';
  });

  function valid() {
    var v = $('id').value.trim();
    if (mode === 'mobile') {
      if (!/^[6-9]\d{9}$/.test(v)) {
        $('e1').textContent = 'Enter valid 10-digit number.';
        return null;
      }
      return '+91' + v;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      $('e1').textContent = 'Enter valid email.';
      return null;
    }
    return v.toLowerCase();
  }

  var boxes = [];
  for (var n = 0; n < OTP_LEN; n++) {
    (function(n) {
      var b = document.createElement('input');
      b.inputMode = 'numeric';
      b.maxLength = 1;

      b.addEventListener('input', function() {
        b.value = b.value.replace(/\D/g, '').slice(-1);
        if (b.value && n < OTP_LEN - 1) boxes[n + 1].focus();
        update();
      });

      b.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !b.value && n > 0) {
          boxes[n - 1].focus();
          boxes[n - 1].value = '';
          update();
        }
        if (e.key === 'Enter' && !$('verify').disabled) doVerify();
      });

      b.addEventListener('paste', function(e) {
        var t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LEN);
        if (!t) return;
        e.preventDefault();
        for (var k = 0; k < OTP_LEN; k++) boxes[k].value = t[k] || '';
        boxes[Math.min(t.length, OTP_LEN - 1)].focus();
        update();
      });

      boxes.push(b);
      $('otp').appendChild(b);
    })(n);
  }

  function entered() {
    return boxes.map(function(b) { return b.value; }).join('');
  }

  function update() {
    $('verify').disabled = entered().length !== OTP_LEN;
    $('e2').textContent = '';
  }

  function clearBoxes() {
    boxes.forEach(function(b) { b.value = ''; });
    update();
    boxes[0].focus();
  }

  function startTimer() {
    var left = RESEND_SEC;
    $('resend').disabled = true;
    clearInterval(tmr);
    function tick() {
      $('timer').textContent = left > 0 ? 'Resend in ' + left + 's' : '';
      if (left <= 0) {
        clearInterval(tmr);
        $('resend').disabled = false;
      }
      left--;
    }
    tick();
    tmr = setInterval(tick, 1000);
  }

  function doSend() {
    var v = valid();
    if (!v) return;
    target = v;
    var btn = $('send');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    sendOtp(mode, v).then(function(r) {
      btn.disabled = false;
      btn.textContent = 'Send code';
      $('sentTo').textContent = 'Code generated for ' + v;
      show('s2');
      showFlashCode(code);
      clearBoxes();
      startTimer();
    });
  }

  $('send').onclick = doSend;
  $('id').addEventListener('keydown', function(e) { if (e.key === 'Enter') doSend(); });

  $('resend').onclick = function() {
    sendOtp(mode, target).then(function() {
      showFlashCode(code);
      clearBoxes();
      startTimer();
    });
  };

  $('change').onclick = function() {
    clearInterval(tmr);
    clearInterval(flashTmr);
    show('s1');
    $('id').focus();
  };

  function doVerify() {
    $('verify').disabled = true;
    verifyOtp(mode, target, entered()).then(function(r) {
      if (!r.ok) {
        $('e2').textContent = r.msg;
        $('verify').disabled = false;
        return;
      }
      clearInterval(flashTmr);
      app.store('session', JSON.stringify({ user: target, t: Date.now() }));
      loggedIn(target);
    });
  }

  $('verify').onclick = doVerify;

  function loggedIn(u) {
    clearInterval(tmr);
    clearInterval(flashTmr);
    app.cur = u;
    var a = app.getAcct(u);
    app.accrue(a);
    app.accrue(a.usdt);
    if (a.payout && $('waddr')) $('waddr').value = a.payout;
    app.putAcct(u, a);

    app.render(a);
    if (app.switchTab) app.switchTab('home');

    document.querySelector('main').classList.add('hide');
    $('dash').classList.remove('hide');
    $('appBar').classList.remove('compact');
  }

  $('logout').onclick = function() {
    app.store('session', null);
    $('dash').classList.add('hide');
    document.querySelector('main').classList.remove('hide');
    $('appBar').classList.add('compact');
    $('id').value = '';
    show('s1');
    $('id').focus();
  };

  var s = app.load('session');
  if (s) {
    try { loggedIn(JSON.parse(s).user); } catch (e) {}
  }
})(window.SettlX);