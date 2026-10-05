import os
import google.genai as genai
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

# Gemini Configuration (New google-genai library)
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
client = None

if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    print("WARNING: Missing GOOGLE_API_KEY in environment. AI features will not function.")

MODEL_ID = "gemini-3.5-flah-lite"

def generate_diet_plan(pantry_items: List[dict], activities: Optional[List[dict]] = None, profile_context: str = "") -> str:
    """Generates a nutrition plan based on available products."""
    if not client:
        return "Error: Missing Gemini API Key."

    items_str = ", ".join([f"{item['name']} ({item['quantity']}{item['unit']})" for item in pantry_items])
    
    activity_context = ""
    if activities:
        activities_str = ", ".join([f"{a['type']} ({a['duration']} min, burned: {a['calories']} kcal)" for a in activities])
        activity_context += f"\nConsider the following recent physical activities to adjust carb/protein volume: {activities_str}."
        
    if profile_context:
        activity_context += f"\nBiometric data and starting goals: {profile_context}."
    
    prompt = f"""
    You are a professional sports nutritionist. Based on the following list of items from my inventory, 
    propose 3 healthy and quick meals. Include weights or pieces depending on the product unit.
    
    Inventory: {items_str}
    {activity_context}
    
    The response MUST include:
    1. A Markdown section with meal descriptions and recipes.
    2. At the very end, a section titled "CONSUMPTION_STRUCTURE" containing a JSON code block with a list of all ingredients used in the plan and their total quantity to subtract.
    
    JSON Format:
    [
        {{"name": "product_name", "quantity_used": 100}},
        ...
    ]
    
    Format the response clearly using Markdown. RESPOND ONLY IN ENGLISH.
    """
    
    try:
        response = client.models.generate_content(model=MODEL_ID, contents=prompt)
        return response.text or "Error: Empty response from Gemini"
    except Exception as e:
        return f"Error during nutrition plan generation: {str(e)}"

def generate_workout_plan(user_data: dict) -> str:
    """Generates a training plan based on user data."""
    if not client:
        return "Error: Missing Gemini API Key."

    injuries = f"- Past injuries (AVOID): {user_data.get('injuries')}" if user_data.get('injuries') else ""
    discipline = f"- Primary discipline: {user_data.get('discipline')}" if user_data.get('discipline') else ""
    equipment = f"- Available equipment: {user_data.get('equipment', 'Not provided')}"
    focus = f"- Priority areas: {user_data.get('focus_areas')}" if user_data.get('focus_areas') else ""

    prompt = f"""
    You are an elite personal trainer and physiotherapist. 
    Your task is to design a personalized Workout Program perfectly matched to the user's biological parameters and goals.

    BIOMETRIC PARAMETERS AND GOALS:
    - Primary goal: {user_data.get('goal', 'General fitness')}
    - Age: {user_data.get('age', 'unknown')}
    - Weight: {user_data.get('weight', 'unknown')} kg
    - Height: {user_data.get('height', 'unknown')} cm
    - Gender: {user_data.get('gender', 'unknown')}
    - Activity level: {user_data.get('activityLevel', 'moderate')}
    {injuries}
    {discipline}
    {equipment}
    {focus}
    
    PROGRAM REQUIREMENTS:
    1. Propose a full weekly routine (detail training days and recovery).
    2. STRICTLY avoid exercises that might aggravate mentioned injuries.
    3. Match exercise selection to the available equipment.
    4. If a primary discipline is provided, the plan should complement it (e.g., strengthening weak links).
    5. Add a short (1 sentence) explanation for each day explaining the logic behind the schedule.
    
    Format the response clearly using Markdown. Use professional, motivating terminology. RESPOND ONLY IN ENGLISH.
    """
    
    try:
        response = client.models.generate_content(model=MODEL_ID, contents=prompt)
        return response.text or "Error: Empty response from Gemini"
    except Exception as e:
        return f"Error during workout program generation: {str(e)}"

def generate_shopping_list(
    pantry_items: List[dict], 
    workout_plan: Optional[str] = None,
    days: int = 7,
    budget: Optional[float] = None,
    avoids: Optional[str] = None,
    preferences: Optional[str] = None
) -> str:
    """Generates a shopping list based on inventory and workout plan."""
    if not client:
        return "Error: Missing Gemini API Key."

    items_str = ", ".join([f"{item['name']} ({item['quantity']}{item['unit']})" for item in pantry_items])
    
    workout_context = f"\nConsidering this training program:\n{workout_plan}" if workout_plan else ""
    budget_context = f"\nYour budget for this shopping trip is: {budget} PLN. Try not to exceed it and choose products with a good price-to-quality ratio." if budget else ""
    duration_context = f"\nThe shopping list should last for: {days} days."
    avoids_context = f"\nSTRICTLY AVOID these products (allergies/disliked): {avoids}." if avoids else ""
    prefs_context = f"\nConsider these dietary preferences: {preferences}." if preferences else ""
    
    prompt = f"""
    You are a shopping assistant and sports nutritionist. 
    Your task is to prepare a shopping list that synchronizes the user's current resources with their goals.

    INPUT DATA:
    - Current inventory: {items_str}
    - Duration: {duration_context}
    - Budget: {budget_context}
    - What to avoid: {avoids_context}
    - Preferences: {prefs_context}
    {workout_context}
    
    LIST REQUIREMENTS:
    1. Replenish basic products that are running low (low stock in inventory).
    2. Add products necessary to implement the training program (if provided) - focus on recovery and energy.
    3. If a budget is provided, estimate prices and select products to stay within the amount.
    4. The response must be formatted in Markdown using a checklist [ ].
    5. Add a short (max 1 sentence) justification for each product explaining why it is on the list.
    
    Format the response in a clear, professional way. RESPOND ONLY IN ENGLISH.
    """
    
    try:
        response = client.models.generate_content(model=MODEL_ID, contents=prompt)
        return response.text or "Error: Empty response from Gemini"
    except Exception as e:
        return f"Error during shopping list generation: {str(e)}"
