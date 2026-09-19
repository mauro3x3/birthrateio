#!/usr/bin/env python3
"""Parse MIrreM irregular stocks XLSX → stdout JSON rows."""
import json
import sys
from datetime import date, datetime

import openpyxl


def clean(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v


path = sys.argv[1]
wb = openpyxl.load_workbook(path, data_only=True)
ws = wb["Database"]
rows = list(ws.iter_rows(values_only=True))
headers = [str(h) for h in rows[0]]
out = []
for r in rows[1:]:
    d = {headers[i]: clean(r[i]) for i in range(len(headers))}
    if d.get("Country") and d.get("Year"):
        out.append(d)
print(json.dumps(out))
