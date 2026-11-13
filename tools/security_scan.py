#!/usr/bin/env python3
"""Comprobacion de seguridad del artefacto publicable y del repositorio.

Verifica que no se publiquen credenciales privilegiadas ni datos protegidos.
Devuelve 0 si todo esta conforme; 1 y el detalle si encuentra un hallazgo.
Uso: python tools/security_scan.py [rutas...]   (por omision, site-secure/)
"""
from __future__ import annotations

import base64
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PATRONES = [
    ("clave secreta de Supabase",      re.compile(r"sb_secret_[A-Za-z0-9_\-]{8,}")),
    ("clave privada PEM",              re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("token de GitHub",                re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}")),
    ("token de Hugging Face",          re.compile(r"\bhf_[A-Za-z0-9]{30,}")),
    ("clave de AWS",                   re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("cadena de conexion con usuario", re.compile(r"postgres(?:ql)?://[^\s:@/]+:[^\s@/]+@")),
    ("contrasena literal",             re.compile(r"(?i)\b(?:password|contrase(?:n|ñ)a|passwd)\s*[:=]\s*[\"'][^\"'\s]{6,}[\"']")),
]

# Datos comerciales que nunca deben viajar incrustados en el artefacto publico.
DATOS = [
    ("cabecera del dataset CSV", re.compile(r"VENTAS_VALOR\s*,\s*VENTAS_UNIDADES")),
    ("codigos de producto incrustados", re.compile(r"KS-\d{4}")),
]

JWT = re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.([A-Za-z0-9_\-]{10,})\.[A-Za-z0-9_\-]{10,}")


def jwt_privilegiado(texto: str) -> list[str]:
    hallazgos = []
    for m in JWT.finditer(texto):
        cuerpo = m.group(1)
        relleno = cuerpo + "=" * (-len(cuerpo) % 4)
        try:
            datos = json.loads(base64.urlsafe_b64decode(relleno).decode("utf-8", "replace"))
        except Exception:
            continue
        if str(datos.get("role", "")).lower() in {"service_role", "supabase_admin"}:
            hallazgos.append(f"JWT con rol {datos.get('role')}")
    return hallazgos


def revisar(ruta: Path) -> list[str]:
    texto = ruta.read_text("utf-8", errors="replace")
    hallazgos = [f"{etiqueta}: {m.group(0)[:40]}…" for etiqueta, patron in PATRONES
                 for m in [patron.search(texto)] if m]
    hallazgos += jwt_privilegiado(texto)
    if ruta.suffix in {".html", ".js"} and "site-secure" in ruta.as_posix():
        hallazgos += [f"dato protegido incrustado ({etiqueta})" for etiqueta, patron in DATOS if patron.search(texto)]
    return hallazgos


def main(argv: list[str]) -> int:
    objetivos = [Path(a) for a in argv[1:]] or [ROOT / "site-secure"]
    archivos: list[Path] = []
    for objetivo in objetivos:
        objetivo = objetivo if objetivo.is_absolute() else ROOT / objetivo
        if objetivo.is_dir():
            archivos += [p for p in objetivo.rglob("*") if p.is_file()]
        elif objetivo.is_file():
            archivos.append(objetivo)
    problemas: dict[str, list[str]] = {}
    for archivo in sorted(archivos):
        if archivo.suffix in {".png", ".jpg", ".zip", ".ico"}:
            continue
        hallazgos = revisar(archivo)
        if hallazgos:
            problemas[archivo.relative_to(ROOT).as_posix()] = hallazgos
    if problemas:
        print(json.dumps({"estado": "FALLA", "hallazgos": problemas}, indent=2, ensure_ascii=False))
        return 1
    print(json.dumps({"estado": "PASS", "archivos_revisados": len(archivos)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
