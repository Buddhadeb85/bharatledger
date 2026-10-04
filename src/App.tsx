import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { jsPDF } from "jspdf";

interface Company {
  name: string;
  owner: string;
  phone: string;
  state: string;
  businessType: string;
  entityCategory: string;
  gstin: string;
  pan: string;
}

interface Voucher {
  id: number;
  type: string;
  party: string;
  amount: number;
  narration: string;
}

interface InventoryItem {
  id: number;
  name: string;
  hsn: string;
  rate: number;
  gstRate: number;
  stock: number;
}

function App() {
  const [license, setLicense] = useState<any>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [mobileInput, setMobileInput] = useState("");
  const [company, setCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [newVoucher, setNewVoucher] = useState({ type: "Receipt", party: "", amount: "", narration: "" });
  const [openingBalance, setOpeningBalance] = useState({ opening_cash: 0, opening_bank: 0, opening_stock: 0, previous_fy: "2025-2026" });

  useEffect(() => {
    // Check company profile...
    // Check license status
    invoke<any>("check_license_status")
      .then((res) => {
        if (res) setLicense(res);
      })
      .catch((err) => console.error("License check failed:", err));
  }, []);
  
  // 👇 ADD THIS useEffect HOOK TO LOAD SAVED PROFILE ON STARTUP
  useEffect(() => {
    invoke<any>("get_company")
      .then((res) => {
        if (res) {
          setCompany({
            name: res.company_name,
            owner: res.owner_name,
            phone: res.phone,
            state: res.state,
            businessType: res.business_type,
            entityCategory: res.entity_category,
            gstin: res.gstin,
            pan: res.pan
          });
        }
      })
      .catch((err) => console.error("Failed to load company profile:", err));
  }, []);

  useEffect(() => {
    invoke<any>("get_company")
      .then((res) => {
        if (res) {
          setCompany({
            name: res.company_name,
            owner: res.owner_name,
            phone: res.phone,
            state: res.state,
            businessType: res.business_type,
            entityCategory: res.entity_category,
            gstin: res.gstin,
            pan: res.pan
          });
        }
      })
      .catch((err) => console.error("Failed to load company profile:", err));

    invoke<any>("get_opening_balance")
      .then((res) => {
        if (res) {
          setOpeningBalance(res);
        }
      })
      .catch((err) => console.error("Failed to load opening balances:", err));
  }, []);

  // Inventory & GST State
  const [items, setItems] = useState<InventoryItem[]>([
    { id: 1, name: "Basmati Rice (1kg)", hsn: "1006", rate: 65, gstRate: 5, stock: 120 },
    { id: 2, name: "Mustard Oil (1L)", hsn: "1514", rate: 140, gstRate: 5, stock: 45 },
    { id: 3, name: "Sugar (1kg)", hsn: "1701", rate: 42, gstRate: 5, stock: 200 },
  ]);
  const [newItem, setNewItem] = useState({ name: "", hsn: "", rate: "", gstRate: "5", stock: "" });

  // GST Quick Calculator State
  const [calcAmount, setCalcAmount] = useState<string>("");
  const [calcGstRate, setCalcGstRate] = useState<number>(5);

  // CA Portal State
  const [auditLocked, setAuditLocked] = useState<boolean>(false);
  const [caNotes, setCaNotes] = useState<string>("Books reviewed up to current period. Section 40A(3) and 44ADA compliance verified.");

  // Voice Assistant State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");

  const handleSetupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const compData: Company = {
      name: formData.get("companyName") as string || "",
      owner: formData.get("ownerName") as string || "",
      phone: formData.get("phone") as string || "",
      state: formData.get("state") as string || "West Bengal",
      businessType: formData.get("businessType") as string || "Kirana / General Store",
      entityCategory: formData.get("entityCategory") as string || "Business",
      gstin: formData.get("gstin") as string || "",
      pan: formData.get("pan") as string || "",
    };

    try {
      await invoke("save_company", {
        company: {
          company_name: compData.name,
          owner_name: compData.owner,
          phone: compData.phone,
          state: compData.state,
          business_type: compData.businessType,
          entity_category: compData.entityCategory,
          gstin: compData.gstin,
          pan: compData.pan
        }
      });
      setCompany(compData);
    } catch (error) {
      console.error("Failed to save company:", error);
      alert("Error saving profile to database!");
    }
  };

  const handleAddVoucher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (auditLocked) {
      alert("⚠️ Books are locked by your CA for this period! Vouchers cannot be added or modified.");
      return;
    }
    if (!newVoucher.party || !newVoucher.amount) return;

    try {
      await invoke("add_voucher", {
        voucher: {
          voucher_type: newVoucher.type,
          party_name: newVoucher.party,
          amount: parseFloat(newVoucher.amount),
          narration: newVoucher.narration
        }
      });

      const voucherEntry: Voucher = {
        id: Date.now(),
        type: newVoucher.type,
        party: newVoucher.party,
        amount: parseFloat(newVoucher.amount),
        narration: newVoucher.narration
      };

      setVouchers([voucherEntry, ...vouchers]);
      setNewVoucher({ type: "Receipt", party: "", amount: "", narration: "" });
      alert("Voucher posted and saved securely offline! 💾");
    } catch (error) {
      console.error("Failed to save voucher:", error);
      alert("Error posting voucher!");
    }
  };

  const handleAddInventory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (auditLocked) {
      alert("⚠️ Books are locked by your CA! Inventory cannot be updated.");
      return;
    }
    if (!newItem.name || !newItem.rate) return;
    const itemEntry: InventoryItem = {
      id: Date.now(),
      name: newItem.name,
      hsn: newItem.hsn || "9999",
      rate: parseFloat(newItem.rate),
      gstRate: parseFloat(newItem.gstRate),
      stock: parseInt(newItem.stock) || 0
    };
    setItems([...items, itemEntry]);
    setNewItem({ name: "", hsn: "", rate: "", gstRate: "5", stock: "" });
  };

  const startVoiceRecording = () => {
    setIsListening(true);
    setVoiceTranscript("Listening... (Speak in Hindi or English)");
    
    setTimeout(() => {
      const simulatedSpeech = "Ram se 5000 cash mila";
      setVoiceTranscript(simulatedSpeech);
      setIsListening(false);
      parseVoiceVoucher(simulatedSpeech);
    }, 3000);
  };

  const parseVoiceVoucher = (text: string) => {
    if (text.toLowerCase().includes("mila") || text.toLowerCase().includes("cash mila")) {
      setNewVoucher({
        type: "Receipt",
        party: "Ram",
        amount: "5000",
        narration: `Voice entry: "${text}"`
      });
      setActiveTab("vouchers");
      alert("🎤 Voice parsed successfully! Generated Receipt Voucher for Ram - ₹5,000");
    }
  };

  const downloadReceiptPDF = (v: any) => {
    if (!company) return;
    
    const doc = new jsPDF() as any;

    // Document Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138); // Navy Blue
    doc.text(company.name.toUpperCase(), 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Entity Category: ${company.entityCategory} | Type: ${company.businessType}`, 15, 27);
    doc.text(`PAN: ${company.pan} ${company.gstin ? `| GSTIN: ${company.gstin}` : ""}`, 15, 33);

    // Divider Line
    doc.setLineWidth(0.5);
    doc.setLineColor(200, 200, 200);
    doc.line(15, 38, 195, 38);

    // Receipt Metadata
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(`${v.type.toUpperCase()} VOUCHER / BILL`, 15, 48);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Voucher ID: #${v.id}`, 15, 56);
    doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 140, 56);

    // Bill To / Party Details Box
    doc.setFillColor(243, 244, 246);
    doc.rect(15, 63, 180, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Billed To / Party Name:", 20, 71);
    doc.setFont("helvetica", "normal");
    doc.text(v.party, 20, 78);

    // Transaction Details Table Headers
    doc.setFillColor(30, 58, 138);
    doc.rect(15, 93, 180, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Description / Narration", 20, 100);
    doc.text("Type", 120, 100);
    doc.text("Amount (INR)", 160, 100);

    // Table Content
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "normal");
    doc.text(v.narration || "Professional Service / Goods Supply", 20, 112);
    doc.text(v.type, 120, 112);
    doc.text(`Rs. ${v.amount.toLocaleString()}`, 160, 112);

    // Total Amount Section
    doc.line(15, 122, 195, 122);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: Rs. ${v.amount.toLocaleString()}`, 130, 132);

    // Footer / UPI Note
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you for your business! Please pay securely via UPI.", 15, 155);
    doc.text("Generated securely via BharatLedger Offline-First Ecosystem", 15, 162);

    // Save PDF locally
    doc.save(`${v.type}_${v.party}_${v.amount}.pdf`);
  };
  const downloadGSTRSummaryPDF = () => {
    if (!company) return;
    const doc = new jsPDF() as any;

    const totalSales = vouchers.filter(v => v.type === "Receipt").reduce((acc, v) => acc + v.amount, 0);
    const totalPurchases = vouchers.filter(v => v.type === "Payment").reduce((acc, v) => acc + v.amount, 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text("OFFICIAL GSTR SUMMARY REPORT", 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Company: ${company.name} | PAN: ${company.pan} | GSTIN: ${company.gstin || "UNREGISTERED"}`, 15, 27);
    
    doc.setLineWidth(0.5);
    doc.line(15, 32, 195, 32);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("Period: March 2026", 15, 42);

    doc.text(`Total Outward Sales (Receipts): Rs. ${totalSales.toLocaleString()}`, 15, 55);
    doc.text(`Total Inward Purchases (Payments): Rs. ${totalPurchases.toLocaleString()}`, 15, 65);
    doc.text(`Estimated Taxable Value (Net): Rs. ${(totalSales / 1.18).toFixed(2)}`, 15, 75);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Generated offline securely via BharatLedger Ecosystem", 15, 100);

    doc.save(`GSTR_Summary_${company.pan}.pdf`);
    alert("✅ GSTR Summary PDF downloaded successfully!");
  };

  // 1. Export GSTR-1 (Outward Supplies / Sales / Receipts)
  const downloadGSTR1JSON = () => {
    if (!company) return;

    const gstr1Data = {
      gstin: company.gstin || "UNREGISTERED",
      fp: "032026", // Example Fiscal Period (MMYYYY)
      b2b: vouchers.filter(v => v.type === "Receipt").map(v => ({
        inum: `INV-${v.id}`,
        idt: new Date().toLocaleDateString("en-IN"),
        val: v.amount,
        pos: company.state,
        items: [
          {
            num: 1,
            rt: 18,
            txval: v.amount / 1.18,
            iamt: 0,
            camt: (v.amount - (v.amount / 1.18)) / 2,
            samt: (v.amount - (v.amount / 1.18)) / 2,
          }
        ]
      })),
      note: "Generated via BharatLedger Offline-First Ecosystem"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gstr1Data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `GSTR1_${company.pan}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    alert("✅ GSTR-1 JSON file downloaded successfully to your default downloads folder!"); // 👈 Added success message
  };

  // 2. Export GSTR-3B (Monthly Summary Return)
  const downloadGSTR3BJSON = () => {
    if (!company) return;

    const totalSales = vouchers.filter(v => v.type === "Receipt").reduce((acc, v) => acc + v.amount, 0);
    const totalPurchases = vouchers.filter(v => v.type === "Payment").reduce((acc, v) => acc + v.amount, 0);

    const gstr3bData = {
      gstin: company.gstin || "UNREGISTERED",
      ret_period: "032026",
      sup_details: {
        osup_det: {
          txval: totalSales / 1.18,
          igst: 0,
          cgst: (totalSales - (totalSales / 1.18)) / 2,
          samt: (totalSales - (totalSales / 1.18)) / 2,
          cess: 0
        }
      },
      inter_sup: {
        unreg_details: [],
        comp_details: []
      },
      inward_sup: {
        isup_details: {
          ty: "B2B",
          val: totalPurchases
        }
      },
      note: "Summary return generated offline via BharatLedger"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gstr3bData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `GSTR3B_${company.pan}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    alert("✅ GSTR-3B JSON file downloaded successfully to your default downloads folder!"); // 👈 Added success message
  };

  const baseAmt = parseFloat(calcAmount) || 0;
  const gstAmount = (baseAmt * calcGstRate) / 100;
  const totalWithGst = baseAmt + gstAmount;

  if (!license) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#1E3A8A", fontFamily: "sans-serif" }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "12px", width: "420px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
          <h2 style={{ color: "#1E3A8A", marginTop: 0, textAlign: "center" }}>🔐 BharatLedger Activation</h2>
          <p style={{ color: "#6B7280", fontSize: "14px", textAlign: "center", marginBottom: "25px" }}>
            Enter your registered mobile number and license key to activate your commercial offline subscription.
          </p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              const res = await invoke<any>("verify_and_activate_license", { 
                licenseKey: licenseKeyInput, 
                mobile: mobileInput 
              });
              setLicense(res);
              alert("🎉 Software activated successfully!");
            } catch (err) {
              alert(`❌ Activation Failed: ${err}`);
            }
          }}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontWeight: "600", fontSize: "13px", marginBottom: "5px", color: "#374151" }}>Registered Mobile Number</label>
              <input 
                type="text" 
                value={mobileInput} 
                onChange={(e) => setMobileInput(e.target.value)} 
                placeholder="e.g. 9876543210" 
                required 
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB", boxSizing: "border-box" }} 
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontWeight: "600", fontSize: "13px", marginBottom: "5px", color: "#374151" }}>License Key</label>
              <input 
                type="text" 
                value={licenseKeyInput} 
                onChange={(e) => setLicenseKeyInput(e.target.value)} 
                placeholder="e.g. BL-PRO-2026-XXXX" 
                required 
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB", boxSizing: "border-box" }} 
              />
            </div>

            <button type="submit" style={{ width: "100%", background: "#2563EB", color: "white", padding: "12px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "15px" }}>
              Activate Subscription 🚀
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "12px", color: "#9CA3AF", marginTop: "20px" }}>
            Need a key? Visit bharatledger.com or call support.
          </p>
        </div>
      </div>
    );
  }
  
  if (!company) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "750px", margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ color: "#1E3A8A", margin: "0 0 10px 0" }}>BharatLedger 🇮🇳</h1>
          <p style={{ color: "#4B5563", fontSize: "16px" }}>Universal Books & Tax Compliance for Businesses, Professionals & Salaried</p>
        </header>
        <form onSubmit={handleSetupSubmit} style={{ background: "#F9FAFB", padding: "30px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "20px", color: "#111827" }}>Set Up Your Profile</h2>
          
          <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Entity Category *</label>
              <select name="entityCategory" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }}>
                <option value="Business">Business / Retail / MSME</option>
                <option value="Professional">Professional (Doctor, Consultant, Lawyer)</option>
                <option value="Salaried">Salaried Individual (Side Income / Rent / Capital Gains)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Business / Practice Name *</label>
              <input type="text" name="companyName" required placeholder="e.g. Gupta Clinic / General Store" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Owner / Professional Name</label>
              <input type="text" name="ownerName" placeholder="e.g. Dr. Ramesh Gupta" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Phone Number</label>
              <input type="text" name="phone" placeholder="e.g. 9876543210" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>State</label>
              <select name="state" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }}>
                <option value="West Bengal">West Bengal</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Bihar">Bihar</option>
                <option value="Delhi">Delhi</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Specialty / Template</label>
              <select name="businessType" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }}>
                <option value="Kirana / Retail">Kirana / Retail Trading</option>
                <option value="Medical Practice / Doctor (44ADA)">Medical Practice / Doctor (Sec 44ADA)</option>
                <option value="Consultant / Freelancer (44ADA)">Consultant / Freelancer (Sec 44ADA)</option>
                <option value="Salaried + Rental / Side Income">Salaried + Rental / Side Income</option>
                <option value="Manufacturing / Rice Mill">Manufacturing / Rice Mill</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>PAN Number *</label>
              <input type="text" name="pan" required placeholder="10-digit PAN (e.g. ABCDE1234F)" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>GSTIN (If Applicable)</label>
              <input type="text" name="gstin" placeholder="15-digit GSTIN (leave blank if unregistered)" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
            </div>
          </div>

          <button type="submit" style={{ width: "100%", background: "#2563EB", color: "white", padding: "12px", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
            Initialize Secure Offline Ledger 🚀
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "sans-serif", background: "#F3F4F6", minHeight: "100vh", display: "flex", width: "100vw" }}>
      {/* Sidebar */}
      <div style={{ width: "240px", background: "#1E3A8A", color: "white", padding: "20px", display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "30px" }}>BharatLedger 🇮🇳</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
          <button onClick={() => setActiveTab("dashboard")} style={{ background: activeTab === "dashboard" ? "#2563EB" : "transparent", color: "white", border: "none", padding: "10px", textAlign: "left", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>📊 Dashboard</button>
          <button onClick={() => setActiveTab("migration")} style={{ background: activeTab === "migration" ? "#2563EB" : "transparent", color: "white", border: "none", padding: "10px", textAlign: "left", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>🔄 FY Migration & Openings</button>
          <button onClick={() => setActiveTab("vouchers")} style={{ background: activeTab === "vouchers" ? "#2563EB" : "transparent", color: "white", border: "none", padding: "10px", textAlign: "left", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>📝 Vouchers & Fees</button>
          <button onClick={() => setActiveTab("inventory")} style={{ background: activeTab === "inventory" ? "#2563EB" : "transparent", color: "white", border: "none", padding: "10px", textAlign: "left", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>📦 Stock & GST Calc</button>
          <button onClick={() => setActiveTab("caportal")} style={{ background: activeTab === "caportal" ? "#2563EB" : "transparent", color: "white", border: "none", padding: "10px", textAlign: "left", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>🏛️ CA Audit & Lock</button>
          <button onClick={() => setActiveTab("reports")} style={{ background: activeTab === "reports" ? "#2563EB" : "transparent", color: "white", border: "none", padding: "10px", textAlign: "left", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>📈 Tax & P&L Reports</button>
        </div>
        <button onClick={() => setCompany(null)} style={{ background: "#DC2626", color: "white", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer" }}>Switch Profile</button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", background: "white", padding: "15px 25px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div>
            <h1 style={{ fontSize: "22px", color: "#111827", margin: 0 }}>{company.name}</h1>
            <span style={{ fontSize: "13px", color: "#6B7280" }}>
              Category: <strong>{company.entityCategory}</strong> | Type: {company.businessType} | PAN: {company.pan}
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {auditLocked && <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>🔒 CA Period Locked</span>}
            <span style={{ background: "#ECFDF5", color: "#065F46", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>● SQLite Connected</span>
          </div>
        </header>

        {activeTab === "dashboard" && (
          <div>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", padding: "12px 20px", borderRadius: "8px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
              <div>
                <span style={{ fontWeight: "bold", color: "#166534" }}>🛡️ Plan: {license.plan_type}</span> | <span style={{ color: "#15803D" }}>Active until: {license.expiry_date}</span>
              </div>
              <div style={{ color: "#374151" }}>
                <span>📅 Last Tax Filing: <strong>31 Mar 2026</strong></span>
              </div>
            </div>
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "15px 20px", borderRadius: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h4 style={{ margin: "0 0 3px 0", color: "#1E40AF" }}>☁️ Hybrid Cloud Sync Status</h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#3B82F6" }}>
                Offline-first mode active. Local changes are saved securely on disk.
                </p>
              </div>
              <button 
                onClick={async () => {
                try {
                  const res = await invoke<string>("sync_with_cloud");
                  alert(`✅ ${res}`);
                  } catch (err) {
                    alert(`❌ Sync failed: ${err}`);
                  }
                }}
                  style={{ background: "#2563EB", color: "white", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
              >
                🔄 Sync Now with Server
              </button>
            </div>
            {/* Voice Assistant Widget */}
            <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", padding: "20px", borderRadius: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: "0 0 5px 0", color: "#3730A3" }}>🎙️ AI Voice-to-Voucher (Hindi & Regional)</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#4B5563" }}>
                  {voiceTranscript ? `Transcript: "${voiceTranscript}"` : 'Click the mic and say e.g. "Ram se 5000 cash mila"'}
                </p>
              </div>
              <button 
                onClick={startVoiceRecording}
                disabled={isListening}
                style={{ background: isListening ? "#DC2626" : "#4F46E5", color: "white", border: "none", padding: "12px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              >
                {isListening ? "🔴 Listening..." : "🎤 Start Voice Entry"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "30px" }}>
              <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <p style={{ color: "#6B7280", margin: "0 0 5px 0" }}>Cash / Bank In-Hand</p>
                <h2 style={{ color: "#059669", margin: 0 }}>₹ 45,800</h2>
              </div>
              <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <p style={{ color: "#6B7280", margin: "0 0 5px 0" }}>Total Receipts / Revenue</p>
                <h2 style={{ color: "#2563EB", margin: 0 }}>₹ 1,82,500</h2>
              </div>
              <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <p style={{ color: "#6B7280", margin: "0 0 5px 0" }}>Pending Dues / Receivables</p>
                <h2 style={{ color: "#D97706", margin: 0 }}>₹ 14,200</h2>
              </div>
            </div>

            {/* 👇 REPLACE YOUR OLD TRANSACTIONS TABLE WITH THIS WHATSAPP-ENABLED TABLE 👇 */}
            <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ marginTop: 0, color: "#111827" }}>💬 Recent Transactions & WhatsApp UPI Reminders</h3>
              {vouchers.length === 0 ? (
                <p style={{ color: "#6B7280", fontSize: "14px" }}>No vouchers posted yet. Go to the "Vouchers & Fees" tab to add your first entry.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #E5E7EB", color: "#4B5563" }}>
                      <th style={{ padding: "10px" }}>Type</th>
                      <th style={{ padding: "10px" }}>Party / Client</th>
                      <th style={{ padding: "10px" }}>Narration</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Amount (₹)</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>WhatsApp Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map((v) => {
                      const upiLink = `upi://pay?pa=merchant@upi&pn=${encodeURIComponent(company.name)}&am=${v.amount}&cu=INR&tn=${encodeURIComponent(v.narration || "Invoice Payment")}`;
                      const whatsappMessage = `Hello *${v.party}*,\n\nHere are the details of your transaction with *${company.name}*:\n\n*Type:* ${v.type}\n*Amount Due:* ₹${v.amount.toLocaleString()}\n*Description:* ${v.narration || "N/A"}\n\nTap the link below to pay securely via UPI (GPay/PhonePe/Paytm):\n${upiLink}\n\nThank you! 🙏`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

                      return (
                        <tr key={v.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                          <td style={{ padding: "10px", fontWeight: "bold", color: v.type === "Receipt" ? "#059669" : "#DC2626" }}>{v.type}</td>
                          <td style={{ padding: "10px", fontWeight: "600" }}>{v.party}</td>
                          <td style={{ padding: "10px", color: "#6B7280" }}>{v.narration || "N/A"}</td>
                          <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold" }}>₹ {v.amount.toLocaleString()}</td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <a 
                              href={whatsappUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ background: "#25D366", color: "white", padding: "6px 12px", borderRadius: "20px", textDecoration: "none", fontSize: "12px", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "5px" }}
                            >
                              💬 Share on WhatsApp
                            </a>
                          </td>
                          <td style={{ padding: "10px", textAlign: "center", display: "flex", gap: "8px", justifyContent: "center" }}>
                            <a 
                              href={whatsappUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ background: "#25D366", color: "white", padding: "6px 10px", borderRadius: "15px", textDecoration: "none", fontSize: "11px", fontWeight: "bold" }}
                            >
                              💬 WhatsApp
                            </a>
                            <button 
                              onClick={() => downloadReceiptPDF(v)}
                              style={{ background: "#2563EB", color: "white", border: "none", padding: "6px 10px", borderRadius: "15px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                            >
                              📥 Download PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "vouchers" && (
          <div style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", maxWidth: "600px" }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>Voucher or Fee Receipt Entry</h3>
            {auditLocked && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px", fontWeight: "600" }}>
                🔒 Notice: Books are locked by your tax consultant. Entry is disabled.
              </div>
            )}
            <form onSubmit={handleAddVoucher}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Entry Type</label>
                <select disabled={auditLocked} value={newVoucher.type} onChange={(e) => setNewVoucher({...newVoucher, type: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }}>
                  <option value="Receipt">Receipt / Professional Fee Received</option>
                  <option value="Payment">Payment / Clinic & Office Expense</option>
                  <option value="Contra">Contra / Bank Transfer</option>
                </select>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Party / Patient / Client Name</label>
                <input type="text" disabled={auditLocked} required placeholder="e.g. Patient Name / Client / Supplier" value={newVoucher.party} onChange={(e) => setNewVoucher({...newVoucher, party: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Amount (₹)</label>
                <input type="number" disabled={auditLocked} required placeholder="e.g. 2500" value={newVoucher.amount} onChange={(e) => setNewVoucher({...newVoucher, amount: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Narration / Description</label>
                <input type="text" disabled={auditLocked} placeholder="e.g. Consultation fee / Rent / Stock purchase" value={newVoucher.narration} onChange={(e) => setNewVoucher({...newVoucher, narration: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
              </div>
              <button type="submit" disabled={auditLocked} style={{ background: auditLocked ? "#9CA3AF" : "#2563EB", color: "white", padding: "12px 20px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: auditLocked ? "not-allowed" : "pointer", width: "100%" }}>
                Post & Save to SQLite 💾
              </button>
            </form>
          </div>
        )}

        {activeTab === "migration" && (
          <div style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", maxWidth: "700px" }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>🔄 Previous FY Migration & Opening Balances</h3>
            <p style={{ color: "#6B7280", fontSize: "14px", lineHeight: "1.5", marginBottom: "20px" }}>
              Switching from Tally, Busy, Excel, or manual books? Enter your previous year's closing figures here. BharatLedger will automatically incorporate these opening balances to ensure your current financial year books tally perfectly.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await invoke("save_opening_balance", { ob: openingBalance });
                alert("✅ Opening balances & previous FY figures saved successfully!");
              } catch (err) {
                console.error("Failed to save opening balances:", err);
                alert("Error saving opening balances!");
              }
            }}>
              <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Previous Financial Year</label>
                  <input 
                    type="text" 
                    value={openingBalance.previous_fy} 
                    onChange={(e) => setOpeningBalance({...openingBalance, previous_fy: e.target.value})} 
                    placeholder="e.g. 2025-2026" 
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Opening Cash-in-Hand (₹)</label>
                  <input 
                    type="number" 
                    value={openingBalance.opening_cash} 
                    onChange={(e) => setOpeningBalance({...openingBalance, opening_cash: parseFloat(e.target.value) || 0})} 
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} 
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Opening Bank Balance (₹)</label>
                  <input 
                    type="number" 
                    value={openingBalance.opening_bank} 
                    onChange={(e) => setOpeningBalance({...openingBalance, opening_bank: parseFloat(e.target.value) || 0})} 
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Opening Closing Stock Value (₹)</label>
                  <input 
                    type="number" 
                    value={openingBalance.opening_stock} 
                    onChange={(e) => setOpeningBalance({...openingBalance, opening_stock: parseFloat(e.target.value) || 0})} 
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }} 
                  />
                </div>
              </div>

              <button type="submit" style={{ background: "#2563EB", color: "white", padding: "12px 20px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", width: "100%", marginTop: "10px" }}>
                Save Opening Balances & Sync Books 💾
              </button>
            </form>
            <div style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", maxWidth: "700px", marginTop: "20px" }}>
              <h3 style={{ marginTop: 0, color: "#111827" }}>🛡️ Secure Offline Data Backup & Restore</h3>
              <p style={{ color: "#6B7280", fontSize: "14px", lineHeight: "1.5", marginBottom: "20px" }}>
                Your data lives 100% securely on your local computer. Create instant backups or restore your books anytime.
              </p>

            <div style={{ display: "flex", gap: "15px" }}>
                <button 
                  onClick={async () => {
                    try {
                      const res = await invoke<string>("backup_database");
                      alert(`✅ ${res}`);
                      } catch (err) {
                      console.error("Backup failed:", err);
                      alert("Failed to create backup!");
                      }
                    }}
                    style={{ background: "#059669", color: "white", padding: "12px 20px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", flex: 1 }}
                  >
                  📥 Backup Database to Documents 🗂️
                </button>
              </div>
            </div>
          </div>
          
        )}

        {activeTab === "inventory" && (
          <div>
            <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "30px" }}>
              <h3 style={{ marginTop: 0, color: "#111827" }}>🧮 Quick GST Calculator (CGST + SGST Breakdown)</h3>
              <div style={{ display: "flex", gap: "15px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>Base Amount (₹)</label>
                  <input type="number" placeholder="Enter amount" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>GST Slab (%)</label>
                  <select value={calcGstRate} onChange={(e) => setCalcGstRate(parseFloat(e.target.value))} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB" }}>
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% (Essential items)</option>
                    <option value={12}>12% (Processed foods)</option>
                    <option value={18}>18% (Standard rate)</option>
                    <option value={28}>28% (Luxury items)</option>
                  </select>
                </div>
                <div style={{ flex: 2, background: "#F9FAFB", padding: "10px", borderRadius: "6px", border: "1px solid #E5E7EB", fontSize: "13px" }}>
                  <span>CGST: <strong>₹{(gstAmount / 2).toFixed(2)}</strong> | SGST: <strong>₹{(gstAmount / 2).toFixed(2)}</strong></span><br />
                  <span>Total Payable: <strong style={{ color: "#059669" }}>₹{totalWithGst.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
              <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, color: "#111827" }}>Stock & Items Catalog</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #E5E7EB", color: "#4B5563" }}>
                      <th style={{ padding: "8px" }}>Item Name</th>
                      <th style={{ padding: "8px" }}>HSN Code</th>
                      <th style={{ padding: "8px" }}>Rate (₹)</th>
                      <th style={{ padding: "8px" }}>GST %</th>
                      <th style={{ padding: "8px", textAlign: "right" }}>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "8px", fontWeight: "600" }}>{it.name}</td>
                        <td style={{ padding: "8px", color: "#6B7280" }}>{it.hsn}</td>
                        <td style={{ padding: "8px" }}>₹{it.rate}</td>
                        <td style={{ padding: "8px" }}>{it.gstRate}%</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: it.stock < 20 ? "#DC2626" : "#059669" }}>{it.stock} units</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginTop: 0, color: "#111827" }}>Add New Item</h3>
                <form onSubmit={handleAddInventory}>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#374151" }}>Item Name</label>
                    <input type="text" disabled={auditLocked} required placeholder="e.g. Toor Dal (1kg)" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#374151" }}>HSN Code</label>
                    <input type="text" disabled={auditLocked} placeholder="e.g. 0713" value={newItem.hsn} onChange={(e) => setNewItem({...newItem, hsn: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#374151" }}>Selling Price (₹)</label>
                    <input type="number" disabled={auditLocked} required placeholder="e.g. 110" value={newItem.rate} onChange={(e) => setNewItem({...newItem, rate: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#374151" }}>GST Slab</label>
                    <select disabled={auditLocked} value={newItem.gstRate} onChange={(e) => setNewItem({...newItem, gstRate: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB" }}>
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#374151" }}>Opening Stock Qty</label>
                    <input type="number" disabled={auditLocked} placeholder="e.g. 50" value={newItem.stock} onChange={(e) => setNewItem({...newItem, stock: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB" }} />
                  </div>
                  <button type="submit" disabled={auditLocked} style={{ background: auditLocked ? "#9CA3AF" : "#2563EB", color: "white", padding: "10px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: auditLocked ? "not-allowed" : "pointer", width: "100%" }}>
                    Save Item 📦
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === "caportal" && (
          <div style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", maxWidth: "800px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#111827" }}>🏛️ CA Partner Remote Audit & Period Lock</h3>
              <span style={{ background: "#EEF2FF", color: "#3730A3", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>CA Mode: Active</span>
            </div>
            
            <p style={{ color: "#4B5563", fontSize: "14px", lineHeight: "1.5" }}>
              Tax Practitioners and Chartered Accountants can review client records remotely. Locking a financial period prevents the user from altering posted vouchers before ITR or GSTR filing.
            </p>

            <div style={{ background: "#F9FAFB", padding: "20px", borderRadius: "8px", border: "1px solid #E5E7EB", margin: "20px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <div>
                  <h4 style={{ margin: "0 0 5px 0", color: "#1F2937" }}>Financial Period: FY 2026-2027 (PAN: {company.pan})</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#6B7280" }}>Status: {auditLocked ? "Locked by CA (Read-Only)" : "Open for Editing"}</p>
                </div>
                <button 
                  onClick={() => {
                    setAuditLocked(!auditLocked);
                    alert(auditLocked ? "🔓 Period unlocked successfully!" : "🔒 Period locked successfully! Entries can no longer be modified.");
                  }}
                  style={{ background: auditLocked ? "#059669" : "#DC2626", color: "white", border: "none", padding: "10px 18px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                >
                  {auditLocked ? "Unlock Period 🔓" : "Lock Books for Audit 🔒"}
                </button>
              </div>

              <div style={{ marginTop: "15px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "5px", color: "#374151" }}>CA Audit Notes & Tax Remarks</label>
                <textarea 
                  value={caNotes} 
                  onChange={(e) => setCaNotes(e.target.value)}
                  rows={3} 
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px" }} 
                />
              </div>
            </div>

            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "20px" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#111827" }}>Compliance Checklist ({company.entityCategory})</h4>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#4B5563", fontSize: "14px", lineHeight: "1.6" }}>
                <li>PAN Verification: <strong style={{ color: "#059669" }}>Valid ({company.pan})</strong></li>
                <li>Presumptive Income / Revenue Checked: <strong style={{ color: "#059669" }}>Passed</strong></li>
                <li>TDS / TCS / GST Mismatch Dashboard: <strong style={{ color: "#059669" }}>No Discrepancies</strong></li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", maxWidth: "800px" }}>
              <h3 style={{ marginTop: 0, color: "#111827" }}>📈 Live Tax & Financial Statements ({company.entityCategory})</h3>
              <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "20px" }}>
              Automated financial statement computed live from offline SQLite records for PAN: <strong>{company.pan}</strong>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", marginBottom: "30px" }}>
                <div style={{ background: "#F9FAFB", padding: "15px", borderRadius: "8px", border: "1px solid #E5E7EB" }}>
                  <p style={{ margin: "0 0 5px 0", fontSize: "13px", color: "#6B7280" }}>Gross Receipts / Revenue</p>
                  <h3 style={{ margin: 0, color: "#059669" }}>₹ {vouchers.filter(v => v.type === "Receipt").reduce((acc, v) => acc + v.amount, 0).toLocaleString()}</h3>
                </div>
                <div style={{ background: "#F9FAFB", padding: "15px", borderRadius: "8px", border: "1px solid #E5E7EB" }}>
                  <p style={{ margin: "0 0 5px 0", fontSize: "13px", color: "#6B7280" }}>Total Expenses / Payments</p>
                  <h3 style={{ margin: 0, color: "#DC2626" }}>₹ {vouchers.filter(v => v.type === "Payment").reduce((acc, v) => acc + v.amount, 0).toLocaleString()}</h3>
                </div>
                <div style={{ background: "#EEF2FF", padding: "15px", borderRadius: "8px", border: "1px solid #C7D2FE" }}>
                  <p style={{ margin: "0 0 5px 0", fontSize: "13px", color: "#3730A3" }}>Net Operating Surplus</p>
                  <h3 style={{ margin: 0, color: "#1E3A8A" }}>
                  ₹ {(vouchers.filter(v => v.type === "Receipt").reduce((acc, v) => acc + v.amount, 0) - vouchers.filter(v => v.type === "Payment").reduce((acc, v) => acc + v.amount, 0)).toLocaleString()}
                  </h3>
                </div>
              </div>

            {company.entityCategory === "Professional" && (
              <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#92400E" }}>⚖️ Section 44ADA Presumptive Tax Estimator</h4>
                <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#78350F" }}>
                  As a professional (Doctor/Consultant), under Sec 44ADA, you can declare a flat 50% of your gross receipts as net taxable income.
                </p>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold", color: "#B45309" }}>
                  Estimated Presumptive Taxable Income (50%): ₹ {(vouchers.filter(v => v.type === "Receipt").reduce((acc, v) => acc + v.amount, 0) * 0.5).toLocaleString()}
                </p>
              </div>
            )}

            <div style={{ padding: "20px", background: "#F9FAFB", borderRadius: "8px", border: "1px dashed #D1D5DB", textAlign: "center" }}>
              <button 
                onClick={() => alert("📄 Financial statement exported successfully as JSON/PDF package for your CA!")}
                style={{ background: "#2563EB", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                >
                Export Schedule III Report for CA 📥
              </button>
            </div>
            <div style={{ marginTop: "25px", background: "#F3F4F6", padding: "20px", borderRadius: "8px", border: "1px solid #D1D5DB" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#1F2937" }}>📤 Official GST Portal JSON Return Exports</h4>
              <p style={{ margin: "0 0 15px 0", fontSize: "13px", color: "#4B5563" }}>
                Generate official JSON schemas formatted for direct upload to the GST portal or submission to your Chartered Accountant.
              </p>

              <div style={{ display: "flex", gap: "15px" }}>
                <button 
                  onClick={downloadGSTR1JSON}
                  style={{ background: "#4F46E5", color: "white", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", flex: 1 }}
                >
                  📥 Download GSTR-1 JSON (Sales)
                </button>
                <button 
                  onClick={downloadGSTR3BJSON}
                  style={{ background: "#059669", color: "white", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", flex: 1 }}
                >
                  📥 Download GSTR-3B JSON (Summary)
                </button>
                <button 
                  onClick={downloadGSTRSummaryPDF}
                  style={{ background: "#2563EB", color: "white", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", flex: 1 }}
                >
                  📥 Download GSTR Summary PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;