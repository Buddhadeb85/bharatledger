// api/verify.js - Vercel Serverless Function for License Validation
export default function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { license_key, mobile } = req.body;

  // Mock database of active client licenses (You can replace or link this to MongoDB, Supabase, or PostgreSQL later)
  const validLicenses = {
    "BL-PRO-2026-9999": { 
      mobile: "9876543210", 
      plan: "Professional / Doctor", 
      expiry: "2027-03-31" 
    }
  };

  const clientRecord = validLicenses[license_key];

  // Validate key existence and matching mobile number
  if (!clientRecord || clientRecord.mobile !== mobile) {
    return res.status(401).json({ 
      success: false, 
      message: "Invalid license key or mobile number." 
    });
  }

  // Check if license has expired
  if (new Date(clientRecord.expiry) < new Date()) {
    return res.status(403).json({ 
      success: false, 
      message: "Your subscription has expired. Please renew." 
    });
  }

  // Success response sent back to your desktop app
  return res.status(200).json({
    success: true,
    plan_type: clientRecord.plan,
    expiry_date: clientRecord.expiry
  });
}