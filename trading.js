(function(app) {
  var $ = app.$;
  var DAY = 86400000, RATE = 0.01, hf = 'all', cc = 'USDT';
  var CFG = { INR: { min: 100, max: 1000000 }, USDT: { min: 10, max: 100000 } };
  var START = 0.02, STEP = 0.00001;

  app.wal = function(a) { return cc === 'USDT' ? a.usdt : a; };
  app.syncCur = function() {};

  app.money = function(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT';
  };

  app.addTx = function(a, type, amt, t, x) {
    var o = { type: type, amt: amt, t: t, bal: app.r2(a.principal + a.earnings) };
    if (x) for (var k in x) o[k] = x[k];
    a.tx.unshift(o);
    a.tx = a.tx.slice(0, 100);
  };

  app.accrue = function(a) {
    var days = Math.floor((Date.now() - a.lastAccrual) / DAY);
    if (days <= 0) return;
    var capped = days > 60;
    if (capped) days = 60;
    for (var i = 1; i <= days; i++) {
      if (a.principal > 0) {
        var x = app.r2(a.principal * RATE);
        a.earnings = app.r2(a.earnings + x);
        app.addTx(a, 'roi', x, a.lastAccrual + i * DAY);
      }
    }
    a.lastAccrual = capped ? Date.now() : a.lastAccrual + days * DAY;
  };

  /* EARN ACTIONS: DAILY BONUS, WATCH & EARN, STORY INCOME */
  function creditReward(amt, label, msgId) {
    if (!app.cur) return;
    var A = app.getAcct(app.cur), a = app.wal(A);
    app.accrue(a);
    a.earnings = app.r2(a.earnings + amt);
    app.addTx(a, 'bonus', amt, Date.now(), { note: label });
    app.putAcct(app.cur, A);
    app.render(A);
    $(msgId).textContent = label + ' added (+' + amt.toFixed(2) + ' USDT).';
  }

  if ($('claimBonus')) $('claimBonus').onclick = function() { creditReward(7, 'Daily bonus', 'earnMsg'); };
  if ($('watchTask')) $('watchTask').onclick = function() { creditReward(3, 'Watch & Earn', 'earnMsg'); };
  if ($('storyTask')) $('storyTask').onclick = function() { creditReward(5, 'Story Income', 'earnMsg'); };

  app.renderWallet = function(a) {
    $('wbal').textContent = app.money(app.r2(a.principal + a.earnings));
    $('wprin').textContent = app.money(a.principal);
    $('wearn').textContent = app.money(a.earnings);

    var left = a.lastAccrual + DAY - Date.now();
    var h = Math.max(0, Math.floor(left / 3600000));
    var m = Math.max(0, Math.floor((left % 3600000) / 60000));
    $('nextroi').textContent = a.principal > 0
      ? 'Next ROI credit: ' + app.money(app.r2(a.principal * RATE)) + ' in ' + h + 'h ' + m + 'm (1% daily).'
      : 'Deposit USDT to start earning 1% daily ROI.';

    var ul = $('txs');
    ul.innerHTML = '';
    var L = { deposit: 'Deposit', withdraw: 'Cash out', roi: 'Daily ROI (1%)', buy: 'STLX Buy', sell: 'STLX Sell', bonus: 'Daily bonus' };
    var list = a.tx.filter(function(t) {
      return hf === 'all' || t.type === hf || (hf === 'token' && (t.type === 'buy' || t.type === 'sell'));
    });

    if (!list.length) {
      var e = document.createElement('li');
      e.textContent = 'No history yet.';
      ul.appendChild(e);
      return;
    }

    list.forEach(function(t) {
      var li = document.createElement('li'), l = document.createElement('div'), r = document.createElement('div');
      var b = document.createElement('b'); b.textContent = t.note || L[t.type] || t.type;
      var s = document.createElement('small');
      s.textContent = app.fmt(t.t) + (t.hash ? ' · BEP20 tx ' + t.hash : '') + (t.qty ? ' · ' + t.qty + ' STLX @ $' + t.px : '');
      l.appendChild(b); l.appendChild(s);

      var p = document.createElement('b');
      var out = (t.type === 'withdraw' || t.type === 'buy');
      p.className = out ? 'neg' : 'pos';
      p.textContent = (out ? '−' : '+') + app.money(t.amt);

      var q = document.createElement('small');
      q.textContent = 'Balance ' + app.money(t.bal);
      r.appendChild(p); r.appendChild(q); r.style.textAlign = 'right';

      li.appendChild(l); li.appendChild(r); ul.appendChild(li);
    });
  };

  function amount() {
    var v = parseFloat($('amt').value);
    return isFinite(v) ? app.r2(v) : NaN;
  }

  function note(t, ok) {
    var e = $('amsg');
    e.textContent = t;
    e.style.color = ok ? '#10b981' : '#ef4444';
  }

  $('amt').addEventListener('input', function() {
    this.value = this.value.replace(/[^\d.]/g, '');
    note('');
  });

  app.depTotal = function() {
    var v = parseFloat(app.load('market:dep'));
    return isFinite(v) ? Math.max(0, v) : 0;
  };

  app.price = function() {
    return Number((START + STEP * app.depTotal()).toFixed(5));
  };

  function usd(n, d) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function tq() {
    var q = parseFloat($('tamt').value);
    return isFinite(q) ? Math.round(q * 10000) / 10000 : NaN;
  }

  function tmsg(t, ok) {
    var e = $('tmsg');
    e.textContent = t;
    e.style.color = ok ? '#10b981' : '#ef4444';
  }

  function tcost() {
    var q = tq();
    $('tcost').textContent = q > 0 ? '≈ ' + app.money(app.r2(q * app.price())) : '';
  }

  function getCandles() {
    var c = null;
    try { c = JSON.parse(app.load('stlx:candles')); } catch (e) {}
    if (!Array.isArray(c) || c.length < 5) {
      var now = Date.now(), base = START, arr = [];
      var seedDeltas = [0.0004, -0.0002, 0.0006, -0.0003, 0.0005, 0.0003, -0.0004, 0.0007, -0.0002, 0.0004];
      for (var i = 0; i < seedDeltas.length; i++) {
        var o = base;
        var cl = Number(Math.max(0.01, o + seedDeltas[i]).toFixed(5));
        var hi = Number((Math.max(o, cl) + 0.00025).toFixed(5));
        var lo = Number(Math.max(0.01, Math.min(o, cl) - 0.0002).toFixed(5));
        arr.push({ t: now - (seedDeltas.length - i) * 900000, o: o, h: hi, l: lo, c: cl, v: Math.round(120 + Math.random() * 380) });
        base = cl;
      }
      var curP = app.price();
      var last = arr[arr.length - 1];
      if (curP !== last.c) {
        arr.push({ t: now, o: last.c, h: Math.max(last.c, curP) + 0.0001, l: Math.min(last.c, curP) - 0.0001, c: curP, v: 250 });
      }
      c = arr;
      app.store('stlx:candles', JSON.stringify(c));
    }
    return c;
  }

  app.pushCandle = function(newPrice, vol) {
    var c = getCandles();
    var prev = c[c.length - 1];
    var open = prev ? prev.c : START;
    var close = newPrice;
    var spread = Math.max(0.00015, Math.abs(close - open) * 0.35);
    var high = Number((Math.max(open, close) + spread).toFixed(5));
    var low = Number(Math.max(0.005, Math.min(open, close) - spread * 0.8).toFixed(5));
    c.push({ t: Date.now(), o: open, h: high, l: low, c: close, v: vol || 150 });
    if (c.length > 32) c = c.slice(c.length - 32);
    app.store('stlx:candles', JSON.stringify(c));
  };

  function drawCandles() {
    var canvas = $('tchart');
    if (!canvas || !canvas.getContext) return;
    var rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    var dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var w = rect.width, h = rect.height;
    var candles = getCandles();
    var GREEN = '#10b981', RED = '#ef4444';
    var gridCol = 'rgba(255,255,255,0.07)', txtCol = '#8ca6a0';

    ctx.clearRect(0, 0, w, h);
    var padL = 12, padR = 62, padT = 14, padB = 22;
    var cw = w - padL - padR, ch = h - padT - padB;
    var priceH = ch * 0.76;
    var volH = ch * 0.20;

    var allHi = candles.map(function(x) { return x.h; });
    var allLo = candles.map(function(x) { return x.l; });
    var maxP = Math.max.apply(null, allHi);
    var minP = Math.min.apply(null, allLo);
    var padP = (maxP - minP) * 0.12 || 0.001;
    maxP += padP;
    minP = Math.max(0, minP - padP);

    var maxV = Math.max.apply(null, candles.map(function(x) { return x.v; })) || 1;
    var yOf = function(p) { return padT + priceH - ((p - minP) / (maxP - minP)) * priceH; };

    ctx.strokeStyle = gridCol;
    ctx.lineWidth = 1;
    ctx.fillStyle = txtCol;
    ctx.font = '600 11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (var i = 0; i <= 4; i++) {
      var gy = padT + priceH * (i / 4);
      var val = maxP - (maxP - minP) * (i / 4);
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w - padR, gy); ctx.stroke();
      ctx.fillText('$' + val.toFixed(4), w - padR + 6, gy);
    }

    var slot = cw / candles.length;
    var bodyW = Math.max(5, Math.min(18, slot * 0.62));

    candles.forEach(function(cd, idx) {
      var cx = padL + slot * idx + slot / 2;
      var isUp = cd.c >= cd.o;
      var col = isUp ? GREEN : RED;

      var vh = (cd.v / maxV) * volH;
      ctx.fillStyle = isUp ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)';
      ctx.fillRect(cx - bodyW / 2, padT + ch - vh, bodyW, vh);

      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, yOf(cd.h));
      ctx.lineTo(cx, yOf(cd.l));
      ctx.stroke();

      var yO = yOf(cd.o), yC = yOf(cd.c);
      var top = Math.min(yO, yC);
      var bh = Math.max(2.5, Math.abs(yC - yO));
      ctx.fillStyle = col;
      ctx.fillRect(cx - bodyW / 2, top, bodyW, bh);
    });

    var last = candles[candles.length - 1];
    var lastY = yOf(last.c);
    var lastCol = last.c >= last.o ? GREEN : RED;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = lastCol;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, lastY); ctx.lineTo(w - padR, lastY); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = lastCol;
    ctx.fillRect(w - padR + 2, lastY - 9, 58, 18);
    ctx.fillStyle = '#031c15';
    ctx.font = 'bold 10.5px monospace';
    ctx.fillText('$' + last.c.toFixed(4), w - padR + 5, lastY);

    $('ohlcBar').innerHTML =
      '<span>O <b>' + last.o.toFixed(4) + '</b></span>' +
      '<span>H <b class="pos">' + last.h.toFixed(4) + '</b></span>' +
      '<span>L <b class="neg">' + last.l.toFixed(4) + '</b></span>' +
      '<span>C <b>' + last.c.toFixed(4) + '</b></span>';
  }

  window.addEventListener('resize', function() {
    if (!$('dash').classList.contains('hide') && app.activeTab === 'wallet') drawCandles();
  });

  app.renderToken = function(a) {
    var w = a.usdt, p = app.price();
    $('daddr').textContent = a.addr;
    $('tprice').textContent = usd(p, 4);
    $('tbal').textContent = w.tokens.toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' STLX';
    $('tval').textContent = usd(app.r2(w.tokens * p), 2);

    var candles = getCandles();
    var last = candles[candles.length - 1];
    var pct = ((last.c - START) / START * 100).toFixed(2);
    var gEl = $('tgrowth');
    gEl.textContent = (pct >= 0 ? '+' : '') + pct + '%';
    gEl.className = last.c >= last.o ? 'pill-up' : 'pill-dn';

    $('tnote').textContent = 'SettlX (STLX) Dubai Liquidity Pool: ' + usd(app.depTotal(), 2) + ' USDT locked.';
    tcost();
    if (app.activeTab === 'wallet') requestAnimationFrame(drawCandles);
  };

  $('dep').onclick = function() {
    var v = amount();
    var c = CFG[cc];
    if (!(v >= c.min)) { note('Minimum deposit is 10 USDT.'); return; }
    if (v > c.max) { note('Maximum deposit is 100,000 USDT.'); return; }

    var A = app.getAcct(app.cur), a = app.wal(A);
    app.accrue(a);
    if (a.principal <= 0) a.lastAccrual = Date.now();
    a.principal = app.r2(a.principal + v);
    app.addTx(a, 'deposit', v, Date.now(), { hash: app.txh() });

    app.store('market:dep', String(app.r2(app.depTotal() + v)));
    app.pushCandle(app.price(), v);
    app.putAcct(app.cur, A);
    app.render(A);

    $('amt').value = '';
    note('Deposited ' + app.money(v) + ' · Green candle printed!', true);
  };

  $('wd').onclick = function() {
    var v = amount();
    if (!(v >= 10)) { note('Minimum cash out is 10 USDT.'); return; }
    var ad = $('waddr').value.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(ad)) {
      note('Enter a valid BEP20 address.');
      return;
    }

    var A = app.getAcct(app.cur), a = app.wal(A);
    app.accrue(a);
    var bal = app.r2(a.principal + a.earnings);
    if (v > bal) {
      app.putAcct(app.cur, A);
      app.render(A);
      note('Not enough balance.');
      return;
    }

    var take = Math.min(a.earnings, v);
    a.earnings = app.r2(a.earnings - take);
    a.principal = app.r2(a.principal - (v - take));
    app.addTx(a, 'withdraw', v, Date.now(), { hash: app.txh() });

    app.store('market:dep', String(Math.max(0, app.r2(app.depTotal() - v * 0.5))));
    app.pushCandle(app.price(), v);
    app.putAcct(app.cur, A);
    app.render(A);

    $('amt').value = '';
    note('Cash out ' + app.money(v) + ' · Red candle printed!', true);
  };

  $('sim').onclick = function() {
    var A = app.getAcct(app.cur), a = app.wal(A);
    a.lastAccrual -= DAY;
    app.accrue(a);
    app.putAcct(app.cur, A);
    app.render(A);
    note('Skipped 1 day.', true);
  };

  var chipBtns = document.querySelectorAll('.chips button');
  Array.prototype.forEach.call(chipBtns, function(b) {
    b.onclick = function() {
      hf = b.getAttribute('data-f');
      Array.prototype.forEach.call(chipBtns, function(x) {
        x.setAttribute('aria-pressed', x === b);
      });
      app.renderWallet(app.wal(app.getAcct(app.cur)));
    };
  });

  $('copy').onclick = function() {
    var t = $('daddr').textContent;
    try {
      navigator.clipboard.writeText(t).then(
        function() { note('Address copied.', true); },
        function() { note('Could not copy.'); }
      );
    } catch (e) {}
  };

  $('tamt').addEventListener('input', function() {
    this.value = this.value.replace(/[^\d.]/g, '');
    tmsg('');
    tcost();
  });

  $('tbuy').onclick = function() {
    var q = tq();
    if (!(q > 0)) { tmsg('Enter number of tokens.'); return; }
    var A = app.getAcct(app.cur), w = A.usdt;
    app.accrue(w);
    var p = app.price(), cost = app.r2(q * p), bal = app.r2(w.principal + w.earnings);
    if (cost > bal) {
      app.putAcct(app.cur, A);
      app.render(A);
      tmsg('Not enough USDT.');
      return;
    }

    var take = Math.min(w.earnings, cost);
    w.earnings = app.r2(w.earnings - take);
    w.principal = app.r2(w.principal - (cost - take));
    w.tokens = Math.round((w.tokens + q) * 10000) / 10000;
    app.addTx(w, 'buy', cost, Date.now(), { qty: q, px: p.toFixed(4) });

    var bump = Number((p + q * 0.000002).toFixed(5));
    app.pushCandle(bump, cost);
    app.putAcct(app.cur, A);
    app.render(A);

    $('tamt').value = '';
    tmsg('Bought ' + q + ' STLX.', true);
  };

  $('tsell').onclick = function() {
    var q = tq();
    if (!(q > 0)) { tmsg('Enter number of tokens.'); return; }
    var A = app.getAcct(app.cur), w = A.usdt;
    app.accrue(w);
    if (q > w.tokens) {
      app.putAcct(app.cur, A);
      app.render(A);
      tmsg('Not enough tokens.');
      return;
    }

    var p = app.price(), got = app.r2(q * p);
    w.tokens = Math.round((w.tokens - q) * 10000) / 10000;
    w.principal = app.r2(w.principal + got);
    app.addTx(w, 'sell', got, Date.now(), { qty: q, px: p.toFixed(4) });

    var dip = Number(Math.max(0.01, p - q * 0.000002).toFixed(5));
    app.pushCandle(dip, got);
    app.putAcct(app.cur, A);
    app.render(A);

    $('tamt').value = '';
    tmsg('Sold ' + q + ' STLX.', true);
  };

  setInterval(function() {
    if (app.cur && !$('dash').classList.contains('hide')) {
      var a = app.getAcct(app.cur);
      app.accrue(a);
      app.accrue(a.usdt);
      app.putAcct(app.cur, a);
      app.render(a);
    }
  }, 60000);
})(window.SettlX);