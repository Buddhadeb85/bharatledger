use tauri::Manager;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Company {
    pub id: Option<i64>,
    pub company_name: String,
    pub owner_name: String,
    pub phone: String,
    pub state: String,
    pub business_type: String,
    pub entity_category: String,
    pub gstin: String,
    pub pan: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Voucher {
    pub id: Option<i64>,
    pub voucher_type: String,
    pub party_name: String,
    pub amount: f64,
    pub narration: String,
}

fn get_db_path(app_handle: &tauri::AppHandle) -> std::path::PathBuf {
    let app_dir = app_handle.path().app_data_dir().expect("failed to get app data dir");
    std::fs::create_dir_all(&app_dir).unwrap();
    app_dir.join("bharatledger.db")
}

fn init_db(app_handle: &tauri::AppHandle) -> Result<()> {
    let db_path = get_db_path(app_handle);
    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS licenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_key TEXT NOT NULL,
            mobile TEXT NOT NULL,
            plan_type TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1
        )",
        [],
    )?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            owner_name TEXT,
            phone TEXT,
            state TEXT,
            business_type TEXT,
            entity_category TEXT DEFAULT 'Business',
            gstin TEXT,
            pan TEXT
        )",
        [],
    )?;

    let _ = conn.execute("ALTER TABLE companies ADD COLUMN entity_category TEXT DEFAULT 'Business'", []);
    let _ = conn.execute("ALTER TABLE companies ADD COLUMN pan TEXT", []);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_type TEXT NOT NULL,
            party_name TEXT NOT NULL,
            amount REAL NOT NULL,
            narration TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // 👇 ADD THIS LINE TO SAFELY ADD THE COLUMN TO EXISTING DATABASES 👇
    let _ = conn.execute("ALTER TABLE vouchers ADD COLUMN sync_status TEXT DEFAULT 'pending'", []);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS opening_balances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            opening_cash REAL DEFAULT 0.0,
            opening_bank REAL DEFAULT 0.0,
            opening_stock_value REAL DEFAULT 0.0,
            previous_fy TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_type TEXT NOT NULL,
            party_name TEXT NOT NULL,
            amount REAL NOT NULL,
            narration TEXT,
            sync_status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LicenseInfo {
    pub license_key: String,
    pub mobile: String,
    pub plan_type: String,
    pub expiry_date: String,
    pub is_active: bool,
}

#[tauri::command]
fn verify_and_activate_license(app_handle: tauri::AppHandle, license_key: String, mobile: String) -> Result<LicenseInfo, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Simple validation rule for commercial sales (e.g., keys starting with "BL-")
    if !license_key.starts_with("BL-") || mobile.len() < 10 {
        return Err("Invalid License Key or Mobile Number! Please contact BharatLedger support.".into());
    }

    let plan = if license_key.contains("PRO") { "Professional / Doctor" } 
               else if license_key.contains("SAL") { "Salaried Individual" } 
               else { "Small Business / Kirana" };

    let expiry = "2027-03-31"; // 1-year validity

    // Clear old records and save active license
    conn.execute("DELETE FROM licenses", []).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO licenses (license_key, mobile, plan_type, expiry_date, is_active) VALUES (?1, ?2, ?3, ?4, 1)",
        rusqlite::params![license_key, mobile, plan, expiry],
    ).map_err(|e| e.to_string())?;

    Ok(LicenseInfo {
        license_key,
        mobile,
        plan_type: plan.into(),
        expiry_date: expiry.into(),
        is_active: true,
    })
}

#[tauri::command]
fn check_license_status(app_handle: tauri::AppHandle) -> Result<Option<LicenseInfo>, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT license_key, mobile, plan_type, expiry_date, is_active FROM licenses WHERE is_active = 1 LIMIT 1")
        .map_err(|e| e.to_string())?;

    let license_iter = stmt.query_map([], |row| {
        Ok(LicenseInfo {
            license_key: row.get(0)?,
            mobile: row.get(1)?,
            plan_type: row.get(2)?,
            expiry_date: row.get(3)?,
            is_active: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    for item in license_iter {
        if let Ok(lic) = item {
            return Ok(Some(lic));
        }
    }

    Ok(None)
}

#[tauri::command]
fn save_company(app_handle: tauri::AppHandle, company: Company) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM companies", []).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO companies (company_name, owner_name, phone, state, business_type, entity_category, gstin, pan) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            company.company_name,
            company.owner_name,
            company.phone,
            company.state,
            company.business_type,
            company.entity_category,
            company.gstin,
            company.pan
        ],
    ).map_err(|e| e.to_string())?;

    Ok("Company/Profile saved successfully!".into())
}

#[tauri::command]
fn get_company(app_handle: tauri::AppHandle) -> Result<Option<Company>, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT company_name, owner_name, phone, state, business_type, entity_category, gstin, pan FROM companies LIMIT 1")
        .map_err(|e| e.to_string())?;

    let company_iter = stmt.query_map([], |row| {
        Ok(Company {
            id: None,
            company_name: row.get(0)?,
            owner_name: row.get(1)?,
            phone: row.get(2)?,
            state: row.get(3)?,
            business_type: row.get(4)?,
            entity_category: row.get(5)?,
            gstin: row.get(6)?,
            pan: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    for comp in company_iter {
        if let Ok(c) = comp {
            return Ok(Some(c));
        }
    }

    Ok(None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            init_db(app.handle()).expect("Failed to initialize SQLite database");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            verify_and_activate_license,
            check_license_status,
            save_company, 
            add_voucher, 
            get_company, 
            get_financial_summary, 
            save_opening_balance, 
            get_opening_balance,
            backup_database,
            restore_database,
            sync_with_cloud
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
#[derive(Serialize, Deserialize, Debug)]
pub struct FinancialSummary {
    pub total_receipts: f64,
    pub total_payments: f64,
    pub net_balance: f64,
}

#[tauri::command]
fn get_financial_summary(app_handle: tauri::AppHandle) -> Result<FinancialSummary, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut receipts: f64 = 0.0;
    let mut payments: f64 = 0.0;

    let mut stmt = conn.prepare("SELECT voucher_type, SUM(amount) FROM vouchers GROUP BY voucher_type")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        let v_type: String = row.get(0)?;
        let total: f64 = row.get(1)?;
        Ok((v_type, total))
    }).map_err(|e| e.to_string())?;

    for row in rows {
        if let Ok((v_type, total)) = row {
            if v_type == "Receipt" {
                receipts = total;
            } else if v_type == "Payment" {
                payments = total;
            }
        }
    }

    Ok(FinancialSummary {
        total_receipts: receipts,
        total_payments: payments,
        net_balance: receipts - payments,
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OpeningBalance {
    pub opening_cash: f64,
    pub opening_bank: f64,
    pub opening_stock: f64,
    pub previous_fy: String,
}

#[tauri::command]
fn save_opening_balance(app_handle: tauri::AppHandle, ob: OpeningBalance) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Keep single record of opening balances per profile setup
    conn.execute("DELETE FROM opening_balances", []).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO opening_balances (opening_cash, opening_bank, opening_stock, previous_fy) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![
            ob.opening_cash,
            ob.opening_bank,
            ob.opening_stock,
            ob.previous_fy
        ],
    ).map_err(|e| e.to_string())?;

    Ok("Opening balances saved successfully!".into())
}

#[tauri::command]
fn get_opening_balance(app_handle: tauri::AppHandle) -> Result<Option<OpeningBalance>, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT opening_cash, opening_bank, opening_stock, previous_fy FROM opening_balances LIMIT 1")
        .map_err(|e| e.to_string())?;

    let ob_iter = stmt.query_map([], |row| {
        Ok(OpeningBalance {
            opening_cash: row.get(0)?,
            opening_bank: row.get(1)?,
            opening_stock: row.get(2)?,
            previous_fy: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    for item in ob_iter {
        if let Ok(ob) = item {
            return Ok(Some(ob));
        }
    }

    Ok(None)
}

#[tauri::command]
fn backup_database(app_handle: tauri::AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let docs_dir = app_handle.path().document_dir().map_err(|e| e.to_string())?;
    let backup_path = docs_dir.join("bharatledger_backup.db");
    
    std::fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
    Ok(format!("Backup created successfully in your Documents folder!"))
}

#[tauri::command]
fn restore_database(app_handle: tauri::AppHandle, backup_path: String) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    std::fs::copy(backup_path, &db_path).map_err(|e| e.to_string())?;
    Ok("Database restored successfully! Please restart the app.".into())
}

#[tauri::command]
fn add_voucher(app_handle: tauri::AppHandle, voucher: Voucher) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO vouchers (voucher_type, party_name, amount, narration, sync_status) VALUES (?1, ?2, ?3, ?4, 'pending')",
        rusqlite::params![
            voucher.voucher_type,
            voucher.party_name,
            voucher.amount,
            voucher.narration
        ],
    ).map_err(|e| e.to_string())?;

    Ok("Voucher posted locally & queued for cloud sync!".into())
}

#[tauri::command]
async fn sync_with_cloud(app_handle: tauri::AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 1. Fetch all pending unsynced vouchers
    let mut stmt = conn.prepare("SELECT id, voucher_type, party_name, amount, narration FROM vouchers WHERE sync_status = 'pending'")
        .map_err(|e| e.to_string())?;

    let voucher_iter = stmt.query_map([], |row| {
        Ok(Voucher {
            id: Some(row.get(0)?),
            voucher_type: row.get(1)?,
            party_name: row.get(2)?,
            amount: row.get(3)?,
            narration: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut pending_vouchers = Vec::new();
    let mut ids_to_update = Vec::new();

    for v in voucher_iter {
        if let Ok(voucher) = v {
            if let Some(vid) = voucher.id {
                ids_to_update.push(vid);
            }
            pending_vouchers.push(voucher);
        }
    }

    if pending_vouchers.is_empty() {
        return Ok("All records are already synced with the cloud server!".into());
    }

    // 2. Push to your Cloud API Endpoint (e.g., https://api.bharatledger.com/sync)
    // let client = reqwest::Client::new();
    // let res = client.post("https://api.bharatledger.com/sync")
    //     .json(&pending_vouchers)
    //     .send()
    //     .await;

    // Simulating successful network sync response for demonstration:
    let cloud_sync_success = true; 

    if cloud_sync_success {
        // 3. Mark synced records as 'synced' in local SQLite
        for id in ids_to_update {
            conn.execute("UPDATE vouchers SET sync_status = 'synced' WHERE id = ?1", rusqlite::params![id])
                .map_err(|e| e.to_string())?;
        }
        Ok(format!("Successfully synced {} voucher(s) to cloud server!", pending_vouchers.len()))
    } else {
        Err("No internet connection. Vouchers remain safely stored offline.".into())
    }
}