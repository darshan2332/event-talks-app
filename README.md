# ⚡ BigQuery Release Notes Dashboard & Tweet Composer

A highly polished, modern single-page dashboard application built with a **Python Flask** backend and a plain vanilla **HTML5 / CSS3 / JavaScript** frontend. 

It retrieves the official Google Cloud BigQuery release notes Atom feed, automatically segments days with multiple updates into clean individual items, categorizes them, and provides a built-in interactive Twitter/X composer tool.

---

## 🚀 Key Features

- **Smart Feed Split-Parser**: Google's feed publishes daily entries which often bundle different announcements, issues, and deprecations together. Our parser automatically separates them by `<h3>` header sections into distinct items.
- **Visual Classification Badges**: Color-coded badges with custom HSL neon highlights and vector indicators for each update type:
  - 🛠️ **Feature** (Cyan)
  - 📢 **Announcement** (Purple)
  - ⚠️ **Deprecation** (Orange)
  - ❌ **Issue** (Red)
  - ℹ️ **Update** (Blue)
- **Built-in Tweet Composer**:
  - Automatically structures a clean Tweet template referencing the update summary, official link, and hashtags.
  - Dynamically trims the update text to ensure the generated text fits comfortably under Twitter's **280-character limit**.
  - Interactive SVG circular character gauge mimicking Twitter's client UI, warning you when you exceed the limits.
  - Single-click "Copy Text" (with success feedback animation) and "Tweet on X" (using Twitter Web Intents).
- **Responsive Layout**: Two-column layout on desktop; collapses into a single-column layout on mobile, turning the Tweet Composer into a sleek bottom slide-up drawer.
- **Smart Caching**: Standard 10-minute caching to optimize feed retrieval and prevent rate limits, with dynamic network failure cache fallbacks.

---

## 📁 Project Structure

```text
bq-releases-notes/
├── app.py                  # Flask Web Server, Caching, & XML Split Parser
├── requirements.txt        # Backend dependencies (Flask, requests)
├── vercel.json             # Vercel serverless configurations
├── .gitignore              # Ignores bytecode, virtual environments, & cache
├── README.md               # User manual & documentation
├── templates/
│   └── index.html          # Web application structure
└── static/
    ├── css/
    │   └── style.css       # Visual styles (Glassmorphism, animations)
    └── js/
        └── app.js          # Client-side reactivity, search filters, & composer
```

---

## 🛠️ Local Development & Setup

### Prerequisites
Make sure you have **Python 3.10+** and **pip** installed.

### 1. Installation
Clone the repository and install the dependencies:
```bash
pip install -r requirements.txt
```

### 2. Run the Application
Start the Flask local development server:
```bash
python app.py
```
By default, the application will bind to: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## ☁️ Vercel Deployment

This project is fully configured for deployment on Vercel as a Serverless Function.

To deploy it:
1. Open your terminal in the project directory.
2. Execute the Vercel CLI runner:
   ```bash
   npx vercel
   ```
3. Authenticate and select the default options (press Enter) to deploy the project instantly.

---

## ⚙️ Technologies Used

- **Backend**: Python, Flask, Requests, XML ElementTree
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Flexbox, CSS Grid), Vanilla ES6 JavaScript (Fetch API, DOM manipulation)
- **Icons**: Lucide Icons CDN
- **Fonts**: Outfit & Plus Jakarta Sans via Google Fonts
