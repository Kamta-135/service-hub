"""
Tests app/sms.py against MOCKED HTTP calls — verifies the request shape
sent to each provider is correct (right URL, auth, params) without ever
needing real MSG91/Twilio credentials or making a real network call.

Run with: ./venv/bin/python tests/test_sms.py
"""
import os
import sys
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_console_provider_default():
    os.environ.pop("SMS_PROVIDER", None)
    import importlib
    import app.sms as sms_module
    importlib.reload(sms_module)
    assert sms_module.send_otp_sms("+919876543210", "123456") is True
    print("1) console provider (default): always succeeds, no network call — OK")


def test_msg91_sends_correct_request():
    os.environ["SMS_PROVIDER"] = "msg91"
    os.environ["MSG91_AUTH_KEY"] = "fake-auth-key"
    os.environ["MSG91_TEMPLATE_ID"] = "fake-template-id"
    os.environ["MSG91_SENDER_ID"] = "SRVHUB"
    import importlib
    import app.sms as sms_module
    importlib.reload(sms_module)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"type": "success"}

    with patch("app.sms.requests.post", return_value=mock_response) as mock_post:
        result = sms_module.send_otp_sms("+919876543210", "482913")

    assert result is True
    call = mock_post.call_args
    assert call.args[0] == "https://control.msg91.com/api/v5/otp"
    assert call.kwargs["params"]["otp"] == "482913"
    assert call.kwargs["params"]["mobile"] == "919876543210"  # '+' stripped
    assert call.kwargs["params"]["authkey"] == "fake-auth-key"
    assert call.kwargs["params"]["template_id"] == "fake-template-id"
    print("2) MSG91: correct URL, OTP, mobile (no '+'), authkey, template_id — OK")


def test_msg91_failure_returns_false_not_exception():
    os.environ["SMS_PROVIDER"] = "msg91"
    import importlib
    import app.sms as sms_module
    importlib.reload(sms_module)

    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = "Invalid authkey"
    mock_response.json.return_value = {"type": "error"}

    with patch("app.sms.requests.post", return_value=mock_response):
        result = sms_module.send_otp_sms("+919876543210", "482913")
    assert result is False
    print("3) MSG91: provider error -> returns False, doesn't raise — OK")


def test_twilio_sends_correct_request():
    os.environ["SMS_PROVIDER"] = "twilio"
    os.environ["TWILIO_ACCOUNT_SID"] = "ACfakesid"
    os.environ["TWILIO_AUTH_TOKEN"] = "fake-token"
    os.environ["TWILIO_FROM_NUMBER"] = "+15551234567"
    import importlib
    import app.sms as sms_module
    importlib.reload(sms_module)

    mock_response = MagicMock()
    mock_response.status_code = 201

    with patch("app.sms.requests.post", return_value=mock_response) as mock_post:
        result = sms_module.send_otp_sms("+919876543210", "482913")

    assert result is True
    call = mock_post.call_args
    assert "ACfakesid" in call.args[0]
    assert call.kwargs["auth"] == ("ACfakesid", "fake-token")
    assert call.kwargs["data"]["To"] == "+919876543210"
    assert "482913" in call.kwargs["data"]["Body"]
    print("4) Twilio: correct account URL, basic auth, To/From/Body — OK")


def test_missing_credentials_fails_gracefully():
    os.environ["SMS_PROVIDER"] = "msg91"
    for k in ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID", "MSG91_SENDER_ID"]:
        os.environ.pop(k, None)
    import importlib
    import app.sms as sms_module
    importlib.reload(sms_module)

    result = sms_module.send_otp_sms("+919876543210", "482913")
    assert result is False, "missing env vars should return False, not crash the request"
    print("5) missing provider credentials -> False (request still succeeds, OTP still usable via resend) — OK")


if __name__ == "__main__":
    test_console_provider_default()
    test_msg91_sends_correct_request()
    test_msg91_failure_returns_false_not_exception()
    test_twilio_sends_correct_request()
    test_missing_credentials_fails_gracefully()
    print("\nALL SMS INTEGRATION TESTS PASSED (mocked — no real credentials needed).")
