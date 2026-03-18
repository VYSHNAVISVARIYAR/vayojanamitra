#!/usr/bin/env python3
"""Check for schemes from newly added URLs"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def check_new_schemes():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DATABASE_NAME]
    
    # Check for schemes from the new URLs
    new_urls = [
        'https://scw.dosje.gov.in/',
        'https://nsap.dord.gov.in/',
        'https://scw.dosje.gov.in/seniorcare-ageing-growth-',
        'https://www.myscheme.gov.in/schemes/psoapengine'
    ]
    
    print('🔍 Checking for schemes from newly added URLs...')
    
    total_new_schemes = 0
    for url in new_urls:
        schemes = await db.schemes.find({'source_url': url}).to_list(None)
        print(f'  {url}: {len(schemes)} schemes')
        if schemes:
            total_new_schemes += len(schemes)
            for scheme in schemes[:2]:  # Show first 2
                print(f'    - {scheme.get("title", "No title")}')
    
    print(f'\n📊 Total new schemes found: {total_new_schemes}')
    
    # Also check overall scheme count
    total_schemes = await db.schemes.count_documents({})
    print(f'📈 Total schemes in database: {total_schemes}')
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_new_schemes())
