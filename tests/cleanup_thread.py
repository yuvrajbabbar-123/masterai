"""Cleanup seeded test-caret-* threads."""
import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    res = await db.chat_threads.delete_many({"thread_id": {"$regex": "^test-caret-"}})
    print(f"deleted={res.deleted_count}")

asyncio.run(main())
