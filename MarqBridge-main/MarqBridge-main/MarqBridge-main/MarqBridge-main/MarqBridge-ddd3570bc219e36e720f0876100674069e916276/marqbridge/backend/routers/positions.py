from fastapi import APIRouter
from typing import List
from models.schemas import Position
from services.broker_connector import broker

router = APIRouter()

@router.get("/", response_model=List[Position])
async def get_positions():
    return await broker.get_positions()
