/* Kriter DataLab | Cliente autenticado sobre Supabase
   Autor: Jesus R.L. Gonzalez - Kriter Systems - Derechos reservados (c) 2026
   Toda agregacion ocurre en PostgreSQL con RLS: este archivo nunca filtra por
   permisos; solo muestra lo que el servidor autoriza. */
(function () {
  'use strict';
  var CFG = window.KRITER_CONFIG || {};
  var sb = window.supabase.createClient(CFG.url, CFG.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
  });

  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0); };
  var number = function (n) { return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(Number(n) || 0); };
  var integer = function (n) { return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Number(n) || 0); };
  var compact = function (n) { return new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(n) || 0); };
  var compactShort = function (n) { return new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 0 }).format(Number(n) || 0); };
  var percentage = function (n, d) { return d ? (100 * n / d).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' %' : '0 %'; };
  var esc = function (s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (x) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x];
    });
  };

  var PAGE = 25;
  var state = {
    ctx: null, data: null, weeks: [], options: null, sort: 'valor', search: '', offset: 0,
    filters: { region: '', year: '', segment: '', brand: '', from: '', to: '' },
    loading: false, lastError: null, seq: 0
  };

  /* Cada carga lleva un numero de secuencia: una respuesta que llega tarde
     (por ejemplo tras cambiar de usuario) se descarta en lugar de pintarse. */
  function vigente(n) { return n === state.seq; }

  function limpiarVista() {
    ['kSales', 'kUnits', 'kProducts', 'kAverage'].forEach(function (id) { $(id).textContent = '—'; });
    ['chartSegments', 'chartAreas', 'chartBrands', 'segmentDetail', 'areaCards', 'heatmap',
     'scenarioBars', 'logRows', 'productRows', 'auditRows'].forEach(function (id) { $(id).innerHTML = ''; });
    $('chartWeekly').innerHTML = '';
    ['scenarioLow', 'scenarioBase', 'scenarioHigh'].forEach(function (id) { $(id).textContent = '—'; });
    ['scenarioLowDetail', 'scenarioBaseDetail', 'scenarioHighDetail'].forEach(function (id) { $(id).textContent = '—'; });
    $('scenarioNote').innerHTML = '';
    $('insightNarrative').innerHTML = '';
    ['insightSegment', 'insightRegion', 'insightBrand'].forEach(function (id) { $(id).textContent = '—'; });
    $('tableCount').textContent = '—';
    $('pageInfo').textContent = '—';
    $('weeksLabel').textContent = '—';
    state.data = null;
  }

  /* ------------------------------------------------------------------ red */
  function readable(error) {
    if (!error) return 'Error desconocido.';
    if (error.code === '42501') return error.message || 'La consulta solicitada no esta autorizada para tu perfil.';
    if (error.code === '22007') return 'El periodo solicitado esta invertido: la semana inicial es posterior a la final.';
    if (expirada(error)) return 'Tu sesion caduco. Vuelve a iniciar sesion para continuar.';
    if (error.message && /fetch|network|Failed to fetch/i.test(error.message)) return 'No se pudo contactar al servidor de datos. Revisa tu conexion e intenta de nuevo.';
    return error.message || 'No fue posible completar la consulta.';
  }

  /* Un 401 con codigo 42501 es una denegacion a una sesion anonima, no una
     sesion caducada: no debe cerrar sesion ni pedir volver a entrar. */
  function expirada(error) {
    return error.code === 'PGRST301' || (error.status === 401 && error.code !== '42501');
  }

  function report(event, detail) {
    try { sb.rpc('kriter_log_event', { p_event: event, p_detail: detail || {} }).then(function () {}, function () {}); } catch (e) { /* la bitacora nunca bloquea la interfaz */ }
  }

  async function rpc(fn, args) {
    var res = await sb.rpc(fn, args || {});
    if (res.error) {
      var err = res.error;
      if (err.code === '42501') report('acceso_denegado', { funcion: fn, area: (args || {}).p_region || null });
      if (expirada(err)) { report('sesion_expirada', { funcion: fn }); await sb.auth.signOut().catch(function () {}); }
      throw err;
    }
    return res.data;
  }

  /* -------------------------------------------------------------- sesion */
  function describeScope(ctx) {
    if (!ctx.authenticated) return 'Visitante · area publica de demostracion';
    var areas = (ctx.regions || []).map(function (r) { return r.name; });
    return (ctx.role_name || 'Sin rol asignado') + ' · ' + (areas.length ? areas.join(', ') : 'sin areas asignadas');
  }

  function renderSession() {
    var ctx = state.ctx || {};
    var auth = !!ctx.authenticated;
    $('sessionName').textContent = auth ? (ctx.display_name || ctx.email || 'Usuario') : 'Visitante';
    $('sessionScope').textContent = describeScope(ctx);
    $('loginBtn').hidden = auth;
    $('logoutBtn').hidden = !auth;
    $('sessionTag').textContent = auth ? '● Sesion activa' : '● Solo area publica';
    $('sessionTag').className = 'tag' + (auth ? ' tag-ok' : '');

    var canExport = !!ctx.can_export;
    $('exportBtn').disabled = !canExport;
    $('exportBtn').title = canExport ? 'Descarga los productos agregados que tu perfil autoriza'
      : 'Tu perfil no permite exportar. Inicia sesion con un perfil autorizado.';
    var scen = !!ctx.can_view_scenarios;
    $('scenarioDenied').hidden = scen;
    $('scenarioPanel').hidden = !scen;
    $('navAudit').hidden = !ctx.can_read_audit;
    $('roleMatrixNote').textContent = auth
      ? 'Las areas, la exportacion y la simulacion se autorizan en PostgreSQL segun tu rol.'
      : 'Sin iniciar sesion solo se publica el area marcada como publica. El resto de las areas se deniega en el servidor.';
  }

  /* -------------------------------------------------------------- filtros */
  function fillSelect(el, items, placeholder, current) {
    var html = '<option value="">' + esc(placeholder) + '</option>';
    items.forEach(function (it) {
      var v = typeof it === 'object' ? it.value : it;
      var l = typeof it === 'object' ? it.label : it;
      html += '<option value="' + esc(v) + '"' + (String(current) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>';
    });
    el.innerHTML = html;
  }

  function renderFilterOptions() {
    var o = state.options || { years: [], segments: [], brands: [], weeks: [] };
    var ctx = state.ctx || { regions: [] };
    state.weeks = o.weeks || [];
    fillSelect($('filterYear'), (o.years || []).map(String), 'Todos los años', state.filters.year);
    fillSelect($('filterRegion'), (ctx.regions || []).map(function (r) { return r.name; }), 'Todas mis areas', state.filters.region);
    fillSelect($('filterSegment'), o.segments || [], 'Todos los segmentos', state.filters.segment);
    fillSelect($('filterBrand'), o.brands || [], 'Todas las marcas', state.filters.brand);
    var weekItems = state.weeks.map(function (w) { return { value: w.date, label: w.label }; });
    fillSelect($('filterFrom'), weekItems, 'Primera semana', state.filters.from);
    fillSelect($('filterTo'), weekItems, 'Ultima semana', state.filters.to);
  }

  function filterArgs() {
    var f = state.filters;
    return {
      p_region: f.region || null, p_year: f.year ? Number(f.year) : null,
      p_segment: f.segment || null, p_brand: f.brand || null,
      p_from: f.from || null, p_to: f.to || null
    };
  }

  /* -------------------------------------------------------------- graficos */
  function bars(target, list, opts) {
    opts = opts || {};
    var total = (state.data && state.data.kpi && Number(state.data.kpi.sales)) || 0;
    var rows = (list || []).slice(0, opts.limit || Infinity);
    if (!rows.length) { $(target).innerHTML = '<div class="empty">Sin ventas para los filtros elegidos.</div>'; return; }
    var max = Number(rows[0].value) || 1;
    $(target).innerHTML = rows.map(function (o) {
      var share = opts.showShare ? percentage(o.value, total) : compact(o.value);
      var sel = opts.dimension && String(state.filters[opts.dimension] || '') === String(o.name);
      var detail = o.name + ': ' + money(o.value) + ' · ' + percentage(o.value, total);
      return '<button type="button" class="baritem' + (sel ? ' selected' : '') + '"' +
        (opts.dimension ? ' data-dim="' + esc(opts.dimension) + '" data-value="' + esc(o.name) + '" aria-pressed="' + (sel ? 'true' : 'false') + '"' : '') +
        ' title="' + esc(detail) + '"><span class="bar-name">' + esc(o.name) + '</span>' +
        '<span class="bartrack"><span class="barprogress" style="width:' + Math.max(1, 100 * o.value / max).toFixed(4) + '%"></span></span>' +
        '<span class="bar-num">' + share + '</span></button>';
    }).join('');
    if (opts.dimension) {
      Array.prototype.forEach.call($(target).querySelectorAll('button[data-dim]'), function (el) {
        el.addEventListener('click', function () { chooseDimension(el.dataset.dim, el.dataset.value); });
      });
    }
  }

  function drawLine(target, timeline) {
    var svg = $(target);
    if (!timeline.length) { svg.innerHTML = '<text x="490" y="130" text-anchor="middle" class="axislabel">Sin semanas para el periodo seleccionado</text>'; return; }
    var W = Math.max(280, Math.round(svg.getBoundingClientRect().width)), H = 260;
    var left = W < 520 ? 49 : 70, right = W < 520 ? 8 : 18, top = 18, bottom = 38;
    var w = W - left - right, h = H - top - bottom;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var max = Math.max.apply(null, timeline.map(function (r) { return Number(r.value); }).concat([1])), ceiling = max * 1.12;
    var x = function (i) { return left + (timeline.length === 1 ? w / 2 : i * w / (timeline.length - 1)); };
    var y = function (v) { return top + h - (v / ceiling) * h; };
    var grid = [0, 1, 2, 3, 4].map(function (i) {
      var val = ceiling * i / 4, py = y(val);
      return '<line class="gridline" x1="' + left + '" x2="' + (W - right) + '" y1="' + py + '" y2="' + py + '"/>' +
        '<text class="axislabel" x="' + (left - 10) + '" y="' + (py + 4) + '" text-anchor="end">' + compact(val) + '</text>';
    }).join('');
    var coords = timeline.map(function (r, i) { return [x(i), y(Number(r.value))]; });
    var line = coords.map(function (c, i) { return (i ? 'L' : 'M') + c[0].toFixed(2) + ' ' + c[1].toFixed(2); }).join(' ');
    var fill = line + ' L ' + coords[coords.length - 1][0].toFixed(2) + ' ' + (top + h) + ' L ' + coords[0][0].toFixed(2) + ' ' + (top + h) + ' Z';
    var positions = W < 520 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
    var indices = positions.map(function (v) { return Math.floor((timeline.length - 1) * v); }).filter(function (v, i, arr) { return arr.indexOf(v) === i; });
    var ticks = indices.map(function (i) { return '<text class="axislabel" x="' + x(i) + '" y="' + (H - 11) + '" text-anchor="middle">' + esc(timeline[i].week) + '</text>'; }).join('');
    var points = timeline.map(function (r, i) {
      return '<circle class="plotpoint" cx="' + x(i) + '" cy="' + y(Number(r.value)) + '" r="' + (timeline.length > 40 ? 2.7 : 4.7) +
        '" tabindex="0" aria-label="' + esc(r.week) + ': ' + money(r.value) + '"><title>Semana ' + esc(r.week) + ' · ' + esc(r.date) + ' · ' + money(r.value) + ' en valor</title></circle>';
    }).join('');
    svg.innerHTML = grid + '<path class="plotfill" d="' + fill + '"/><path class="plotline" d="' + line + '"/>' + points + ticks;
  }

  /* -------------------------------------------------------------- paginas */
  function renderOverview() {
    var d = state.data, k = d.kpi, total = Number(k.sales);
    $('kSales').textContent = money(k.sales);
    $('kUnits').textContent = number(k.units);
    $('kProducts').textContent = integer(k.products);
    $('kAverage').textContent = money(k.weekly_average);
    $('weeksLabel').textContent = integer(k.weeks) + ' semanas observadas';
    drawLine('chartWeekly', d.timeline || []);
    bars('chartSegments', d.segments, { dimension: 'segment' });
    bars('chartAreas', d.regions, { dimension: 'region' });
    var seg = (d.segments || [])[0], reg = (d.regions || [])[0], bra = (d.brands || [])[0];
    $('insightSegment').textContent = seg ? seg.name : '—';
    $('insightRegion').textContent = reg ? reg.name : '—';
    $('insightBrand').textContent = bra ? bra.name : '—';
    $('insightNarrative').innerHTML = Number(k.records)
      ? '<strong>Concentracion observada.</strong> El segmento <strong>' + esc(seg.name) + '</strong> representa ' + percentage(seg.value, total) +
        ' del valor autorizado para tu perfil. <strong>' + esc(reg.name) + '</strong> es el area de mayor aporte (' + percentage(reg.value, total) +
        '); la marca lider es <strong>' + esc(bra.name) + '</strong>. Son descripciones del subconjunto que tu perfil puede consultar, no estimaciones causales.'
      : 'No hay registros autorizados que coincidan con los filtros. Ajusta el periodo o las dimensiones.';
  }

  function renderPortfolio() {
    var d = state.data;
    bars('chartBrands', d.brands, { limit: 10, dimension: 'brand' });
    bars('segmentDetail', d.segments, { dimension: 'segment', showShare: true });
    var total = Number(d.kpi.sales);
    var rows = d.products || [];
    $('tableCount').textContent = integer(d.products_total) + ' productos';
    $('tableHint').textContent = state.sort === 'unidades' ? 'Ordenado por unidades (en el servidor)' : 'Ordenado por valor (en el servidor)';
    Array.prototype.forEach.call(document.querySelectorAll('[data-sort]'), function (th) {
      var on = th.dataset.sort === state.sort;
      th.setAttribute('aria-sort', on ? 'descending' : 'none');
      th.textContent = th.dataset.label + (on ? ' ↓' : '');
    });
    $('productRows').innerHTML = rows.map(function (row, i) {
      return '<tr><td>' + (state.offset + i + 1) + '</td><td class="prod"><strong>' + esc(row.product) + '</strong><div class="mono">' + esc(row.code) + '</div></td>' +
        '<td>' + esc(row.brand) + '</td><td>' + esc(row.segment) + '</td><td class="num">' + money(row.value) + '</td>' +
        '<td class="num">' + number(row.units) + '</td><td class="num">' + percentage(row.value, total) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">No hay productos autorizados para esta busqueda.</td></tr>';
    var from = rows.length ? state.offset + 1 : 0;
    $('pageInfo').textContent = from + '–' + (state.offset + rows.length) + ' de ' + integer(d.products_total);
    $('prevPage').disabled = state.offset === 0;
    $('nextPage').disabled = state.offset + PAGE >= Number(d.products_total);
  }

  function renderTerritories() {
    var d = state.data, total = Number(d.kpi.sales);
    var vals = d.regions || [];
    var max = vals.length ? Number(vals[0].value) : 1;
    $('areaCards').innerHTML = vals.map(function (v) {
      return '<button type="button" class="area-card" data-area="' + esc(v.name) + '" title="Filtrar por ' + esc(v.name) + '">' +
        '<span class="area-n">' + esc(v.name) + '</span><span class="area-v">' + money(v.value) + '</span>' +
        '<span class="area-p">' + percentage(v.value, total) + ' del valor autorizado</span>' +
        '<div class="progress"><i style="width:' + (100 * v.value / max) + '%"></i></div></button>';
    }).join('') || '<div class="empty">No hay areas autorizadas en esta seleccion.</div>';
    Array.prototype.forEach.call($('areaCards').querySelectorAll('[data-area]'), function (el) {
      el.addEventListener('click', function () { chooseDimension('region', el.dataset.area); });
    });
    var heat = d.heatmap || [];
    if (!heat.length) { $('heatmap').innerHTML = '<div class="empty">No hay meses disponibles.</div>'; return; }
    var months = [], areas = [], index = {};
    heat.forEach(function (c) {
      if (months.indexOf(c.month) < 0) months.push(c.month);
      if (areas.indexOf(c.region) < 0) areas.push(c.region);
      index[c.region + '|' + c.month] = Number(c.value);
    });
    months.sort(); areas.sort();
    var hmax = Math.max.apply(null, heat.map(function (c) { return Number(c.value); }).concat([1]));
    var head = '<thead><tr><th>Area / Mes</th>' + months.map(function (m) { return '<th title="' + esc(m) + '">' + esc(m.slice(2)) + '</th>'; }).join('') + '</tr></thead>';
    var body = '<tbody>' + areas.map(function (a) {
      return '<tr><td>' + esc(a) + '</td>' + months.map(function (m) {
        var val = index[a + '|' + m] || 0, alpha = val / hmax;
        var bg = val === 0 ? '#f1f4f7' : 'rgba(12,128,142,' + (0.13 + 0.75 * alpha).toFixed(3) + ')';
        var fg = alpha > 0.56 ? 'white' : '#0f3442';
        return '<td style="background:' + bg + ';color:' + fg + '" title="' + esc(a) + ' · ' + esc(m) + ': ' + money(val) + '">' + (val ? compactShort(val) : '—') + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    $('heatmap').innerHTML = '<table class="heat" aria-label="Mapa de calor del valor de ventas por area y mes">' + head + body + '</table>';
  }

  async function renderScenario(n) {
    if (!state.ctx || !state.ctx.can_view_scenarios) return;
    if (n === undefined) n = state.seq;
    var w = Number($('scenarioWindow').value), h = Number($('scenarioHorizon').value), p = Number($('scenarioPct').value) / 100;
    $('scenarioPctLabel').textContent = '±' + integer(100 * p) + ' %';
    var args = filterArgs();
    args.p_window = w; args.p_horizon = h; args.p_pct = p;
    try {
      var s = await rpc('kriter_scenario', args);
      if (!vigente(n)) return;
      $('scenarioLow').textContent = money(s.low);
      $('scenarioBase').textContent = money(s.base);
      $('scenarioHigh').textContent = money(s.high);
      $('scenarioLowDetail').textContent = h + ' semanas · ' + integer(100 * p) + ' % bajo la base';
      $('scenarioBaseDetail').textContent = h + ' semanas · ' + money(s.weekly_average) + ' por semana';
      $('scenarioHighDetail').textContent = h + ' semanas · ' + integer(100 * p) + ' % sobre la base';
      var max = Math.max(Number(s.high), 1);
      var series = [['Conservador', Number(s.low), '#b18b55'], ['Base', Number(s.base), '#148e92'], ['Optimista', Number(s.high), '#1f76bc']];
      $('scenarioBars').innerHTML = series.map(function (it) {
        return '<div class="scenario-line"><strong>' + it[0] + '</strong><span class="track"><span class="fill" style="width:' +
          (it[1] / max * 100).toFixed(3) + '%;background:' + it[2] + '"></span></span>' +
          '<span style="text-align:right;font-variant-numeric:tabular-nums">' + compact(it[1]) + '</span></div>';
      }).join('');
      $('scenarioNote').innerHTML = '<strong>Base de calculo:</strong> ' + integer(s.weeks_used) + ' semanas observadas (ventana solicitada: ' + integer(s.window_requested) +
        '). Promedio semanal de ' + money(s.weekly_average) + ', multiplicado por un horizonte hipotetico de ' + integer(s.horizon) +
        ' semanas. El calculo se ejecuta en PostgreSQL sobre las filas que tu perfil puede consultar y NO incorpora estacionalidad, incertidumbre ni informacion posterior a la ultima semana autorizada.';
    } catch (err) {
      if (!vigente(n)) return;
      $('scenarioNote').innerHTML = '<strong>Denegado.</strong> ' + esc(readable(err));
    }
  }

  function renderMethod() {
    var d = state.data, ctx = state.ctx || {};
    var areas = (ctx.regions || []).map(function (r) { return r.name; }).join(', ') || '—';
    var rows = [
      ['Origen de datos', '<span class="ok">PostgreSQL administrado (Supabase) · dataset sintetico</span>'],
      ['Autorizacion', '<span class="ok">Row Level Security activo en todas las tablas protegidas</span>'],
      ['Identidad verificada', ctx.authenticated ? esc(ctx.email || ctx.display_name || '') : 'Sesion anonima'],
      ['Perfil activo', esc(ctx.role_name || 'Sin rol asignado')],
      ['Areas autorizadas', esc(areas)],
      ['Registros visibles para tu perfil', integer(d.kpi.records)],
      ['Semanas visibles', integer(d.kpi.weeks)],
      ['Productos en el alcance', integer(d.products_catalog)],
      ['Periodo visible', esc(d.kpi.first_week || '—') + ' → ' + esc(d.kpi.last_week || '—')],
      ['Exportacion CSV', ctx.can_export ? '<span class="ok">Autorizada</span>' : 'No autorizada para este perfil'],
      ['Simulacion de escenarios', ctx.can_view_scenarios ? '<span class="ok">Autorizada</span>' : 'No autorizada para este perfil'],
      ['Bitacora de seguridad', ctx.can_read_audit ? '<span class="ok">Autorizada</span>' : 'No autorizada para este perfil'],
      ['Calculo de agregados', 'En el servidor: el navegador no recibe registros fuera de alcance'],
      ['Unidad monetaria', 'Unidades de valor simuladas, no moneda real']
    ];
    $('auditRows').innerHTML = rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + r[1] + '</td></tr>'; }).join('');
  }

  async function renderSecurityLog(n) {
    if (!state.ctx || !state.ctx.can_read_audit) return;
    if (n === undefined) n = state.seq;
    var res = await sb.from('security_audit').select('occurred_at,event,origen,detail').order('occurred_at', { ascending: false }).limit(60);
    if (!vigente(n)) return;
    if (res.error) { $('logRows').innerHTML = '<tr><td colspan="4" class="empty">' + esc(readable(res.error)) + '</td></tr>'; return; }
    $('logRows').innerHTML = (res.data || []).map(function (r) {
      return '<tr><td class="mono">' + esc(new Date(r.occurred_at).toLocaleString('es-MX')) + '</td><td>' + esc(r.event) +
        '</td><td>' + esc(r.origen) + '</td><td class="mono" style="font-size:11px">' + esc(JSON.stringify(r.detail)) + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="empty">Sin eventos registrados.</td></tr>';
  }

  /* -------------------------------------------------------------- estado */
  function setStatus(text, kind) {
    var el = $('scope');
    el.textContent = text;
    el.className = kind === 'error' ? 'status-error' : (kind === 'loading' ? 'status-loading' : '');
  }

  function chooseDimension(dim, value) {
    state.filters[dim] = String(state.filters[dim] || '') === String(value) ? '' : String(value);
    state.offset = 0;
    syncControls();
    refresh();
  }

  function syncControls() {
    $('filterYear').value = state.filters.year;
    $('filterRegion').value = state.filters.region;
    $('filterSegment').value = state.filters.segment;
    $('filterBrand').value = state.filters.brand;
    $('filterFrom').value = state.filters.from;
    $('filterTo').value = state.filters.to;
  }

  async function refresh() {
    var n = ++state.seq;
    state.loading = true;
    setStatus('Consultando el servidor…', 'loading');
    try {
      var args = filterArgs();
      args.p_limit = PAGE; args.p_offset = state.offset; args.p_sort = state.sort; args.p_search = state.search || null;
      var datos = await rpc('kriter_dashboard', args);
      if (!vigente(n)) return;
      state.data = datos;
      var k = state.data.kpi;
      var areas = (state.ctx.regions || []).length;
      setStatus(integer(k.records) + ' registros autorizados · ' + integer(k.products) + ' productos · ' +
        integer(k.weeks) + ' semanas · ' + integer(areas) + ' area(s) en tu alcance');
      renderOverview(); renderPortfolio(); renderTerritories(); renderMethod();
      await renderScenario(n);
      await renderSecurityLog(n);
      if (!vigente(n)) return;
      $('appError').hidden = true;
    } catch (err) {
      if (!vigente(n)) return;
      state.lastError = err;
      setStatus(readable(err), 'error');
      $('appError').hidden = false;
      $('appErrorText').textContent = readable(err);
      if (err.code === '42501') { state.filters.region = ''; syncControls(); }
    } finally {
      if (vigente(n)) state.loading = false;
    }
  }

  async function loadContext() {
    state.ctx = await rpc('kriter_session_context');
    state.options = await rpc('kriter_filter_options');
    var allowed = (state.ctx.regions || []).map(function (r) { return r.name; });
    if (state.filters.region && allowed.indexOf(state.filters.region) < 0) state.filters.region = '';
    renderSession();
    renderFilterOptions();
    syncControls();
  }

  /* Iniciar o cerrar sesion dispara a la vez la llamada explicita y el evento
     de Supabase. Sin control, cuatro recargas simultaneas se pisan y el tablero
     puede quedarse vacio. Aqui solo corre una; si llegan mas peticiones
     mientras tanto, se vuelve a ejecutar una sola vez al terminar. */
  var enCurso = null, pendiente = false, motivoEnCurso = null;

  /* El motivo evita recargar dos veces por el mismo cambio: al iniciar sesion
     llegan la llamada explicita y el evento de Supabase, ambos con motivo
     'sesion'. Un motivo distinto (cerrar sesion, reintento) si encola otra. */
  function reload(motivo) {
    motivo = motivo || 'manual';
    if (enCurso) {
      if (motivo !== motivoEnCurso) { pendiente = motivo; }
      return enCurso;
    }
    motivoEnCurso = motivo;
    enCurso = (async function () {
      do {
        if (pendiente) { motivoEnCurso = pendiente; }
        pendiente = false;
        state.seq++;
        limpiarVista();
        setStatus('Comprobando tus permisos…', 'loading');
        try {
          await loadContext();
          await refresh();
        } catch (err) {
          setStatus(readable(err), 'error');
          $('appError').hidden = false;
          $('appErrorText').textContent = readable(err);
        }
      } while (pendiente);
    })();
    enCurso.catch(function () {}).then(function () { enCurso = null; motivoEnCurso = null; });
    return enCurso;
  }

  /* ------------------------------------------------------------ exportar */
  function quote(v) {
    var t = String(v === null || v === undefined ? '' : v);
    return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }

  async function exportCSV() {
    try {
      $('exportBtn').disabled = true;
      /* La funcion devuelve un unico jsonb: asi la API no trunca la exportacion. */
      var rows = await rpc('kriter_export_products', filterArgs());
      if (!Array.isArray(rows)) rows = [];
      var head = ['AREA', 'ITEM_CODE', 'PRODUCTO', 'MARCA', 'SEGMENTO', 'VENTAS_VALOR', 'VENTAS_UNIDADES', 'REGISTROS'];
      var csv = [head.join(',')];
      (rows || []).forEach(function (r) {
        csv.push([r.area, r.codigo, r.producto, r.marca, r.segmento, Number(r.valor).toFixed(4), r.unidades, r.registros].map(quote).join(','));
      });
      var blob = new Blob(['﻿' + csv.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'kriter_productos_autorizados.csv'; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      setStatus('Exportacion generada con ' + integer((rows || []).length) + ' filas autorizadas.');
    } catch (err) {
      $('appError').hidden = false;
      $('appErrorText').textContent = readable(err);
      setStatus(readable(err), 'error');
    } finally {
      $('exportBtn').disabled = !(state.ctx && state.ctx.can_export);
    }
  }

  /* ---------------------------------------------------------------- auth */
  function openLogin(open) {
    $('loginDialog').hidden = !open;
    $('loginError').hidden = true;
    if (open) setTimeout(function () { $('loginEmail').focus(); }, 30);
  }

  async function doLogin(ev) {
    ev.preventDefault();
    var btn = $('loginSubmit');
    btn.disabled = true; btn.textContent = 'Validando…';
    var res = await sb.auth.signInWithPassword({ email: $('loginEmail').value.trim(), password: $('loginPass').value });
    btn.disabled = false; btn.textContent = 'Entrar';
    if (res.error) {
      $('loginError').hidden = false;
      $('loginError').textContent = /Invalid login/i.test(res.error.message || '')
        ? 'Correo o contraseña incorrectos.' : readable(res.error);
      return;
    }
    $('loginPass').value = '';
    openLogin(false);
    report('sesion_iniciada', {});
    await reload('sesion');
  }

  async function doLogout() {
    report('sesion_cerrada', {});
    await sb.auth.signOut().catch(function () {});
    state.filters = { region: '', year: '', segment: '', brand: '', from: '', to: '' };
    state.offset = 0;
    await reload('cierre');
  }

  async function doGithub() {
    var res = await sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: location.origin + location.pathname } });
    if (res.error) { $('loginError').hidden = false; $('loginError').textContent = 'GitHub no esta habilitado como proveedor en este proyecto: ' + readable(res.error); }
  }

  /* ----------------------------------------------------------- arranque */
  function wire() {
    var setMenu = function (open) {
      $('sidebar').classList.toggle('show', open);
      $('showMenu').setAttribute('aria-expanded', String(open));
    };
    $('showMenu').addEventListener('click', function () { setMenu(!$('sidebar').classList.contains('show')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); openLogin(false); } });
    Array.prototype.forEach.call(document.querySelectorAll('[data-page]'), function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(document.querySelectorAll('[data-page]'), function (b) { b.classList.remove('active'); b.removeAttribute('aria-current'); });
        btn.classList.add('active'); btn.setAttribute('aria-current', 'page');
        Array.prototype.forEach.call(document.querySelectorAll('.page'), function (p) { p.classList.remove('active'); });
        $('page-' + btn.dataset.page).classList.add('active');
        setMenu(false);
        if (btn.dataset.page === 'resumen' && state.data) drawLine('chartWeekly', state.data.timeline || []);
      });
    });
    ['filterYear', 'filterRegion', 'filterSegment', 'filterBrand', 'filterFrom', 'filterTo'].forEach(function (id) {
      $(id).addEventListener('change', function () {
        var key = id.replace('filter', '').toLowerCase();
        state.filters[key] = $(id).value;
        state.offset = 0;
        refresh();
      });
    });
    $('resetBtn').addEventListener('click', function () {
      state.filters = { region: '', year: '', segment: '', brand: '', from: '', to: '' };
      state.search = ''; $('productSearch').value = ''; state.offset = 0;
      syncControls(); refresh();
    });
    var searchTimer = 0;
    $('productSearch').addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { state.search = $('productSearch').value.trim(); state.offset = 0; refresh(); }, 320);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-sort]'), function (th) {
      var go = function () { state.sort = th.dataset.sort; state.offset = 0; refresh(); };
      th.addEventListener('click', go);
      th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    $('prevPage').addEventListener('click', function () { state.offset = Math.max(0, state.offset - PAGE); refresh(); });
    $('nextPage').addEventListener('click', function () { state.offset += PAGE; refresh(); });
    ['scenarioWindow', 'scenarioHorizon', 'scenarioPct'].forEach(function (id) {
      $(id).addEventListener('input', function () { renderScenario(state.seq); });
    });
    $('exportBtn').addEventListener('click', exportCSV);
    $('loginBtn').addEventListener('click', function () { openLogin(true); });
    $('loginCancel').addEventListener('click', function () { openLogin(false); });
    $('loginForm').addEventListener('submit', doLogin);
    $('logoutBtn').addEventListener('click', doLogout);
    $('githubBtn').addEventListener('click', doGithub);
    $('retryBtn').addEventListener('click', function () { reload('reintento'); });
    var frame = 0;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () { if (state.data && $('page-resumen').classList.contains('active')) drawLine('chartWeekly', state.data.timeline || []); });
    });
    sb.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') reload('cierre');
      else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') reload('sesion');
    });
  }

  if (!CFG.url || !CFG.key) {
    setStatus('Configuracion de Supabase ausente: la aplicacion no puede conectarse.', 'error');
    return;
  }
  $('githubBtn').hidden = !CFG.github_oauth;
  wire();
  reload('inicio');
})();
