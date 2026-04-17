# ECG Anomaly Detector

A fully client-side web app for visualizing ECG data and detecting anomalies using statistical analysis (Z-score) + Claude AI clinical summaries.

## Features

- Upload any ECG CSV file (drag & drop or click)
- Live waveform chart using Chart.js
- Automatic anomaly detection (Z-score method, 2.5σ threshold)
- Red dots highlight anomaly points on the graph
- Anomaly list with severity (High / Medium / Low)
- 4 metric cards: data points, anomaly count, heart rate estimate, signal quality
- AI clinical summary powered by Claude (Anthropic API)
- Fully responsive, dark-mode ready

## File Structure

```
ecg-anomaly-detector/
├── index.html       ← Main HTML page
├── style.css        ← All styles
├── app.js           ← All JavaScript logic
├── sample_ecg.csv   ← Test CSV file
└── README.md        ← This file
```

## Setup Instructions

### Step 1 — Get Your Anthropic API Key

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Click **API Keys** in the left sidebar
4. Click **Create Key**, give it a name, copy the key

### Step 2 — Add Your API Key

Open `app.js` and replace line 10:

```js
const ANTHROPIC_API_KEY = "YOUR_API_KEY_HERE";
```

with your actual key:

```js
const ANTHROPIC_API_KEY = "sk-ant-api03-xxxxxxxxxxxxxx";
```

### Step 3 — Open in Browser

Because this app uses the Fetch API to call Anthropic, you need to serve it via a local HTTP server (not just open index.html directly as a file).

**Option A — Using VS Code Live Server (easiest)**
1. Install [VS Code](https://code.visualstudio.com/)
2. Install the **Live Server** extension (by Ritwick Dey)
3. Open the `ecg-anomaly-detector` folder in VS Code
4. Right-click `index.html` → **Open with Live Server**
5. Browser opens at `http://127.0.0.1:5500`

**Option B — Using Python (built into most systems)**
```bash
# Navigate to the project folder
cd ecg-anomaly-detector

# Python 3
python -m http.server 8080

# Then open in browser:
# http://localhost:8080
```

**Option C — Using Node.js `serve`**
```bash
npm install -g serve
cd ecg-anomaly-detector
serve .
# Open http://localhost:3000
```

### Step 4 — Test with Sample Data

Upload `sample_ecg.csv` (included in this repo). It contains 3 injected anomalies at samples #40, #78, and #110 so you can verify detection works.

---

## Uploading to GitHub

### Step 1 — Install Git

Download from [https://git-scm.com/downloads](https://git-scm.com/downloads) and install.

### Step 2 — Create a GitHub Account

Go to [https://github.com](https://github.com) and sign up if you don't have an account.

### Step 3 — Create a New Repository

1. Click the **+** button (top right on GitHub) → **New repository**
2. Name it `ecg-anomaly-detector`
3. Set to **Public** or **Private**
4. Do NOT initialize with README (you already have one)
5. Click **Create repository**

### Step 4 — Push Your Code

Open a terminal / command prompt in your project folder and run:

```bash
# Initialize git
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: ECG Anomaly Detector"

# Connect to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/ecg-anomaly-detector.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Done! Your code is now on GitHub.

---

## IMPORTANT — API Key Security

**Never commit your real API key to a public GitHub repo.**

Before pushing to a public repo:
1. Replace your key in `app.js` with `"YOUR_API_KEY_HERE"` again, OR
2. Add `app.js` to `.gitignore` if it contains the key, OR
3. Use a `.env` file approach (for Node.js backend setups)

For competitions / demos with a private repo, having the key in the file is fine.

---

## How It Works

1. **CSV Parsing** — reads any CSV file and extracts numeric ECG values
2. **Z-score Detection** — calculates mean and standard deviation of the signal; any point with |z| > 2.5σ is flagged as an anomaly
3. **Chart.js Visualization** — renders the ECG waveform; anomaly points shown as red dots
4. **Claude AI** — sends statistical summary to Claude API, receives a clinical interpretation

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript (no frameworks)
- [Chart.js 4.4](https://www.chartjs.org/) — waveform chart
- [Anthropic Claude API](https://docs.anthropic.com) — AI clinical summary
- Google Fonts — Space Grotesk + JetBrains Mono

## License

MIT — free to use, modify, and distribute.
