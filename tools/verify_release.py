# ==============================================================================
# Proyecto: Kriter DataLab
# Autor: Jesus R.L. Gonzalez
# Derechos Reservados (c) 2026
# ==============================================================================
"""Verifica cada archivo del paquete frente al manifiesto SHA-256.

Con --write regenera el manifiesto (úsalo tras cambiar cualquier archivo versionado).
"""
from __future__ import annotations
import hashlib,sys
from pathlib import Path

root=Path(__file__).resolve().parents[1]
manifest=root/'MANIFIESTO_SHA256.txt'
SKIP={'.git','__pycache__','.pytest_cache','.venv','node_modules'}
if '--write' in sys.argv:
    files=sorted(p for p in root.rglob('*') if p.is_file() and p!=manifest and not SKIP&set(p.relative_to(root).parts) and p.suffix!='.zip')
    lines=['# Kriter DataLab - hashes SHA256 (archivos del repositorio)']
    lines+=[f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(root).as_posix()}" for p in files]
    manifest.write_text('\n'.join(lines)+'\n','utf8',newline='\n')
    print(f'Manifiesto regenerado: {len(files)} archivos')
entries=[line for line in manifest.read_text('utf8').splitlines() if line and not line.startswith('#')]
for line in entries:
    expected,rel=line.split('  ',1)
    path=root/rel
    if not path.is_file():raise RuntimeError(f'Archivo faltante: {rel}')
    actual=hashlib.sha256(path.read_bytes()).hexdigest()
    if actual!=expected:raise RuntimeError(f'Hash diferente: {rel}')
print(f'PASS: {len(entries)} archivos verificados por SHA-256')
