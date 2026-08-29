import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69995a1b4cc6b3863e378752/2cf5e616c_pvt_ltd_logo1-removebg-preview.png";

export default function RequestAccess() {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const existing = await base44.entities.SignupRequest.filter({ email: form.email });
    if (existing.length > 0) {
      setError("A request with this email already exists. Please contact the admin.");
      setSubmitting(false);
      return;
    }
    await base44.entities.SignupRequest.create({ ...form, status: "pending" });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-slate-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Request Sent!</h2>
          <p className="text-sm text-slate-500">Your access request has been submitted. The admin will review it and you'll receive an email invitation once approved.</p>
          <button onClick={() => base44.auth.redirectToLogin()} className="mt-5 text-sm text-blue-600 font-medium">← Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <img src={LOGO} alt="Saifran" className="h-10 w-auto" />
          <div>
            <h1 className="text-base font-bold text-slate-900">Saifran Logistics</h1>
            <p className="text-xs text-slate-400">Request Access</p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-1">Request an Account</h2>
        <p className="text-xs text-slate-500 mb-5">Fill in your details. The admin will review your request and send you an email invitation.</p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Email Address *</Label>
            <Input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+92 300 000 0000" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Reason for Access</Label>
            <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Operations staff, Accounts dept" className="rounded-xl" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900">
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
          <button type="button" onClick={() => base44.auth.redirectToLogin()} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Already have an account? Log in →
          </button>
        </form>
      </div>
    </div>
  );
}