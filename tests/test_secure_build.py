"""Contratos del artefacto estatico de la version con control de acceso."""
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTEFACTO = ROOT / "site-secure" / "index.html"
README = ROOT / "site-secure" / "README.md"


class ArtefactoSeguro(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = ARTEFACTO.read_text("utf-8")

    def test_es_html_completo_sin_marcadores(self):
        self.assertTrue(self.html.startswith("<!DOCTYPE html>"))
        self.assertNotIn("__KRITER_", self.html)
        self.assertIn("</html>", self.html.strip()[-10:])

    def test_frontmatter_del_space(self):
        rd = README.read_text("utf-8")
        for linea in ["sdk: static", "app_file: index.html", "colorFrom: blue", "license: other"]:
            self.assertIn(linea, rd)

    def test_configuracion_publica_sin_privilegios(self):
        cfg = json.loads(re.search(r"window\.KRITER_CONFIG=(\{.*?\});", self.html, re.S).group(1))
        self.assertTrue(cfg["url"].startswith("https://"))
        self.assertTrue(cfg["key"].startswith("sb_publishable_") or cfg["key"].startswith("eyJ"))
        self.assertNotIn("service_role", json.dumps(cfg))

    def test_sin_datos_comerciales_incrustados(self):
        """La version anterior incrustaba 20,160 registros; esta no debe hacerlo."""
        self.assertNotRegex(self.html, r"KS-\d{4}")
        self.assertNotIn("VENTAS_VALOR,VENTAS_UNIDADES", self.html)
        self.assertLess(ARTEFACTO.stat().st_size, 400_000)

    def test_la_interfaz_no_decide_permisos(self):
        """El cliente nunca filtra por region: delega en las funciones del servidor."""
        app = (ROOT / "src-secure" / "app.js").read_text("utf-8")
        self.assertNotRegex(app, r"\.filter\([^)]*regions?\s*\.\s*includes")
        for fn in ["kriter_session_context", "kriter_dashboard", "kriter_scenario",
                   "kriter_export_products", "kriter_log_event"]:
            self.assertIn(fn, app)

    def test_oculta_controles_no_autorizados(self):
        css = (ROOT / "src-secure" / "styles.extra.css").read_text("utf-8")
        self.assertIn("[hidden]{display:none !important}", css)

    def test_analisis_de_seguridad(self):
        r = subprocess.run([sys.executable, str(ROOT / "tools" / "security_scan.py")],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_el_analisis_falla_si_no_revisa_nada(self):
        """Un escaner que no encuentra el objetivo no debe reportar conformidad."""
        r = subprocess.run([sys.executable, str(ROOT / "tools" / "security_scan.py"), "ruta_inexistente"],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("FALLA", r.stdout)

    def test_sin_dependencias_de_fastapi_ni_docker(self):
        for prohibido in ["Dockerfile", "requirements.txt"]:
            self.assertFalse((ROOT / "site-secure" / prohibido).exists())
        self.assertNotIn("fastapi", self.html.lower())

    def test_cliente_supabase_incluido(self):
        self.assertIn("supabase.createClient", self.html)
        self.assertIn("var supabase=", self.html)


class Migraciones(unittest.TestCase):
    def test_orden_y_contenido(self):
        archivos = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
        self.assertGreaterEqual(len(archivos), 3)
        juntas = "\n".join(p.read_text("utf-8") for p in archivos)
        self.assertIn("enable row level security", juntas)
        self.assertIn("auth.uid()", juntas)
        self.assertNotRegex(juntas, r"(?i)create\s+policy[^;]+for\s+(insert|update|delete)")


if __name__ == "__main__":
    unittest.main()
