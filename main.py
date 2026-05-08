from fastapi import FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import requests
import base64
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION GITHUB ---
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO_OWNER = os.getenv("REPO_OWNER")
REPO_NAME = os.getenv("REPO_NAME")
FILE_PATH = os.getenv("FILE_PATH", "counters.json")
GITHUB_API_URL = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{FILE_PATH}"

def get_github_file():
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}
    r = requests.get(GITHUB_API_URL, headers=headers)
    if r.status_code == 200:
        data = r.json()
        content = base64.b64decode(data['content']).decode('utf-8')
        decoded_data = json.loads(content)
        return decoded_data if isinstance(decoded_data, list) else [], data['sha']
    return [], None

def update_github_file(new_data, sha):
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}
    content_b64 = base64.b64encode(json.dumps(new_data, indent=2, ensure_ascii=False).encode('utf-8')).decode('utf-8')
    payload = {"message": "Mise à jour via site", "content": content_b64, "sha": sha}
    r = requests.put(GITHUB_API_URL, json=payload, headers=headers)
    return r.status_code in [200, 201]

# --- ROUTES API ---

@app.get("/counters/{champion}")
def get_counters(champion: str, response: Response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    data, _ = get_github_file()
    
    # Route spéciale pour charger TOUT le JSON au démarrage (pour les favoris)
    if champion == "ALL_DATA":
        return data

    # Filtrage sécurisé : on ignore les objets qui n'ont pas de champ 'champion'
    results = [c for c in data if c.get("champion") == champion]
    return sorted(results, key=lambda x: x.get("rank", 1))

@app.post("/counters/{champion}")
def add_counter(champion: str, new_counter: dict):
    data, sha = get_github_file()
    
    # On prépare l'entrée
    new_entry = {
        "champion": champion,
        "name": new_counter.get("name"),
        "comment": new_counter.get("comment", ""),
        "rank": int(new_counter.get("rank", 1)),
        "role": new_counter.get("role")
    }
    
    data.append(new_entry)
    if update_github_file(data, sha):
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Erreur lors de l'écriture sur GitHub")

@app.delete("/counters/{champion}/{counter_name}/{role}")
def delete_counter(champion: str, counter_name: str, role: str):
    data, sha = get_github_file()
    
    new_data = []
    for c in data:
        # On garde la ligne des favoris intacte si on la croise
        if c.get("type") == "config_favs":
            new_data.append(c)
            continue
            
        # Comparaison sécurisée (on évite le NoneType)
        c_champ = str(c.get("champion", ""))
        c_name = str(c.get("name", ""))
        c_role = str(c.get("role", ""))

        if not (c_champ.lower() == champion.lower() and 
                c_name.lower() == counter_name.lower() and 
                c_role == role):
            new_data.append(c)

    if update_github_file(new_data, sha):
        return {"status": "deleted"}
    raise HTTPException(status_code=500, detail="Erreur suppression")

@app.post("/favorites/{champion_id}")
def toggle_favorite(champion_id: str):
    data, sha = get_github_file()
    
    # On cherche l'objet config_favs dans le JSON
    fav_entry = next((item for item in data if item.get("type") == "config_favs"), None)
    
    if not fav_entry:
        fav_entry = {"type": "config_favs", "list": []}
        data.append(fav_entry)
    
    if champion_id in fav_entry["list"]:
        fav_entry["list"].remove(champion_id)
    else:
        fav_entry["list"].append(champion_id)
    
    if update_github_file(data, sha):
        return {"favorites": fav_entry["list"]}
    raise HTTPException(status_code=500, detail="Erreur favoris")

# --- SERVIR LE FRONT-END ---
app.mount("/", StaticFiles(directory=".", html=True), name="static")