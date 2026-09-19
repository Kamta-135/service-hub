"""
Public support/emergency contact info — sourced from an env var so it can
be changed without a code deploy. Set SUPPORT_PHONE on Render.
"""
import os

from fastapi import APIRouter

router = APIRouter(tags=["support"])

SUPPORT_PHONE = os.getenv("SUPPORT_PHONE", "")


@router.get("/support-info")
def get_support_info():
    return {"support_phone": SUPPORT_PHONE or None}
