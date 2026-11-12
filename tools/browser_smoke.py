# ==============================================================================
# Proyecto: Kriter DataLab
# Autor: Jesus R.L. Gonzalez
# Derechos Reservados (c) 2026
# ==============================================================================
"""Prueba funcional en navegador del contenido estático compilado."""
from __future__ import annotations
import csv,hashlib,json,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
EVID=ROOT/'evidence'
EVID.mkdir(exist_ok=True)
checks={}
errors=[]
requests=[]
def formatter(n):return f'{n:,.2f}'
# Navegador: variable KRITER_BROWSER, un Chrome/Chromium del sistema o el Chromium de Playwright.
BROWSER=os.environ.get('KRITER_BROWSER') or next((p for p in map(shutil.which,['chromium','chromium-browser','google-chrome','chrome']) if p),None)

with (ROOT/'data/demo_sales.csv').open('r',encoding='utf8',newline='') as f:
    records=list(csv.DictReader(f))
total=sum(float(r['VENTAS_VALOR']) for r in records)
region=sum(float(r['VENTAS_VALOR']) for r in records if r['REGION']=='Norte')
brand=sum(float(r['VENTAS_VALOR']) for r in records if r['MARCA']=='Portafolio 01')
annual=sum(float(r['VENTAS_VALOR']) for r in records if r['ANIO']=='2024')
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=BROWSER,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1500,'height':960},accept_downloads=True,locale='es-MX')
        page=context.new_page()
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.on('request',lambda req:requests.append(req.url))
        page.set_content((SITE/'index.html').read_text('utf8'),wait_until='load',timeout=30000)
        checks['carga_documento']=(page.locator('#page-resumen').count()==1)
        checks['marca']=(page.title().startswith('Kriter DataLab'))
        checks['aviso_sintetico']=('datos sintéticos' in page.locator('#page-resumen').inner_text().lower())
        checks['ventas_reconciliadas']=(page.locator('#kSales').inner_text()==formatter(total))
        checks['cobertura_registros']=('20,160 registros' in page.locator('#scope').inner_text())
        checks['semana_80']=('80 semanas' in page.locator('#scope').inner_text())
        page.screenshot(path=str(EVID/'01_vista_escritorio.png'),full_page=True)
        page.select_option('#filterRegion',label='Norte')
        checks['filtro_region']=(page.locator('#kSales').inner_text()==formatter(region))
        page.select_option('#filterRegion',value='')
        page.select_option('#filterBrand',label='Portafolio 01')
        checks['filtro_marca']=(page.locator('#kSales').inner_text()==formatter(brand))
        page.select_option('#filterBrand',value='')
        page.select_option('#filterYear',label='2024')
        checks['filtro_anio']=(page.locator('#kSales').inner_text()==formatter(annual))
        page.locator('#resetBtn').click()
        checks['restablecer']=(page.locator('#kSales').inner_text()==formatter(total))
        page.locator('[data-page="productos"]').click()
        checks['navegacion_productos']=(page.locator('#page-productos').is_visible() and page.locator('#productRows tr').count()==25)
        page.locator('#productSearch').fill('Producto limpieza')
        checks['busqueda']=('Producto limpieza' in page.locator('#productRows').inner_text())
        page.locator('#productSearch').fill('')
        with page.expect_download() as di:page.locator('#exportBtn').click()
        artifact=di.value
        export=EVID/'export_smoke.csv';artifact.save_as(str(export))
        with export.open('r',encoding='utf-8-sig',newline='') as f:download=list(csv.DictReader(f))
        checks['descarga_csv']=(artifact.suggested_filename=='kriter_productos_filtrados.csv' and len(download)==350 and abs(sum(float(r['VENTAS_VALOR']) for r in download)-total)<0.01)
        page.locator('[data-page="territorios"]').click()
        checks['navegacion_territorios']=(page.locator('#heatmap table').count()==1 and page.locator('.area-card').count()==6)
        page.locator('[data-page="escenarios"]').click()
        previous=page.locator('#scenarioHigh').inner_text()
        page.locator('#scenarioPct').fill('18')
        checks['simulacion_activa']=(previous!=page.locator('#scenarioHigh').inner_text())
        page.locator('[data-page="metodologia"]').click()
        checks['metodologia']=(hashlib.sha256((ROOT/'data/demo_sales.csv').read_bytes()).hexdigest() in page.locator('#auditRows').inner_text())
        page.locator('#resetBtn').click()
        seg=sum(float(r['VENTAS_VALOR']) for r in records if r['SEGMENTO']=='Higiene')
        page.select_option('#filterSegment',label='Higiene')
        checks['filtro_segmento']=(page.locator('#kSales').inner_text()==formatter(seg))
        page.locator('#resetBtn').click()
        weeks=sorted({r['FECHA'] for r in records})
        rng=[r for r in records if weeks[10]<=r['FECHA']<=weeks[19]]
        page.select_option('#filterFrom',value='10');page.select_option('#filterTo',value='19')
        checks['filtro_rango_semanas']=(page.locator('#kSales').inner_text()==formatter(sum(float(r['VENTAS_VALOR']) for r in rng)) and page.locator('#kUnits').inner_text()==f"{sum(int(r['VENTAS_UNIDADES']) for r in rng):,}" and page.locator('#kProducts').inner_text()==str(len({r['ITEM_CODE'] for r in rng})))
        page.select_option('#filterFrom',value='30')
        checks['rango_invertido_explicado']=('invertido' in page.locator('#scope').inner_text() and page.locator('#kSales').inner_text()=='0.00')
        page.locator('#resetBtn').click()
        byweek={}
        for r in records:byweek[r['FECHA']]=byweek.get(r['FECHA'],0)+float(r['VENTAS_VALOR'])
        expected_base=sum(byweek[w] for w in weeks[-8:])/8*4
        page.locator('[data-page="escenarios"]').click()
        checks['escenario_base_reconciliado']=(page.locator('#scenarioBase').inner_text()==formatter(expected_base) and page.locator('#scenarioHigh').inner_text()==formatter(expected_base*1.18))
        page.locator('[data-page="productos"]').click()
        page.locator('th[data-sort="unidades"]').focus();page.keyboard.press('Enter')
        units={}
        for r in records:units[r['ITEM_CODE']]=units.get(r['ITEM_CODE'],0)+int(r['VENTAS_UNIDADES'])
        checks['orden_por_teclado']=(page.locator('th[data-sort="unidades"]').get_attribute('aria-sort')=='descending' and page.locator('#productRows tr').first.locator('td').nth(5).inner_text()==f"{max(units.values()):,}")
        page.locator('[data-page="resumen"]').click()
        page.locator('#chartSegments button').first.click()
        checks['filtro_por_grafico']=(page.locator('#filterSegment').input_value()!='' and page.locator('#chartSegments button[aria-pressed="true"]').count()==1 and page.locator('#chartWeekly circle').count()==80)
        page.locator('#resetBtn').click()
        checks['etiquetas_accesibles']=page.evaluate("()=>[...document.querySelectorAll('input,select')].every(e=>e.labels.length||e.getAttribute('aria-label'))&&document.documentElement.lang==='es'&&document.querySelectorAll('h1').length===1")
        checks['sin_solicitudes_externas']=(not any(x.startswith(('http://','https://')) for x in requests))
        checks['sin_errores_javascript']=(not errors)
        context.close()
        mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,device_scale_factor=1,has_touch=True)
        mp=mobile.new_page();mp.set_content((SITE/'index.html').read_text('utf8'),wait_until='load',timeout=30000)
        checks['responsive_movil']=(mp.locator('#kSales').is_visible() and mp.locator('#showMenu').is_visible())
        checks['movil_sin_desborde']=mp.evaluate("()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth")
        mp.locator('#showMenu').click();opened=mp.locator('#showMenu').get_attribute('aria-expanded')
        mp.locator('[data-page="territorios"]').click();mp.wait_for_timeout(300)
        checks['menu_movil']=(opened=='true' and mp.locator('#showMenu').get_attribute('aria-expanded')=='false' and mp.locator('#heatmap table').is_visible() and 'sintéticos' in mp.locator('.filter-bar').inner_text())
        mp.locator('#showMenu').click();mp.locator('[data-page="resumen"]').click();mp.wait_for_timeout(300)
        mp.screenshot(path=str(EVID/'02_vista_movil.png'),full_page=True)
        mobile.close();browser.close()
finally:
    pass
status='PASS' if all(checks.values()) else 'FAIL'
report={'status':status,'passed':sum(checks.values()),'tests_total':len(checks),'checks':checks,'js_errors':errors,'request_count':len(requests)}
(EVID/'browser_checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print(json.dumps(report,ensure_ascii=False,indent=2))
if status!='PASS':raise SystemExit(1)
