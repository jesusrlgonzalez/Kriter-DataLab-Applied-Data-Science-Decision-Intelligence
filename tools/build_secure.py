#!/usr/bin/env python3
"""Compila la version autenticada (Supabase + RLS) en un unico HTML estatico.

Lee las fuentes de src-secure/, la hoja de estilos base de src/styles.css y el
cliente oficial de Supabase incluido en vendor/. La configuracion publica
(URL y clave publicable) se toma de las variables de entorno SUPABASE_URL y
SUPABASE_PUBLISHABLE_KEY o, en su defecto, de supabase/public_config.json.
Nunca se incorpora una clave privilegiada: build_secure falla si la detecta.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "site-secure"
VENDOR = ROOT / "vendor" / "supabase-js-2.119.0.umd.js"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from security_scan import jwt_privilegiado, PATRONES


def credenciales(texto: str) -> list[str]:
    """Hallazgos de credenciales reales (no simples menciones del termino)."""
    return [etiqueta for etiqueta, patron in PATRONES if patron.search(texto)] + jwt_privilegiado(texto)


def leer_config() -> dict:
    cfg = json.loads((ROOT / "supabase" / "public_config.json").read_text("utf-8"))
    cfg["url"] = os.environ.get("SUPABASE_URL") or cfg["url"]
    cfg["key"] = os.environ.get("SUPABASE_PUBLISHABLE_KEY") or cfg["key"]
    flag = os.environ.get("SUPABASE_GITHUB_OAUTH")
    if flag is not None:
        cfg["github_oauth"] = flag.strip().lower() in {"1", "true", "si", "sí", "yes"}
    if not cfg["url"].startswith("https://") or not cfg["key"]:
        raise SystemExit("Configuracion publica invalida: revisa SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY")
    if credenciales(cfg["key"]):
        raise SystemExit("La clave configurada parece privilegiada: no se publica")
    return {"url": cfg["url"], "key": cfg["key"], "github_oauth": bool(cfg.get("github_oauth", False))}


def main() -> int:
    cfg = leer_config()
    css = (ROOT / "src" / "styles.css").read_text("utf-8").rstrip() + "\n" + \
          (ROOT / "src-secure" / "styles.extra.css").read_text("utf-8")
    vendor = VENDOR.read_text("utf-8")
    app = (ROOT / "src-secure" / "app.js").read_text("utf-8")
    html = (ROOT / "src-secure" / "template.html").read_text("utf-8")

    for marca, valor in (("__KRITER_CSS__", css), ("__KRITER_CONFIG__", json.dumps(cfg, ensure_ascii=False)),
                         ("__KRITER_VENDOR__", vendor), ("__KRITER_JS__", app)):
        if html.count(marca) != 1:
            raise SystemExit(f"Marcador ausente o duplicado en la plantilla: {marca}")
        html = html.replace(marca, valor)

    if "__KRITER_" in html:
        raise SystemExit("Quedaron marcadores sin sustituir")
    hallazgos = credenciales(html)
    if hallazgos:
        raise SystemExit("El artefacto contiene credenciales: " + ", ".join(hallazgos))

    OUT.mkdir(exist_ok=True)
    destino = OUT / "index.html"
    destino.write_text(html, "utf-8", newline="\n")
    sha = hashlib.sha256(destino.read_bytes()).hexdigest()
    print(json.dumps({
        "archivo": str(destino.relative_to(ROOT)),
        "bytes": destino.stat().st_size,
        "html_sha256": sha,
        "supabase_url": cfg["url"],
        "github_oauth": cfg["github_oauth"],
        "vendor_sha256": hashlib.sha256(VENDOR.read_bytes()).hexdigest(),
    }, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
