# ==============================================================================
# Proyecto: Kriter Sales Intelligence
# Autor: Jesus R.L. Gonzalez
# Derechos Reservados (c) 2026
# ==============================================================================
"""Pruebas de integridad, contratos y artefactos de despliegue."""
from __future__ import annotations
import csv,hashlib,io,subprocess,sys,unittest,re
from pathlib import Path
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]

class TestDelivery(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.csv_bytes=(ROOT/"data/demo_sales.csv").read_bytes()
        cls.rows=list(csv.DictReader(io.StringIO(cls.csv_bytes.decode("utf8"))))
        cls.html=(ROOT/"site/index.html").read_text("utf8")

    def test_source_synthetic(self):
        self.assertEqual(len(self.rows),20160)
        self.assertEqual(len({r["REGION"] for r in self.rows}),6)
        self.assertEqual(len({r["SEMANA"] for r in self.rows}),80)
        self.assertEqual(len({r["ITEM_CODE"] for r in self.rows}),350)
        self.assertEqual(len({r["MARCA"] for r in self.rows}),24)
        self.assertEqual(len({r["SEGMENTO"] for r in self.rows}),7)

    def test_keys_and_foreign_keys(self):
        keys=[(r["SEMANA"],r["REGION"],r["ITEM_CODE"]) for r in self.rows]
        self.assertEqual(len(set(keys)),len(keys))
        seen={}
        for row in self.rows:
            ref=(row["SEGMENTO"],row["MARCA"],row["PRODUCTO"])
            if row["ITEM_CODE"] in seen:self.assertEqual(seen[row["ITEM_CODE"]],ref)
            seen[row["ITEM_CODE"]]=ref

    def test_values_and_time(self):
        self.assertTrue(all(float(r["VENTAS_VALOR"])>=0 for r in self.rows))
        self.assertTrue(all(float(r["VENTAS_UNIDADES"])>=0 for r in self.rows))
        self.assertTrue(all(r["ANIO"]==r["FECHA"][:4] for r in self.rows))

    def test_static_page_contract(self):
        self.assertTrue(self.html.lower().startswith('<!doctype html>'))
        self.assertIn('Kriter Sales Intelligence',self.html)
        self.assertIn('datos sintéticos',self.html.lower())
        self.assertIn(hashlib.sha256(self.csv_bytes).hexdigest(),self.html)
        for x in ['kSales','filterRegion','filterBrand','scenarioBase','chartWeekly','exportBtn']:
            self.assertIn('id="'+x+'"',self.html)
        self.assertNotIn('__KRITER_DATA__',self.html)

    def test_no_external_scripts_or_resources(self):
        self.assertNotRegex(self.html,r'<script[^>]+src=')
        self.assertNotRegex(self.html,r'<link[^>]+href="https?://')
        self.assertNotRegex(self.html,r'fetch\s*\(')

    def test_no_course_markers_in_public_app(self):
        for value in ['EBAC','P26','Proyecto académico','docente','Power BI Service']:
            self.assertNotIn(value,self.html)

    def test_space_readme(self):
        rd=(ROOT/'site/README.md').read_text('utf8')
        self.assertTrue(rd.startswith('---\n'))
        self.assertIn('sdk: static',rd)
        self.assertIn('app_file: index.html',rd)
        for line in ['title: Kriter Sales Intelligence','colorFrom: blue','colorTo: cyan']:
            self.assertIn(line,rd)
        self.assertEqual(sorted(p.name for p in (ROOT/'site').iterdir()),['README.md','index.html'])
        for banned in ['Dockerfile','requirements.txt','app.py']:
            self.assertFalse((ROOT/banned).exists() or (ROOT/'site'/banned).exists())

    def test_deploy_workflow_contract(self):
        wf=(ROOT/'.github/workflows/deploy-huggingface.yml').read_text('utf8')
        for needle in ['huggingface/hub-sync@v0.3.0','subdirectory: site','space_sdk: static','secrets.HF_TOKEN','vars.HF_SPACE_ID','needs: validar','concurrency:']:
            self.assertIn(needle,wf)
        self.assertNotRegex(wf,r'hf_[A-Za-z0-9]{20,}')

    def test_reproducible_files(self):
        paths=[ROOT/'data/demo_sales.csv',ROOT/'site/index.html']
        old=[hashlib.sha256(p.read_bytes()).hexdigest() for p in paths]
        for script in ['generate_data.py','build.py']:
            completed=subprocess.run([sys.executable,str(ROOT/'tools'/script)],capture_output=True,text=True)
            self.assertEqual(completed.returncode,0,completed.stderr)
        new=[hashlib.sha256(p.read_bytes()).hexdigest() for p in paths]
        self.assertEqual(old,new)

if __name__=='__main__':unittest.main()
