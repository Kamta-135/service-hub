"""
SMS sending — pluggable so you can switch providers with one env var,
no code changes.

Set SMS_PROVIDER to one of:
  - "console" (default) — just logs the OTP server-side. Safe no-op for
    local dev; nothing is sent anywhere.
  - "msg91" — needs MSG91_AUTH_KEY, MSG91_TEMPLATE_ID (a DLT-approved
    transactional template — mandatory for Indian numbers, see below),
    MSG91_SENDER_ID (6-char DLT-approved sender ID, e.g. "SRVHUB").
  - "twilio" — needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER.

--- India-specific note (MSG91) ---
TRAI/DLT regulations require every transactional SMS template sent to
Indian numbers to be pre-registered and approved on the DLT platform
(via your telecom operator or MSG91's DLT registration flow) before
MSG91 will send it — this is a compliance step outside this codebase,
budget 1-3 business days for template approval. Your approved template
must contain a placeholder for the OTP, e.g.:
    "Your Service.Hub OTP is {{otp}}. Valid for 5 minutes. Do not share this code."
Use that template's ID as MSG91_TEMPLATE_ID.

Twilio has no equivalent registration requirement for India in the same
way, but delivery to Indian numbers via Twilio can be less reliable /
more expensive than a local provider like MSG91 — most India-focused
products end up on MSG91, Twilio is included here mainly for anyone
expanding outside India later.
"""
import logging
import os

import requests

logger = logging.getLogger("service_hub.sms")

SMS_PROVIDER = os.getenv("SMS_PROVIDER", "console")


def send_otp_sms(phone: str, code: str) -> bool:
    """
    Returns True if the provider accepted the message (doesn't guarantee
    delivery — that's what provider webhooks/delivery reports are for,
    out of scope here). Never raises: a down SMS provider should not be
    the reason OTP requests start 500ing.
    """
    try:
        if SMS_PROVIDER == "msg91":
            return _send_msg91(phone, code)
        elif SMS_PROVIDER == "twilio":
            return _send_twilio(phone, code)
        else:
            logger.info(f"[console SMS provider] OTP for {phone}: {code}")
            return True
    except Exception:
        logger.exception(f"SMS send failed for {phone} via {SMS_PROVIDER}")
        return False


def _send_msg91(phone: str, code: str) -> bool:
    auth_key = os.environ["MSG91_AUTH_KEY"]
    template_id = os.environ["MSG91_TEMPLATE_ID"]
    sender_id = os.environ["MSG91_SENDER_ID"]

    mobile = phone.lstrip("+")  # MSG91 expects country code without '+', e.g. 919876543210

    resp = requests.post(
        "https://control.msg91.com/api/v5/otp",
        params={
            "otp": code,
            "mobile": mobile,
            "authkey": auth_key,
            "template_id": template_id,
            "sender": sender_id,
        },
        timeout=10,
    )
    ok = resp.status_code == 200 and resp.json().get("type") == "success"
    if not ok:
        logger.error(f"MSG91 send failed: {resp.status_code} {resp.text}")
    return ok


def _send_twilio(phone: str, code: str) -> bool:
    account_sid = os.environ["TWILIO_ACCOUNT_SID"]
    auth_token = os.environ["TWILIO_AUTH_TOKEN"]
    from_number = os.environ["TWILIO_FROM_NUMBER"]

    resp = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
        auth=(account_sid, auth_token),
        data={
            "To": phone,
            "From": from_number,
            "Body": f"Your Service.Hub OTP is {code}. Valid for 5 minutes. Do not share this code.",
        },
        timeout=10,
    )
    ok = resp.status_code in (200, 201)
    if not ok:
        logger.error(f"Twilio send failed: {resp.status_code} {resp.text}")
    return ok
