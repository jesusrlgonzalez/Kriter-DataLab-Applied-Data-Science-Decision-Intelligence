# ==============================================================================
# Proyecto: Kriter DataLab
# Autor: Jesus R.L. Gonzalez
# Derechos Reservados (c) 2026
# ==============================================================================
"""Compila la versión estática pública desde el dataset sintético versionado."""
from __future__ import annotations
import csv,hashlib,json,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/demo_sales.csv"
OUTPUT=ROOT/"site/index.html"

def index_of(items,mapping,key,f=lambda x:x):
    if key not in mapping:
        mapping[key]=len(items)
        items.append(f(key))
    return mapping[key]

def build():
    weeks,regions,segments,brands,products=[],[],[],[],[]
    maps=[{} for _ in range(5)]
    rows=[]
    total_val=0
    total_units=0
    with DATA.open(encoding="utf-8",newline="") as stream:
        for entry in csv.DictReader(stream):
            wi=index_of(weeks,maps[0],entry["SEMANA"],lambda v:{"label":v,"date":entry["FECHA"],"y":int(entry["ANIO"])})
            ar=index_of(regions,maps[1],entry["REGION"])
            se=index_of(segments,maps[2],entry["SEGMENTO"])
            br=index_of(brands,maps[3],entry["MARCA"])
            pr=index_of(products,maps[4],entry["ITEM_CODE"],lambda v:{"code":v,"name":entry["PRODUCTO"],"brand":br,"segment":se})
            assert products[pr]["brand"]==br and products[pr]["segment"]==se
            value=float(entry["VENTAS_VALOR"]); units=float(entry["VENTAS_UNIDADES"])
            if value<0 or units<0: raise ValueError("No se admiten métricas negativas en el escenario")
            rows.append([wi,ar,se,br,pr,value,units]);total_val+=value;total_units+=units
    order=sorted(range(len(weeks)),key=lambda i:weeks[i]["date"])
    remap={old:new for new,old in enumerate(order)}
    for row in rows:row[0]=remap[row[0]]
    weeks=[weeks[i] for i in order]
    expected=80*6*42
    assert len(rows)==expected, (len(rows),expected)
    assert len(weeks)==80 and len(regions)==6 and len(segments)==7 and len(brands)==24 and len(products)==350
    assert len({(r[0],r[1],r[4]) for r in rows})==len(rows),"Duplicados en semana-área-producto"
    digest=hashlib.sha256(DATA.read_bytes()).hexdigest()
    payload={"weeks":weeks,"regions":regions,"segments":segments,"brands":brands,"products":products,"rows":rows,
             "profile":{"rows":len(rows),"weeks":len(weeks),"products":len(products),"regions":len(regions),
              "segments":len(segments),"brands":len(brands),"sales_value":round(total_val,4),
              "sales_units":round(total_units,4),"start_date":weeks[0]["date"],"end_date":weeks[-1]["date"],"seed":20261112},
             "sha256_csv":digest}
    template=(ROOT/"src/template.html").read_text(encoding="utf8")
    css=(ROOT/"src/styles.css").read_text(encoding="utf8")
    js=(ROOT/"src/app.js").read_text(encoding="utf8")
    for marker in ["__KRITER_CSS__","__KRITER_JS__","__KRITER_DATA__"]:assert marker in template
    doc=template.replace("__KRITER_CSS__",css).replace("__KRITER_JS__",js)
    doc=doc.replace("__KRITER_DATA__",json.dumps(payload,ensure_ascii=False,separators=(",",":" )).replace("</",r"<\/"))
    OUTPUT.parent.mkdir(exist_ok=True,parents=True)
    OUTPUT.write_text(doc,encoding="utf8")
    result={"file":"site/index.html","html_sha256":hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
            "dataset_sha256":digest,"rows":len(rows),"products":len(products),"regions":len(regions),
            "weeks":len(weeks),"sales_value":round(total_val,4),"sales_units":round(total_units,4),
            "source_type":"synthetic","seed":20261112}
    print(json.dumps(result,indent=2,ensure_ascii=False))
    return result
if __name__=="__main__":build()
