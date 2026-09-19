"""
End-to-end test: OTP auth -> service-request lifecycle, driven over real HTTP
against a live uvicorn instance (see test_request_flow.py history for why:
in-process ASGI transports hit sqlite/thread edge cases in some sandboxes).

Run with:  ./venv/bin/python tests/test_request_flow.py
"""
import os
import sys
import time
import threading

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DB_FILE = "./test_service_hub.db"
if os.path.exists(DB_FILE):
    os.remove(DB_FILE)
os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE}"
os.environ["ENV"] = "development"  # so OTP requests include dev_otp in the response
os.environ["SECRET_KEY"] = "test-secret-key-at-least-32-bytes-long-for-hs256"

import httpx
import uvicorn
from app.main import app

PORT = 8766
BASE_URL = f"http://127.0.0.1:{PORT}"


def run_server():
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")


def wait_for_server(timeout=10):
    start = time.time()
    while time.time() - start < timeout:
        try:
            httpx.get(f"{BASE_URL}/health", timeout=1)
            return True
        except httpx.TransportError:
            time.sleep(0.2)
    return False


def signup_or_login(client: httpx.Client, phone: str, role: str, name: str) -> dict:
    """OTP request -> verify -> returns the TokenOut dict (access/refresh/user)."""
    r = client.post("/auth/otp/request", json={"phone": phone})
    assert r.status_code == 200, r.text
    otp = r.json()["dev_otp"]

    r = client.post("/auth/otp/verify", json={"phone": phone, "code": otp, "role": role, "name": name})
    assert r.status_code == 200, r.text
    return r.json()


def auth_headers(token_data: dict) -> dict:
    return {"Authorization": f"Bearer {token_data['access_token']}"}


def run():
    with httpx.Client(base_url=BASE_URL, timeout=10) as client:

        # ---------- Auth ----------
        print("== auth: otp request + verify (customer) ==")
        customer = signup_or_login(client, "+919876500001", "customer", "Kamta")
        assert customer["user"]["role"] == "customer"
        cust_headers = auth_headers(customer)

        print("== auth: wrong OTP is rejected ==")
        client.post("/auth/otp/request", json={"phone": "+919876500002"})
        r = client.post("/auth/otp/verify", json={"phone": "+919876500002", "code": "000000", "role": "provider", "name": "Ramesh"})
        assert r.status_code == 400, r.text

        print("== auth: otp request + verify (provider) ==")
        provider = signup_or_login(client, "+919876500002", "provider", "Ramesh")
        assert provider["user"]["role"] == "provider"
        prov_headers = auth_headers(provider)

        print("== auth: /auth/me ==")
        r = client.get("/auth/me", headers=cust_headers)
        assert r.status_code == 200 and r.json()["phone"] == "+919876500001"

        print("== auth: no token -> 401 ==")
        r = client.post("/requests", json={"service_type": "electrician", "description": "x", "location_text": "y"})
        assert r.status_code == 401

        print("ALL AUTH CHECKS PASSED.")

        # ---------- Request lifecycle (now identity comes from the token) ----------
        print("== provider cannot create a request (role-gated) ==")
        r = client.post("/requests", headers=prov_headers, json={
            "service_type": "electrician", "description": "x", "location_text": "y",
        })
        assert r.status_code == 403, r.text

        print("== customer creates request ==")
        r = client.post("/requests", headers=cust_headers, json={
            "service_type": "electrician",
            "description": "Fan not working",
            "location_text": "Bhelma, Madhya Pradesh",
            "priority": "urgent",
        })
        assert r.status_code == 201, r.text
        req = r.json()
        assert req["status"] == "request_sent"
        assert req["customer_id"] == customer["user"]["id"]
        req_id = req["id"]

        print("== customer cannot jump straight to completed ==")
        r = client.patch(f"/requests/{req_id}/status", headers=cust_headers, json={"status": "completed"})
        assert r.status_code in (403, 409), r.text

        print("== provider accepts ==")
        r = client.post(f"/requests/{req_id}/accept", headers=prov_headers)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "accepted"
        assert r.json()["provider_id"] == provider["user"]["id"]

        print("== customer (not the provider) cannot advance to on_the_way ==")
        r = client.patch(f"/requests/{req_id}/status", headers=cust_headers, json={"status": "on_the_way"})
        assert r.status_code == 403, r.text

        print("== assigned provider advances through statuses ==")
        for next_status in ["on_the_way", "service_started", "completed"]:
            r = client.patch(f"/requests/{req_id}/status", headers=prov_headers, json={"status": next_status})
            assert r.status_code == 200, r.text
            assert r.json()["status"] == next_status

        print("== full detail / timeline ==")
        r = client.get(f"/requests/{req_id}", headers=cust_headers)
        assert r.status_code == 200
        statuses = [e["status"] for e in r.json()["status_events"]]
        assert statuses == ["request_sent", "accepted", "on_the_way", "service_started", "completed"]

        print("\nALL TESTS PASSED.")


if __name__ == "__main__":
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    if not wait_for_server():
        print("Server did not start in time.")
        sys.exit(1)

    try:
        run()
    finally:
        if os.path.exists(DB_FILE):
            os.remove(DB_FILE)
