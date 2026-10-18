# 🎓 Institute Management System (IMS)
 
A full-stack **MERN** application built for **IIT Computer Institute** to run day-to-day institute operations in one place: enquiries, admissions, fees, attendance, faculty, exams, and more.
 
---
 
## 🚀 Live Demo
 
🔗 **Live URL:** `https://atlas-green-two.vercel.app/login`
 
### 🔑 Demo Login
 
| Field    | Value             |
| -------- | ----------------- |
| Username | `test22@gmail.com` |
| Password | `test@123`         |
 
> ⏳ **Heads up:** The app is hosted on Render's **free tier**, so the server goes to sleep when idle. The **first login / first request can take 20-25 seconds** while it wakes up. Please be patient. After that, everything runs at normal speed.
 
---
 
## ✨ Features
 
**Front Office**
- Enquiry and admission management with automated admission-to-student flow
- Call logs with call history, reason and counselor filters
- Birthday reports and dynamic birthday cards
- Template Designer (drag/resize fields) for cards and certificates, with auto-generated certificate numbers
**Fees**
- Fee management with scholarship, exam fee and other-fee support
- Defaulter detection, monthly collection ledger, and fee register
- Receipt-based edit/delete
- Course conversion and extension with auto-generated fee schedules
**Attendance & Syllabus**
- Student and faculty attendance with **QR codes**, GPS geofencing and web push notifications
- Attendance locking (late threshold + edit window) with admin override requests
- Daily and monthly attendance reports
- Topic completion tracking and syllabus progress per student
**Batches**
- Batch transfer (single and bulk) with revert support
- **Bridge Batches** to cover missed syllabus topics
- Free batch calculation for faculty
**Exams**
- Question bank, test creation (batch and semester modes), and student exam portal with countdown timer
- Submission tracking and upcoming exam reports
**Faculty & Admin**
- Faculty management with photo upload and leave management (with substitute faculty)
- Admin management with suspend/reactivate and feature permission toggles
- Role-based access (Admin / Faculty / Student) with JWT auth and Google OAuth
**Student Portal**
- Dashboard, attendance, fees and exams in one place
**Inventory & Setup**
- Material inventory and issue tracking
- Setup for batches, qualifications, categories and courses (with Excel syllabus import)
---
 
## 🛠️ Tech Stack
 
| Layer      | Tech                                      |
| ---------- | ----------------------------------------- |
| Frontend   | React + Vite                              |
| Backend    | Node.js + Express                         |
| Database   | MongoDB Atlas (Mongoose)                  |
| Auth       | JWT, Google OAuth                         |
| Storage    | Cloudinary (images) + Cloudflare R2 (PPT/PDF) |
| Hosting    | Render                                    |
 
---
 
## 📁 Project Structure
 
```
ims/
├── client/        # React + Vite frontend
└── server/        # Express + MongoDB backend
```
 
---
 
## ⚙️ Run Locally
 
### 1. Clone the repo
```bash
git clone <your-repo-url>
cd ims
```
 
### 2. Backend setup
```bash
cd server
npm install
```
 
Create a `.env` file in `server/`:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_BUCKET_NAME=your_bucket
GOOGLE_CLIENT_ID=your_google_client_id
```
 
Start the server:
```bash
npm run dev
```
 
### 3. Frontend setup
```bash
cd client
npm install
```
 
Create a `.env` file in `client/`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```
 
Start the app:
```bash
npm run dev
```
 
---
 
## 👤 Roles
 
| Role    | Access                                                   |
| ------- | -------------------------------------------------------- |
| Admin   | Full access: admissions, fees, faculty, setup, reports   |
| Faculty | Attendance, topic completion, batches, exams             |
| Student | Own dashboard, attendance, fees and exams                |
 
---
 
## 📝 Notes
 
- Free-tier Render = **cold start of 20-25 sec** on the first request after inactivity.
- The demo account is for testing only. Please don't store real data in it.
---
 
## 📬 Contact
 
Built and maintained by **Anidh** for **IIT Computer Institute**, Rishikesh, Uttarakhand.
