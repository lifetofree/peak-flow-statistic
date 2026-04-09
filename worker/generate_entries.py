#!/usr/bin/env python3
import subprocess
import random
from datetime import datetime, timedelta
import json

notes = ["Good day", "Weather change", "Normal day", "Exercise induced symptoms", "Peaceful day", "Cold weather affects reading"]

for i in range(30):
    for day in range(1, 31):
        dt = datetime.utcnow() - timedelta(days=day)
        date_str = dt.strftime("%Y-%m-%d")
        pf = 380 + day * 2 + random.randint(-5, 5)
        spo2 = 93 + random.randint(0, 5)
        note = random.choice(notes)
        
        # Morning Before Med
        cmd = [
            "npx", "wrangler", "d1", "execute", "peakflowstat-db",
            "--local",
            "--command",
            f"INSERT INTO entries (id, user_id, date, peak_flow_readings, spo2, medication_timing, period, note, created_at, updated_at) VALUES (lower(hex(randomblob(16)), (SELECT id FROM users LIMIT 1 OFFSET {i}), '{date_str}T07:00:00Z', '[{pf},{pf+10},{pf+20]', {spo2}, 'before', 'morning', '{note}', datetime('now'), datetime('now')"
        ]
        subprocess.run(cmd, capture_output=True)
        
    if (i+1) % 10 == 0:
        print(f"Progress: {i+1}/30 users done")

print("Done!")
