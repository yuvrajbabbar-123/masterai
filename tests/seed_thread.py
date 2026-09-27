"""Seed a long assistant chat_threads doc for the demo user, print thread_id."""
import asyncio, os, sys, uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

LONG = (
    "The water cycle, also known as the hydrologic cycle, describes the continuous movement of water on, above, and below the surface of the Earth. "
    "Water can change states among liquid, vapor, and ice at various places in the water cycle. Although the balance of water on Earth remains fairly constant over time, "
    "individual water molecules can come and go in a hurry. The sun, which drives the water cycle, heats water in oceans and seas. Water evaporates as water vapor into the air. "
    "Some ice and snow sublimates directly into water vapor. Rising air currents take the vapor up into the atmosphere where cooler temperatures cause it to condense into clouds. "
    "Air currents move water vapor around the globe, cloud particles collide, grow, and fall out of the sky as precipitation. Some precipitation falls as snow or hail, sleet, and can accumulate as ice caps and glaciers, "
    "which can store frozen water for thousands of years. Snowpacks in warmer climates often thaw and melt when spring arrives, and the melted water flows overland as snowmelt. Most precipitation falls back into the oceans or onto land, "
    "where the precipitation flows over the ground as surface runoff. A portion of runoff enters rivers in valleys in the landscape, with streamflow moving water towards the oceans. "
    "Runoff and groundwater are stored as freshwater in lakes. Not all runoff flows into rivers, though. Much of it soaks into the ground as infiltration. Some water infiltrates deep into the ground and replenishes aquifers, "
    "which store huge amounts of freshwater for long periods of time. Some infiltration stays close to the land surface and can seep back into surface-water bodies as groundwater discharge. "
    "Over time, though, all of this water keeps moving, and much of it reenters the ocean, where the water cycle renews itself again and again."
)

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    user = await db.users.find_one({"email": "demo@masterai.com"}, {"_id": 0, "user_id": 1})
    if not user:
        print("NO_DEMO_USER"); sys.exit(1)
    uid = user["user_id"]
    tid = f"test-caret-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "thread_id": tid, "user_id": uid,
        "title": "Caret test — water cycle long",
        "messages": [
            {"role": "user", "content": "Explain the water cycle in detail.", "at": now},
            {"role": "assistant", "content": LONG, "at": now},
        ],
        "created_at": now, "updated_at": now,
    }
    await db.chat_threads.insert_one(doc)
    print(f"SEEDED {tid} len={len(LONG)}")

if __name__ == "__main__":
    asyncio.run(main())
