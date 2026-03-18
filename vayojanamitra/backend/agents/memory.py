from datetime import datetime
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.chat import ChatMessage, ChatSessionInDB, ChatMessageOut

class ConversationMemory:
    def __init__(self, user_id: str, session_id: str, db: AsyncIOMotorDatabase):
        self.user_id = user_id
        self.session_id = session_id
        self.db = db
        self.collection = db.chat_sessions

    async def get_history(self, limit: int = 10) -> List[Dict[str, str]]:
        """Fetch last N messages from MongoDB for this session."""
        try:
            session = await self.collection.find_one({
                "user_id": self.user_id,
                "session_id": self.session_id
            })
            
            if not session or not session.get("messages"):
                return []
            
            # Get last N messages
            messages = session["messages"][-limit:]
            
            # Format for agent use
            formatted_messages = []
            for msg in messages:
                formatted_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
            
            return formatted_messages
            
        except Exception as e:
            print(f"Error getting chat history: {e}")
            return []

    async def add_message(self, role: str, content: str, intent: str = None, scheme_ids: List[str] = None):
        """Append message to MongoDB conversation document."""
        if scheme_ids is None:
            scheme_ids = []
            
        try:
            # Create new message
            new_message = ChatMessage(
                role=role,
                content=content,
                intent=intent,
                scheme_ids=scheme_ids
            )
            
            # Check if session exists
            session = await self.collection.find_one({
                "user_id": self.user_id,
                "session_id": self.session_id
            })
            
            if session:
                # Update existing session
                await self.collection.update_one(
                    {"user_id": self.user_id, "session_id": self.session_id},
                    {
                        "$push": {"messages": new_message.dict()},
                        "$set": {"last_active": datetime.utcnow()}
                    }
                )
            else:
                # Create new session
                new_session = {
                    "user_id": self.user_id,
                    "session_id": self.session_id,
                    "messages": [new_message.dict()],
                    "created_at": datetime.utcnow(),
                    "last_active": datetime.utcnow()
                }
                await self.collection.insert_one(new_session)
                
        except Exception as e:
            print(f"Error adding message to memory: {e}")

    async def get_context_summary(self) -> str:
        """Return last 5 messages as formatted string for prompts."""
        try:
            messages = await self.get_history(limit=5)
            if not messages:
                return "No previous conversation."
            
            context_lines = []
            for msg in messages:
                role_display = "User" if msg["role"] == "user" else "Mitra"
                context_lines.append(f"{role_display}: {msg['content']}")
            
            return "\n".join(context_lines)
            
        except Exception as e:
            print(f"Error getting context summary: {e}")
            return "No previous conversation."

    async def get_session_messages(self) -> List[ChatMessageOut]:
        """Get all messages for a session with full details."""
        try:
            session = await self.collection.find_one({
                "user_id": self.user_id,
                "session_id": self.session_id
            })
            
            if not session or not session.get("messages"):
                return []
            
            # Convert to ChatMessageOut format
            message_outs = []
            for msg in session["messages"]:
                message_out = ChatMessageOut(
                    role=msg["role"],
                    content=msg["content"],
                    intent=msg.get("intent"),
                    timestamp=msg["timestamp"]
                )
                message_outs.append(message_out)
            
            return message_outs
            
        except Exception as e:
            print(f"Error getting session messages: {e}")
            return []
