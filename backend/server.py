import http.server
import json
import os
import random
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PORT = 3001
DB_FILE = os.path.join(os.path.dirname(__file__), 'database.json')

# Seed initial database if it doesn't exist
DEFAULT_DB = {
    "policies": [
        {"id": "POL-392819", "type": "auto", "coverage": 250000, "deductible": 500, "premium": 65, "year": "2023", "history": "clean", "status": "Active", "date": "2026-04-12"},
        {"id": "POL-829104", "type": "health", "coverage": 500000, "deductible": 1000, "premium": 110, "age": "20", "smoker": "no", "status": "Active", "date": "2026-05-20"}
    ],
    "claims": [
        {"id": "CLM-748291", "policyId": "POL-392819", "type": "auto", "date": "2026-06-15", "loss": 1200, "description": "Minor fender bender during parking maneuver. Rear bumper scuffed.", "status": "Approved"},
        {"id": "CLM-903821", "policyId": "POL-829104", "type": "health", "date": "2026-07-01", "loss": 450, "description": "Routine checkup and physical therapy sessions.", "status": "Pending"}
    ]
}

def load_db():
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, 'w') as f:
            json.dump(DEFAULT_DB, f, indent=2)
        return DEFAULT_DB
    try:
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return DEFAULT_DB

def save_db(data):
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=2)

class InsuranceAPIHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        # CORS Headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        db = load_db()

        if path == '/api/health':
            self.send_json_response(200, {
                "status": "Healthy",
                "service": "DASS Insurance Python API",
                "mode": "Python-Local-JSON",
                "timestamp": datetime.now().isoformat()
            })

        elif path == '/api/policies':
            self.send_json_response(200, db.get("policies", []))

        elif path == '/api/claims':
            self.send_json_response(200, db.get("claims", []))

        elif path == '/api/stats':
            policies = db.get("policies", [])
            claims = db.get("claims", [])
            
            total_premium = sum(p.get("premium", 0) for p in policies)
            approved = len([c for c in claims if c.get("status") == "Approved"])
            closed = len([c for c in claims if c.get("status") != "Pending"])
            ratio = round((approved / closed) * 100) if closed > 0 else 0

            dists = {"auto": 0, "home": 0, "health": 0}
            for p in policies:
                ptype = p.get("type")
                if ptype in dists:
                    dists[ptype] += p.get("premium", 0)

            self.send_json_response(200, {
                "activePoliciesCount": len(policies),
                "claimsCount": len(claims),
                "totalPremiumSum": total_premium,
                "approvedRatio": ratio,
                "distributions": dists
            })
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        db = load_db()

        try:
            body = json.loads(post_data) if post_data else {}
        except Exception:
            self.send_json_response(400, {"error": "Invalid JSON format"})
            return

        if path == '/api/policies':
            ptype = body.get("type")
            coverage = body.get("coverage")
            deductible = body.get("deductible")
            premium = body.get("premium")

            if not ptype or not coverage or not deductible or not premium:
                self.send_json_response(400, {"error": "Missing attributes: type, coverage, deductible, premium"})
                return

            new_policy = {
                "id": f"POL-{random.randint(100000, 999999)}",
                "type": ptype,
                "coverage": int(coverage),
                "deductible": int(deductible),
                "premium": int(premium),
                "status": "Active",
                "date": datetime.now().strftime("%Y-%m-%d")
            }
            # Copy extra metadata if present
            for k, v in body.items():
                if k not in new_policy:
                    new_policy[k] = v

            db["policies"].append(new_policy)
            save_db(db)
            self.send_json_response(201, new_policy)

        elif path == '/api/claims':
            policy_id = body.get("policyId")
            loss = body.get("loss")
            description = body.get("description")

            if not policy_id or not loss or not description:
                self.send_json_response(400, {"error": "Missing attributes: policyId, loss, description"})
                return

            # Lookup type
            policy_type = "general"
            for p in db.get("policies", []):
                if p.get("id") == policy_id:
                    policy_type = p.get("type")
                    break

            new_claim = {
                "id": f"CLM-{random.randint(100000, 999999)}",
                "policyId": policy_id,
                "type": policy_type,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "loss": int(loss),
                "description": description,
                "status": "Pending"
            }

            db["claims"].append(new_claim)
            save_db(db)
            self.send_json_response(201, new_claim)
        else:
            self.send_response(404)
            self.end_headers()

    def do_PUT(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        db = load_db()

        # Check if path fits status update format: /api/claims/<id>/status
        parts = path.split('/')
        if len(parts) == 5 and parts[1] == 'api' and parts[2] == 'claims' and parts[4] == 'status':
            claim_id = parts[3]
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            
            try:
                body = json.loads(post_data) if post_data else {}
            except Exception:
                self.send_json_response(400, {"error": "Invalid JSON format"})
                return

            new_status = body.get("status")
            if not new_status:
                self.send_json_response(400, {"error": "Missing status"})
                return

            claims = db.get("claims", [])
            found = False
            updated_claim = None
            for c in claims:
                if c.get("id") == claim_id:
                    c["status"] = new_status
                    updated_claim = c
                    found = True
                    break

            if found:
                save_db(db)
                self.send_json_response(200, updated_claim)
            else:
                self.send_json_response(404, {"error": f"Claim ID {claim_id} not found"})
        else:
            self.send_response(404)
            self.end_headers()

    def send_json_response(self, status, payload):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode('utf-8'))

    def log_message(self, format, *args):
        # Override to suppress standard HTTP logging to keep console neat
        print(f"[API Server] {self.address_string()} - - [{self.log_date_time_string()}] {format%args}")

if __name__ == '__main__':
    load_db()
    server = http.server.HTTPServer(('0.0.0.0', PORT), InsuranceAPIHandler)
    print(f"==================================================")
    print(f"  DASS Insurance Local API Server active   ")
    print(f"  Listening on: http://localhost:{PORT}            ")
    print(f"  Endpoint Health check: http://localhost:{PORT}/api/health")
    print(f"  Database storage file: {DB_FILE}                ")
    print(f"==================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down backend server.")
        server.server_close()
