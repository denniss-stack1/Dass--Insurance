# 🛡️ DASS Insurance — Cloud-Powered Sample Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-AWS%20%7C%20Netlify-orange)](https://aws.amazon.com/)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-brightgreen)](frontend/)
[![IaC](https://img.shields.io/badge/IaC-Terraform-blueviolet)](terraform/)

A modern, serverless insurance policy and claim management platform. Built with a responsive, glassmorphic client interface and designed for dual deployment: run locally with zero-overhead Python/Node servers or deploy to production on AWS serverless infrastructure with Terraform.

---

## 🌟 Key Features

- **⚡ Real-Time Quote Engine**: Instant premium calculation based on user-input risk factors (auto history, coverage amounts, deductibles, health metrics).
- **📋 Customer Portal**: Self-service hub for customers to view active policies, submit insurance claims, and track claim approval status in real time.
- **🔍 Adjuster Desk**: Dedicated interface for insurance adjusters to audit, approve, or adjust incoming claims.
- **🔄 Multi-Role UI**: Fast toggle between **Customer** and **Adjuster** viewpoints within a unified interface.
- **☁️ Multi-Cloud & Hybrid Ready**:
  - **Local Development**: Instant single-click launch with Python or Node.js.
  - **Netlify**: Serverless Edge deployment configured out-of-the-box (`netlify.toml`).
  - **AWS Serverless**: Complete Infrastructure as Code (IaC) via Terraform provisioning API Gateway, Lambda, and DynamoDB.

---

## 🏗️ Architecture & Tech Stack

```
                     ┌─────────────────────────────┐
                     │   Modern Web Client (UI)    │
                     │  (HTML5 / CSS3 / Vanilla JS)│
                     └──────────────┬──────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        [ Local Mode ]                       [ Cloud Mode ]
  ┌───────────────────────────┐         ┌───────────────────────────┐
  │ Python HTTP / Node Server │         │    Amazon API Gateway     │
  │     (Port 3001)           │         └─────────────┬─────────────┘
  └─────────────┬─────────────┘                       │
                │                                     ▼
                ▼                       ┌───────────────────────────┐
  ┌───────────────────────────┐         │    AWS Lambda (Node.js)   │
  │  Local JSON Database      │         └─────────────┬─────────────┘
  │      (database.json)      │                       │
  └───────────────────────────┘                       ▼
                                        ┌───────────────────────────┐
                                        │  Amazon DynamoDB Tables   │
                                        │    (Policies & Claims)    │
                                        └───────────────────────────┘
```

| Layer | Technologies |
|---|---|
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 (Glassmorphism & CSS Grid) |
| **Backend (Local)** | Python 3 (`http.server`) & Node.js Express (`server.js`) |
| **Backend (Cloud)** | AWS Lambda (`serverless-http`), Netlify Functions |
| **Database** | Amazon DynamoDB (Cloud) / JSON File Store (Local) |
| **Infrastructure as Code** | HashiCorp Terraform (`~> 5.0`) |

---

## 📁 Repository Structure

```text
├── backend/
│   ├── database.json          # Local file-based mock database
│   ├── lambda.js              # AWS Lambda serverless wrapper
│   ├── package.json           # Node.js backend dependencies
│   ├── server.js              # Express API server for local/container dev
│   └── server.py              # Lightweight zero-dependency Python API server
├── frontend/
│   ├── app.js                 # Client-side routing, state, and API integration
│   ├── index.html             # Main single-page application structure
│   └── styles.css             # Glassmorphic UI design and responsive styles
├── netlify/
│   └── functions/
│       └── api.js             # Netlify serverless function redirect
├── terraform/
│   ├── main.tf                # AWS DynamoDB, Lambda, and API Gateway resources
│   ├── outputs.tf             # Terraform deployment output endpoints
│   └── variables.tf           # Configurable infrastructure variables
├── .gitignore                 # Rules for ignoring local & build artifacts
├── DASS_Insurance_Presentation.pptx # System architecture presentation deck
├── netlify.toml               # Netlify build and redirect configuration
├── README.md                  # Project documentation
└── run.bat                    # One-click Windows local bootstrapper
```

---

## 🚀 Quick Start (Local Run)

### Option 1: One-Click Launch (Windows)
Double-click `run.bat` or run:
```bat
run.bat
```
This automatically launches `frontend/index.html` in your default browser and spins up the local Python API database server on `http://localhost:3001`.

---

### Option 2: Manual Run

#### 1. Start the Backend API
Choose either the Python server or Node.js server:

**Using Python (zero extra dependencies required):**
```bash
python backend/server.py
```

**Using Node.js:**
```bash
cd backend
npm install
npm start
```
The API server will listen on `http://localhost:3001`.

#### 2. Open the Frontend
Open `frontend/index.html` directly in any modern browser, or serve it using an HTTP server (e.g., Live Server or `npx serve frontend`).

---

## ☁️ Cloud Deployment

### Deploy to Netlify
1. Connect this repository to your Netlify dashboard.
2. Netlify will automatically detect [`netlify.toml`](netlify.toml) and configure:
   - **Publish directory**: `frontend`
   - **Functions directory**: `netlify/functions`
   - **API rewrite**: Redirects `/api/*` to the serverless function.

### Deploy to AWS with Terraform
Make sure AWS CLI credentials are configured, then execute:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This will automatically provision:
- Amazon DynamoDB tables for policies and claims (`PAY_PER_REQUEST`).
- AWS Lambda functions with necessary IAM execution roles.
- Amazon API Gateway with CORS enabled.

---


