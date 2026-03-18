from pydantic import BaseModel, Field, ConfigDict, field_serializer
from typing import List, Optional
from datetime import datetime, timezone

class SchemeBase(BaseModel):
    title: str
    description: str
    benefits: str
    eligibility: str
    documents_required: List[str]
    application_process: str
    category: str           # pension / healthcare / housing / disability
    state: str = "Kerala"
    source_url: str
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

    @field_serializer('last_updated')
    def serialize_datetime(self, dt: datetime, _info):
        return dt.isoformat()

class SchemeCreate(SchemeBase):
    pass

class SchemeInDB(SchemeBase):
    id: Optional[str] = Field(alias="_id", default=None)

    model_config = ConfigDict(
        populate_by_name=True
    )
