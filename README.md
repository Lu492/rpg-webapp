# RPG Webapp (mobile-first)

Run locally:

```bash
cd rpg-webapp
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

Run with Docker:

```bash
cd rpg-webapp
docker build -t rpg-webapp .
docker run --name rpg-webapp -p 8080:80 rpg-webapp
```

Open `http://localhost:8080`. Stop the container with `Ctrl+C`, or run it in the background with `docker run -d --name rpg-webapp -p 8080:80 rpg-webapp`. Remove it later with `docker rm -f rpg-webapp`.

Create a local git repository for `rpg-webapp` (optional)

Run one of the following inside the `rpg-webapp` folder to initialize a git repo and make the initial commit:

Unix / WSL / Git Bash:
```bash
./init-repo.sh
```

Windows PowerShell:
```powershell
.\init-repo.ps1
# or pass a remote: .\init-repo.ps1 -Remote "https://github.com/<user>/rpg-webapp.git"
```

After running the script add a remote and push, for example:
```bash
git remote add origin <your-remote-url>
git branch -M main
git push -u origin main
```

