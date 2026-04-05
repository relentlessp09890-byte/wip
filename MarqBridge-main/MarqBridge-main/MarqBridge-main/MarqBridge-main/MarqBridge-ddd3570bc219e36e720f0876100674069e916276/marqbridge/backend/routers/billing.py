from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from core.config import settings
import stripe

router = APIRouter()
stripe.api_key = settings.stripe_secret_key

PRICES = {
    "pro":  settings.stripe_price_pro,
    "prop": settings.stripe_price_prop,
}

class CheckoutRequest(BaseModel):
    tier:        str
    success_url: str
    cancel_url:  str

@router.post("/checkout")
async def create_checkout(req: CheckoutRequest):
    if req.tier not in PRICES:
        raise HTTPException(status_code=400, detail="Invalid tier")
    if not settings.stripe_secret_key:
        return {"url": f"{req.success_url}?tier={req.tier}&simulated=true"}
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": PRICES[req.tier], "quantity": 1}],
            mode="subscription",
            success_url=req.success_url + "?tier=" + req.tier,
            cancel_url=req.cancel_url,
            metadata={"tier": req.tier},
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session  = event["data"]["object"]
        tier     = session.get("metadata", {}).get("tier", "pro")
        customer = session.get("customer_email", "")
        print(f"[Billing] New {tier} subscription: {customer}")

    return {"received": True}

@router.get("/status")
async def billing_status():
    return {"tier": "free", "stripe_enabled": bool(settings.stripe_secret_key)}
