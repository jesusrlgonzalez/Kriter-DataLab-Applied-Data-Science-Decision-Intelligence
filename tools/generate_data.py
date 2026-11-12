# ==============================================================================
# Proyecto: Kriter Sales Intelligence
# Autor: Jesus R.L. Gonzalez
# Derechos Reservados (c) 2026
# ==============================================================================
"""Crea un conjunto comercial sintético determinista, sin registros de terceros."""
from __future__ import annotations
import csv
from datetime import date,timedelta
from pathlib import Path
from random import Random

SEED=20261112
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"data"/"demo_sales.csv"
REGIONS=["Norte", "Occidente", "Centro", "Bajío", "Sureste", "Metropolitana"]
SEGMENTS=["Cuidado textil", "Limpieza", "Higiene", "Desinfección", "Accesorios", "Mantenimiento", "Otros"]
BRANDS=[f"Portafolio {i:02d}" for i in range(1,25)]
ROWS_PER_WEEK_REGION=42
WEEKS=80
PRODUCTS=350

def product_meta(i:int):
    segment=(i*11+i//12)%len(SEGMENTS)
    brand=(i*7+i//13)%len(BRANDS)
    name=f"Producto {SEGMENTS[segment].lower()} {i+1:03d}"
    return segment,brand,name

def main():
    rng=Random(SEED)
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    with OUTPUT.open("w",encoding="utf-8",newline="") as stream:
        writer=csv.writer(stream)
        writer.writerow(["SEMANA","FECHA","ANIO","REGION","ITEM_CODE","PRODUCTO","SEGMENTO","MARCA","VENTAS_VALOR","VENTAS_UNIDADES"])
        for wi in range(WEEKS):
            dt=date(2024,1,8)+timedelta(weeks=wi)
            label=f"{dt.isocalendar().year}-S{dt.isocalendar().week:02d}"
            seasonal=1+.15*(wi%13)/12
            trend=1+.0038*wi
            for area,region in enumerate(REGIONS):
                # Muestra reproducible con estructura de panel, sin proyecciones de negocio reales.
                skus=rng.sample(range(PRODUCTS), ROWS_PER_WEEK_REGION)
                for product in skus:
                    seg,br,name=product_meta(product)
                    unit_count=rng.randint(2,45)
                    nominal=18+(product%17)*6+(seg*4)+(br%5)*3
                    factor=(.83+area*.075)*seasonal*trend*(.83+rng.random()*.34)
                    amount=round(unit_count*nominal*factor,4)
                    writer.writerow([label,dt.isoformat(),dt.year,region,f"KS-{product+1:04d}",name,SEGMENTS[seg],BRANDS[br],f"{amount:.4f}",unit_count])
    print(f"Dataset sintético: {OUTPUT} ({WEEKS*len(REGIONS)*ROWS_PER_WEEK_REGION} registros)")

if __name__=="__main__":main()
