async def run(self, message: str) -> dict:
    try:
        # Fetch user profile
        try:
            user = await self.db.users.find_one(
                {"_id": ObjectId(self.user_id)}
            )
        except Exception:
            user = await self.db.users.find_one(
                {"_id": self.user_id}
            )

        if not user:
            user = {
                "age": "Not specified",
                "gender": "Not specified",
                "income_annual": "Not specified",
                "location": "Kerala",
                "occupation": "Not specified",
                "health_conditions": []
            }

        health = user.get('health_conditions', [])
        health_str = ', '.join([str(h) for h in health]) \
                     if health else 'None'

        user_profile_summary = (
            f"Age: {user.get('age', 'N/A')}, "
            f"Location: {user.get('location', 'Kerala')}, "
            f"Income: Rs {user.get('income_annual', 'N/A')}/year, "
            f"Occupation: {user.get('occupation', 'N/A')}, "
            f"Health: {health_str}"
        )

        msg_lower = message.strip().lower()

        # ── 1. GREETING ──────────────────────────────
        greetings = [
            "hi", "hello", "hey", "good morning",
            "good evening", "good afternoon",
            "namaste", "hai", "helo", "vanakkam"
        ]
        if msg_lower in greetings:
            return {
                "response": (
                    f"Hello! Welcome to Vayojanamitra 🌿\n\n"
                    f"• I can help you find pension, healthcare, "
                    f"housing, disability and other schemes\n"
                    f"• Your profile: Age {user.get('age','N/A')}, "
                    f"{user.get('location','Kerala')}\n"
                    f"• Just ask me anything!"
                ),
                "steps_taken": 0,
                "scheme_cards": [],
                "eligibility_result": None,
                "agent_thoughts": ["Greeting detected"]
            }

        # ── 2. USE GROQ TO UNDERSTAND INTENT ────────
        # Let Groq decide what the user is really asking
        intent_prompt = f"""
Analyze this user message and extract key information.
User message: "{message}"

Return ONLY this JSON, no markdown:
{{
  "intent": "search|compare|explain|howto|eligibility|guidance|offtopic",
  "main_topic": "exact scheme or topic user is asking about",
  "keywords": ["keyword1", "keyword2"],
  "is_welfare_related": true or false
}}

Intent definitions:
- search: looking for schemes
- compare: comparing two schemes
- explain: asking what a scheme is
- howto: asking how to apply
- eligibility: asking if they qualify
- guidance: asking for general help
- offtopic: not related to welfare/schemes
"""
        intent_raw = await self._call_groq(intent_prompt)

        # Parse intent
        try:
            clean = intent_raw.strip()
            if "```" in clean:
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            intent_data = json.loads(clean.strip())
        except Exception:
            intent_data = {
                "intent": "search",
                "main_topic": message,
                "keywords": [message],
                "is_welfare_related": True
            }

        main_topic = intent_data.get("main_topic", message)
        intent = intent_data.get("intent", "search")
        is_welfare = intent_data.get("is_welfare_related", True)
        keywords = intent_data.get("keywords", [message])

        print(f"Intent: {intent}, Topic: {main_topic}, "
              f"Welfare: {is_welfare}")

        # ── 3. OFF-TOPIC HANDLER ─────────────────────
        if not is_welfare:
            return {
                "response": (
                    "I can only help with Kerala government "
                    "welfare schemes and benefits.\n\n"
                    "• Try asking about pension schemes\n"
                    "• Healthcare benefits\n"
                    "• Housing assistance\n"
                    "• Disability support\n\n"
                    "What welfare scheme would you like to know about?"
                ),
                "steps_taken": 0,
                "scheme_cards": [],
                "eligibility_result": None,
                "agent_thoughts": ["Off-topic question detected"]
            }

        # ── 4. GUIDANCE HANDLER ──────────────────────
        if intent == "guidance":
            guidance_prompt = f"""
You are Mitra, helping an elderly Kerala citizen.
User said: "{message}"
User Profile: {user_profile_summary}

Give PROACTIVE personalized guidance based on their profile.

FORMAT:
Based on your profile, here is what I recommend:
- [Scheme]: [why it suits them]
- [Scheme]: [why it suits them]
- [Scheme]: [why it suits them]

To get started:
1. [First action]
2. [Second action]

Would you like me to explain any of these schemes?

Use • for bullets. Plain text only.
"""
            response = await self._call_groq(guidance_prompt)
            await self._save_log(message, response)
            return {
                "response": response,
                "steps_taken": 1,
                "scheme_cards": [],
                "eligibility_result": None,
                "agent_thoughts": [
                    "Guidance provided based on profile"
                ]
            }

        # ── 5. COMPARISON HANDLER ────────────────────
        if intent == "compare":
            comparison_prompt = f"""
You are Mitra, helping elderly Kerala citizens.
User asked: "{message}"

Give a CLEAR comparison. Use this format:

[Scheme 1 Name]:
- What it is: [explanation]
- Benefit: [key benefit]
- Who can apply: [eligibility]

[Scheme 2 Name]:
- What it is: [explanation]
- Benefit: [key benefit]
- Who can apply: [eligibility]

Key Difference: [one sentence]

STRICT RULE: Only answer about the schemes 
the user specifically asked about.
If you don't know a scheme → say 
"I don't have information about [scheme name]"
Plain text only. Use • for bullets.
"""
            response = await self._call_groq(comparison_prompt)
            await self._save_log(message, response)
            return {
                "response": response,
                "steps_taken": 1,
                "scheme_cards": [],
                "eligibility_result": None,
                "agent_thoughts": ["Comparison answered"]
            }

        # ── 6. HOW-TO HANDLER ───────────────────────
        if intent == "howto":
            howto_prompt = f"""
You are Mitra, helping elderly Kerala citizens.
User asked: "{message}"
User profile: {user_profile_summary}

Give step-by-step instructions ONLY for what user asked.

Steps to Apply for {main_topic}:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Documents needed:
- [Document 1]
- [Document 2]

Office: [specific office]
Timing: Mon-Fri, 10am to 5pm

STRICT RULE: Only give steps for {main_topic}.
If you don't know → say 
"I don't have application details for {main_topic}"
Plain text only.
"""
            response = await self._call_groq(howto_prompt)
            await self._save_log(message, response)
            return {
                "response": response,
                "steps_taken": 1,
                "scheme_cards": [],
                "eligibility_result": None,
                "agent_thoughts": ["How-to answered"]
            }

        # ── 7. EXPLAIN HANDLER ───────────────────────
        if intent == "explain":
            # First check if scheme exists in MongoDB
            scheme_in_db = await self.db.schemes.find_one({
                "title": {
                    "$regex": main_topic,
                    "$options": "i"
                }
            })

            if scheme_in_db:
                # Use real database data
                explain_prompt = f"""
You are Mitra, helping elderly Kerala citizens.
User asked: "{message}"

Here is the real scheme data from our database:
Title: {scheme_in_db.get('title')}
Description: {scheme_in_db.get('description')}
Benefits: {scheme_in_db.get('benefits')}
Eligibility: {scheme_in_db.get('eligibility')}
Documents: {scheme_in_db.get('documents_required')}
How to apply: {scheme_in_db.get('application_process')}

Explain this scheme in simple language:
- What it is: [simple explanation]
- Benefit: [key benefit]
- Who can apply: [eligibility simple]
- Documents needed: [list]
- How to apply: [simple steps]
Next Step: [one action]

Plain text. Use •. Simple language for elderly.
"""
            else:
                # Not in database — use Groq knowledge
                # but be honest about source
                explain_prompt = f"""
You are Mitra, helping elderly Kerala citizens.
User asked about: "{main_topic}"

This scheme is not in our database.
Use your knowledge about Kerala/India welfare schemes.

If you know about {main_topic}, explain it:
- What it is: [explanation]
- Benefit: [key benefit]
- Who can apply: [eligibility]
- How to apply: [steps]
Next Step: [action]

If you DON'T know about {main_topic}, respond EXACTLY:
"I don't have information about {main_topic} in my database. 
Please visit your nearest Akshaya Centre or 
call Elderline: 14567 for accurate details."

NEVER make up information.
Plain text only. Use •.
"""

            response = await self._call_groq(explain_prompt)

            # Clean unwanted phrases
            response = response.replace(
                "I found limited info in my database, but", ""
            ).replace(
                "I found limited info in my database,", ""
            ).strip()

            await self._save_log(message, response)
            return {
                "response": response,
                "steps_taken": 1,
                "scheme_cards": (
                    [{
                        **scheme_in_db,
                        "_id": str(scheme_in_db["_id"])
                    }] if scheme_in_db else []
                ),
                "eligibility_result": None,
                "agent_thoughts": [
                    f"Explained {main_topic}",
                    "From DB" if scheme_in_db else "From Groq knowledge"
                ]
            }

        # ── 8. ELIGIBILITY HANDLER ───────────────────
        if intent == "eligibility":
            # Find the specific scheme user asked about
            scheme = await self.db.schemes.find_one({
                "title": {
                    "$regex": main_topic,
                    "$options": "i"
                }
            })

            if not scheme:
                # Try keyword search
                tools = AgentTools(self.db)
                results = await tools.search_schemes(main_topic)
                if results:
                    scheme = results[0]

            if scheme:
                tools = AgentTools(self.db)
                eligibility = await tools.check_eligibility(
                    str(scheme["_id"]),
                    self.user_id
                )
                response = (
                    f"Eligibility check for "
                    f"**{scheme.get('title')}**:\n\n"
                    f"• Result: {eligibility.get('result','Unknown')}\n"
                    f"• Reason: {eligibility.get('reason','')}\n"
                    f"• Next Step: "
                    f"{eligibility.get('next_steps','Visit office')}"
                )
                await self._save_log(message, response)
                return {
                    "response": response,
                    "steps_taken": 2,
                    "scheme_cards": [{
                        **scheme,
                        "_id": str(scheme["_id"])
                    }],
                    "eligibility_result": eligibility,
                    "agent_thoughts": [
                        "Found scheme",
                        "Checked eligibility"
                    ]
                }
            else:
                return {
                    "response": (
                        f"I don't have information about "
                        f"**{main_topic}** in my database.\n\n"
                        f"Please visit your nearest Akshaya Centre "
                        f"or call Elderline: 14567 for eligibility details."
                    ),
                    "steps_taken": 1,
                    "scheme_cards": [],
                    "eligibility_result": None,
                    "agent_thoughts": ["Scheme not found in database"]
                }

        # ── 9. SEARCH HANDLER ────────────────────────
        # Only runs for intent == "search"
        tools = AgentTools(self.db)
        schemes = []

        # Search MongoDB by category first
        category_map = {
            "pension":     ["pension", "monthly payment",
                            "old age", "retirement"],
            "healthcare":  ["health", "medical", "hospital",
                            "treatment", "medicine", "healthcare"],
            "housing":     ["house", "housing", "home",
                            "construction", "shelter"],
            "disability":  ["disability", "disabled",
                            "handicap", "differently abled"],
            "agriculture": ["farmer", "farm", "agriculture",
                            "crop", "kisan", "karshaka"],
            "education":   ["education", "scholarship",
                            "student", "school"],
            "women":       ["widow", "women", "mahila",
                            "maternity"],
        }

        detected_category = None
        for category, kws in category_map.items():
            if any(kw in msg_lower for kw in kws):
                detected_category = category
                break

        # Priority 1: MongoDB category filter
        if detected_category:
            mongo_schemes = await self.db.schemes.find(
                {
                    "category": detected_category,
                    "is_active": True
                }
            ).limit(5).to_list(5)

            if mongo_schemes:
                for s in mongo_schemes:
                    s["_id"] = str(s["_id"])
                schemes = mongo_schemes

        # Priority 2: MongoDB text search
        if not schemes:
            try:
                text_results = await self.db.schemes.find(
                    {"$text": {"$search": main_topic}}
                ).limit(5).to_list(5)
                if text_results:
                    for s in text_results:
                        s["_id"] = str(s["_id"])
                    schemes = text_results
            except Exception as e:
                print(f"Text search error: {e}")

        # Priority 3: ChromaDB
        if not schemes:
            chroma = await tools.search_schemes(main_topic)
            if chroma:
                # Only keep results that match the topic
                relevant = [
                    s for s in chroma
                    if any(
                        kw.lower() in str(s.get('title','')).lower()
                        or kw.lower() in str(
                            s.get('description','')).lower()
                        for kw in keywords
                    )
                ]
                schemes = relevant if relevant else []

        # Filter out Malayalam schemes
        schemes = [
            s for s in schemes
            if not self._is_mostly_malayalam(
                s.get('title', '')
            )
        ]

        # ── STRICT: Only show if actually relevant ──
        if schemes:
            # Verify schemes match what user asked
            verify_prompt = f"""
User asked: "{message}"
Main topic: "{main_topic}"

These schemes were found in database:
{json.dumps([{'title': s.get('title',''), 
              'category': s.get('category','')} 
             for s in schemes], indent=2)}

Are these schemes ACTUALLY relevant to what user asked?
Return ONLY JSON:
{{"relevant": true or false, 
  "relevant_titles": ["title1", "title2"]}}

Be STRICT. If scheme is about savings/investment 
but user asked about food/health → mark as not relevant.
"""
            verify_raw = await self._call_groq(verify_prompt)

            try:
                clean = verify_raw.strip()
                if "```" in clean:
                    parts = clean.split("```")
                    clean = parts[1] if len(parts) > 1 else parts[0]
                    if clean.startswith("json"):
                        clean = clean[4:]
                verify_data = json.loads(clean.strip())
                
                if not verify_data.get("relevant", True):
                    schemes = []
                else:
                    relevant_titles = verify_data.get(
                        "relevant_titles", []
                    )
                    if relevant_titles:
                        schemes = [
                            s for s in schemes
                            if s.get("title") in relevant_titles
                        ]
            except Exception:
                pass

        if schemes:
            response_prompt = f"""
You are Mitra, helping elderly Kerala citizens.
User asked: "{message}"
User profile: {user_profile_summary}

ONLY answer about these specific schemes from database:
{json.dumps([{{
    'title': s.get('title',''),
    'benefits': s.get('benefits',''),
    'eligibility': s.get('eligibility','')
}} for s in schemes], indent=2)}

FORMAT:
Here are schemes for [topic]:
- [Title]: [benefit in one line]
- [Title]: [benefit in one line]
Next Step: [one specific action]

STRICT RULES:
- Only mention schemes from the list above
- Do not add schemes not in the list
- Do not say "I found limited info"
- Use • for bullets
- Plain text only
"""
            response = await self._call_groq(response_prompt)

            response = response.replace(
                "I found limited info in my database, but", ""
            ).replace(
                "I found limited info in my database,", ""
            ).strip()

            if not response or response.startswith("{"):
                response = self._build_fallback(
                    schemes,
                    detected_category or "welfare",
                    user
                )

        else:
            # Truly not found — be honest
            response = (
                f"I don't have information about "
                f"**{main_topic}** in my database.\n\n"
                f"• Please visit your nearest Akshaya Centre\n"
                f"• Or call Elderline: 14567\n"
                f"• Or visit: socialjustice.gov.in\n\n"
                f"Would you like me to help you find "
                f"a similar scheme?"
            )

        await self._save_log(message, response)
        return {
            "response": response,
            "steps_taken": 1,
            "scheme_cards": schemes[:3] if schemes else [],
            "eligibility_result": None,
            "agent_thoughts": [
                f"Intent: {intent}",
                f"Topic: {main_topic}",
                f"Found: {len(schemes)} relevant schemes"
            ]
        }

    except Exception as e:
        import traceback
        print(f"❌ Error: {traceback.format_exc()}")
        return {
            "response": (
                "I'm sorry, I encountered an error.\n"
                "Please try again or call Elderline: 14567"
            ),
            "steps_taken": 0,
            "scheme_cards": [],
            "eligibility_result": None,
            "agent_thoughts": ["Error occurred"]
        }

def _is_mostly_malayalam(self, text: str) -> bool:
    """Returns True if text is mostly Malayalam"""
    if not text:
        return False
    malayalam = sum(
        1 for c in text
        if '\u0D00' <= c <= '\u0D7F'
    )
    return len(text) > 0 and malayalam / len(text) > 0.3

def _build_fallback(
    self, schemes, category, user
) -> str:
    response = f"Here are {category} schemes for you:\n"
    for s in schemes[:4]:
        title = s.get('title', '')
        benefit = s.get('benefits', '')[:80]
        response += f"• {title}: {benefit}\n"
    response += (
        f"\nNext Step: Visit nearest Akshaya Centre "
        f"in {user.get('location', 'Kerala')} to apply."
    )
    return response
