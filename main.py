from fastapi import FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import requests
import base64
from dotenv import load_dotenv

# 1. Configuration
load_dotenv()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO_OWNER = os.getenv("REPO_OWNER")
REPO_NAME = os.getenv("REPO_NAME")
FILE_PATH = os.getenv("FILE_PATH", "counters.json")
GITHUB_API_URL = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{FILE_PATH}"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FONCTIONS UTILES ---

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
    content_b64 = base64.b64encode(json.dumps(new_data, indent=4, ensure_ascii=False).encode('utf-8')).decode('utf-8')
    payload = {"message": "Update via site", "content": content_b64, "sha": sha}
    r = requests.put(GITHUB_API_URL, json=payload, headers=headers)
    return r.status_code in [200, 201]

# --- ROUTES HTML (À mettre AVANT les routes API) ---

# On monte le dossier static
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_index():
    return FileResponse("static/index.html")

# --- ROUTES API ---

@app.get("/counters/{champion}")
def get_counters(champion: str, response: Response):
    # Empêche le navigateur d'afficher d'anciennes données
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    data, _ = get_github_file()
    results = [c for c in data if c.get("champion") == champion]
    return sorted(results, key=lambda x: x.get("rank", 0))

@app.post("/counters/{champion}")
def add_counter(champion: str, new_counter: dict):
    data, sha = get_github_file()
    new_entry = {
        "champion": champion,
        "name": new_counter.get("name"),
        "comment": new_counter.get("comment"),
        "rank": new_counter.get("rank"),
        "role": new_counter.get("role")
    }
    data.append(new_entry)
    if update_github_file(data, sha):
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Erreur GitHub")

@app.delete("/counters/{champion}/{counter_name}/{role}")
def delete_counter(champion: str, counter_name: str, role: str):
    data, sha = get_github_file()
    new_data = [c for c in data if not (
        c.get("champion") == champion and 
        c.get("name") == counter_name and 
        c.get("role") == role
    )]
    if update_github_file(new_data, sha):
        return {"status": "deleted"}
    raise HTTPException(status_code=500, detail="Erreur suppression")