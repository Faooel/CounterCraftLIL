from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION DU STOCKAGE PERSISTANT ---
# Sur Render, on va créer un disque monté sur /data
# Si on est en local, on utilise le dossier courant
PERSISTENT_DIR = "/data" if os.path.exists("/data") else "."
DB_FILE = os.path.join(PERSISTENT_DIR, "counters.json")

def load_data():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_data(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# Sert les fichiers statiques
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_index():
    return FileResponse("static/index.html")

@app.get("/counters/{champion}")
def get_counters(champion: str):
    data = load_data()
    results = [c for c in data if c.get("champion") == champion]
    return sorted(results, key=lambda x: x.get("rank", 0))

@app.post("/counters/{champion}")
def add_counter(champion: str, new_counter: dict):
    data = load_data()
    # Nettoyage des doublons
    data = [c for c in data if not (
        c.get("champion") == champion and 
        c.get("name") == new_counter.get("name") and 
        c.get("role") == new_counter.get("role")
    )]
    
    new_entry = {
        "champion": champion,
        "name": new_counter.get("name"),
        "comment": new_counter.get("comment"),
        "rank": new_counter.get("rank"),
        "role": new_counter.get("role")
    }
    
    data.append(new_entry)
    save_data(data)
    return {"message": "Enregistré sur le disque persistant"}

@app.delete("/counters/{champion}/{counter_name}/{role}")
def delete_counter(champion: str, counter_name: str, role: str):
    data = load_data()
    new_data = [c for c in data if not (
        c.get("champion") == champion and 
        c.get("name") == counter_name and 
        c.get("role") == role
    )]
    save_data(new_data)
    return {"message": "Supprimé"}