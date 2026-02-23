

## FlowAccount API Integration Preparation
## เตรียมระบบเชื่อมต่อ FlowAccount API

---

### 1. API Settings Table (Supabase)
สร้างตาราง `api_settings` สำหรับเก็บ Client ID และ Client Secret ของ FlowAccount อย่างปลอดภัยในฐานข้อมูล:
- `id`, `user_id` (เจ้าของ setting)
- `provider` (เช่น "flowaccount")
- `client_id`, `client_secret` (encrypted at rest by Supabase)
- `is_active` (เปิด/ปิดการเชื่อมต่อ)
- `created_at`, `updated_at`
- RLS policy: เฉพาะ authenticated user เจ้าของเท่านั้นที่เข้าถึงได้

---

### 2. Webhook Edge Function (`flowaccount-webhook`)
สร้าง Supabase Edge Function ที่รับ JSON จาก FlowAccount Webhooks:

- **Public endpoint** (ไม่ต้อง JWT) — เพราะ FlowAccount เป็นคนส่ง request มา
- รับ event types: `quotation.create` และ `quotation.update`
- **Input validation**: ตรวจสอบ JSON structure, required fields, และ data types ด้วย Zod-like validation
- **Data Mapping** จาก FlowAccount fields → Quotations table:
  - `documentNumber` → `document_number` (เลขที่เอกสาร)
  - `documentDate` → `document_date` (วันที่)
  - `customerName` → `customer_name` (ชื่อลูกค้า)
  - `projectName` → `project_name` (ชื่อโปรเจ็ค)
  - `totalAmount` → `amount` (มูลค่า)
  - `vatAmount` → `vat` (ภาษีมูลค่าเพิ่ม)
  - `netTotal` → `net_total` (ยอดรวมสุทธิ)
  - `status` → `status` (สถานะ)
- **Smart Sync (Upsert)**: ใช้ `document_number` เป็น unique key — ถ้ามีอยู่แล้ว = update, ถ้าใหม่ = insert
- ส่ง response กลับ 200 OK พร้อม summary

---

### 3. Settings Page (หน้าตั้งค่า API)
เพิ่มหน้า `/settings` ในแอป:

- **FlowAccount Connection Card**:
  - ฟอร์มกรอก Client ID และ Client Secret
  - ปุ่มบันทึก (Save) → เก็บลง `api_settings` table
  - Toggle เปิด/ปิดการเชื่อมต่อ (Active/Inactive)
  - แสดง Webhook URL ที่ต้องไปตั้งค่าใน FlowAccount (copy-to-clipboard)
- **Connection Status**: แสดงสถานะ Connected / Not Connected
- **Setup Instructions**: คำแนะนำขั้นตอนการตั้งค่าใน FlowAccount (วิธีเพิ่ม Webhook URL)

---

### 4. Sidebar Navigation Update
เพิ่มเมนู ⚙️ ตั้งค่า / Settings ใน sidebar navigation

---

### 5. Webhook Log (Bonus)
สร้างตาราง `webhook_logs` เพื่อบันทึกทุก request ที่เข้ามา:
- `id`, `event_type`, `payload` (JSON), `status` (success/error), `created_at`
- แสดงรายการ log ล่าสุดในหน้า Settings เพื่อ debug ได้ง่าย

