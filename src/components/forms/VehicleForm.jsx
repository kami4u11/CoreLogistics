import React, { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "sonner";

function VehicleForm({ vehicle, onSubmit, onCancel, isSubmitting }) {
  const [form, setForm] = useState(vehicle || {
    vehicle_number: "", vehicle_type: "truck", capacity_tons: "",
    driver_name: "", driver_phone: "", owner_name: "",
    insurance_expiry: "", fitness_expiry: "", status: "available", notes: ""
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.vehicle_number?.trim()) {
      newErrors.vehicle_number = "Vehicle number is required";
    } else if (form.vehicle_number.length < 3) {
      newErrors.vehicle_number = "Vehicle number too short";
    }
    
    if (form.capacity_tons && (form.capacity_tons < 0.1 || form.capacity_tons > 100)) {
      newErrors.capacity_tons = "Capacity must be between 0.1 and 100 tons";
    }
    
    if (form.driver_phone && !/^[0-9+\-\s]{10,15}$/.test(form.driver_phone)) {
      newErrors.driver_phone = "Invalid phone number format";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{vehicle ? "Edit Vehicle" : "New Vehicle"}</h2>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vehicle Number *</Label>
              <Input 
                value={form.vehicle_number} 
                onChange={(e) => handleChange("vehicle_number", e.target.value)} 
                required 
                className={`rounded-xl ${errors.vehicle_number ? 'border-red-500' : ''}`} 
                placeholder="MH 12 AB 1234" 
              />
              {errors.vehicle_number && (
                <p className="text-xs text-red-500">{errors.vehicle_number}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.vehicle_type} onValueChange={(v) => handleChange("vehicle_type", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="trailer">Trailer</SelectItem>
                  <SelectItem value="tanker">Tanker</SelectItem>
                  <SelectItem value="container">Container</SelectItem>
                  <SelectItem value="mini_truck">Mini Truck</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label>Capacity (Tons)</Label>
            <Input 
              type="number" 
              step="0.5" 
              value={form.capacity_tons} 
              onChange={(e) => handleChange("capacity_tons", parseFloat(e.target.value) || "")} 
              className={`rounded-xl ${errors.capacity_tons ? 'border-red-500' : ''}`} 
            />
            {errors.capacity_tons && (
              <p className="text-xs text-red-500">{errors.capacity_tons}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Driver Name</Label>
              <Input 
                value={form.driver_name} 
                onChange={(e) => handleChange("driver_name", e.target.value)} 
                className="rounded-xl" 
              />
            </div>
            <div className="space-y-1.5">
              <Label>Driver Phone</Label>
              <Input 
                value={form.driver_phone} 
                onChange={(e) => handleChange("driver_phone", e.target.value)} 
                className={`rounded-xl ${errors.driver_phone ? 'border-red-500' : ''}`} 
              />
              {errors.driver_phone && (
                <p className="text-xs text-red-500">{errors.driver_phone}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label>Owner Name</Label>
            <Input 
              value={form.owner_name} 
              onChange={(e) => handleChange("owner_name", e.target.value)} 
              className="rounded-xl" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Insurance Expiry</Label>
              <Input 
                type="date" 
                value={form.insurance_expiry} 
                onChange={(e) => handleChange("insurance_expiry", e.target.value)} 
                className="rounded-xl" 
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fitness Expiry</Label>
              <Input 
                type="date" 
                value={form.fitness_expiry} 
                onChange={(e) => handleChange("fitness_expiry", e.target.value)} 
                className="rounded-xl" 
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea 
              value={form.notes} 
              onChange={(e) => handleChange("notes", e.target.value)} 
              className="rounded-xl" 
              rows={2} 
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800"
            >
              {isSubmitting ? "Saving..." : "Save Vehicle"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default memo(VehicleForm);
