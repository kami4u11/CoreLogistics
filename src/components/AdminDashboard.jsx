import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Users, UserPlus, Trash2, Edit2, CheckCircle, XCircle, 
  Search, Filter, RefreshCw, ChevronDown, Shield, 
  Mail, User, Phone, Calendar, MoreVertical, Eye, EyeOff 
} from "lucide-react";

// Role configuration with colors and labels
const ROLE_CONFIG = {
  admin: { label: "Administrator", color: "bg-red-100 text-red-700 border-red-200", icon: Shield },
  management: { label: "Management", color: "bg-purple-100 text-purple-700 border-purple-200", icon: User },
  operations: { label: "Operations", color: "bg-blue-100 text-blue-700 border-blue-200", icon: User },
  accounting: { label: "Accounting", color: "bg-green-100 text-green-700 border-green-200", icon: User },
  fleet_manager: { label: "Fleet Manager", color: "bg-orange-100 text-orange-700 border-orange-200", icon: User },
  supervisor: { label: "Supervisor", color: "bg-teal-100 text-teal-700 border-teal-200", icon: User },
  driver: { label: "Driver", color: "bg-amber-100 text-amber-700 border-amber-200", icon: User },
  labour_supervisor: { label: "Labour Supervisor", color: "bg-pink-100 text-pink-700 border-pink-200", icon: User },
  client: { label: "Client", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: User },
  user: { label: "Pending User", color: "bg-slate-100 text-slate-600 border-slate-200", icon: User },
  sleeping_partner: { label: "Sleeping Partner", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: User },
};

export default function AdminDashboard() {
  // State management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // for password visibility toggle

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "user",
    phone: "",
    assigned_vehicle_id: "",
    password: "", // only used when creating a new user
  });

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch users function
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try multiple methods to fetch users
      let userList = [];
      
      // Method 1: Try base44 auth list if available
      if (base44.auth?.list) {
        userList = await base44.auth.list();
      } 
      // Method 2: Try User entity
      else if (base44.entities?.User) {
        userList = await base44.entities.User.list();
      }
      // Method 3: Try users endpoint
      else {
        const response = await base44.api?.get?.("/users") || [];
        userList = response.data || response || [];
      }
      
      setUsers(Array.isArray(userList) ? userList : []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load users. Please try again.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        (u.email?.toLowerCase().includes(term)) ||
        (u.full_name?.toLowerCase().includes(term)) ||
        (u.phone?.toLowerCase().includes(term))
      );
    }
    
    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(u => u.role === roleFilter);
    }
    
    // Sort by created date (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.created_date ? new Date(a.created_date) : new Date(0);
      const dateB = b.created_date ? new Date(b.created_date) : new Date(0);
      return dateB - dateA;
    });
  }, [users, searchTerm, roleFilter]);

  // Get unique roles for filter
  const availableRoles = useMemo(() => {
    const roles = new Set(users.map(u => u.role).filter(Boolean));
    return Array.from(roles).sort();
  }, [users]);

  // Handle form submit
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Prepare payload – exclude password for updates
      const payload = { ...formData };
      if (editingUser) {
        delete payload.password; // never send password on update
      }
      
      if (editingUser) {
        // Update existing user
        if (base44.entities?.User?.update) {
          await base44.entities.User.update(editingUser.id, payload);
        } else if (base44.auth?.update) {
          await base44.auth.update(editingUser.id, payload);
        } else {
          throw new Error("No update method available");
        }
      } else {
        // Create new user – password is required for signUp
        if (base44.auth?.signUp) {
          if (!payload.password) throw new Error("Password is required for new users");
          await base44.auth.signUp(payload);
        } else if (base44.entities?.User?.create) {
          // If using entities, password may be optional – send it if present
          await base44.entities.User.create(payload);
        } else {
          throw new Error("No create method available");
        }
      }
      
      // Reset form and close modal
      setShowAddModal(false);
      setEditingUser(null);
      setFormData({
        email: "",
        full_name: "",
        role: "user",
        phone: "",
        assigned_vehicle_id: "",
        password: "",
      });
      
      // Refresh user list
      await fetchUsers();
      
    } catch (err) {
      console.error("Error saving user:", err);
      alert("Error: " + (err.message || "Failed to save user"));
    } finally {
      setSubmitting(false);
    }
  }, [editingUser, formData, fetchUsers]);

  // Handle delete user
  const handleDelete = useCallback(async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    
    try {
      setLoading(true);
      
      if (base44.entities?.User?.delete) {
        await base44.entities.User.delete(userId);
      } else if (base44.auth?.delete) {
        await base44.auth.delete(userId);
      } else {
        throw new Error("No delete method available");
      }
      
      await fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Error: " + (err.message || "Failed to delete user"));
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  // Open edit modal
  const handleEdit = useCallback((user) => {
    setEditingUser(user);
    setFormData({
      email: user.email || "",
      full_name: user.full_name || "",
      role: user.role || "user",
      phone: user.phone || "",
      assigned_vehicle_id: user.assigned_vehicle_id || "",
      password: "", // password field is hidden for edit
    });
    setShowAddModal(true);
  }, []);

  // Open add modal
  const handleAddNew = useCallback(() => {
    setEditingUser(null);
    setFormData({
      email: "",
      full_name: "",
      role: "user",
      phone: "",
      assigned_vehicle_id: "",
      password: "",
    });
    setShowAddModal(true);
  }, []);

  // Get role badge component
  const RoleBadge = useCallback(({ role }) => {
    const config = ROLE_CONFIG[role] || ROLE_CONFIG.user;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }, []);

  // Loading state
  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading users...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-slate-600 mb-4">{error}</p>
        <button 
          onClick={fetchUsers}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">User Management</h3>
          <p className="text-sm text-slate-500">{filteredUsers.length} of {users.length} users</p>
        </div>
        <button
          onClick={handleAddNew}
          disabled={submitting}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Roles</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>
                {(ROLE_CONFIG[role]?.label || role)}
              </option>
            ))}
          </select>
          
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-2">No users found</p>
          {searchTerm || roleFilter !== "all" ? (
            <button
              onClick={() => {
                setSearchTerm("");
                setRoleFilter("all");
              }}
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={handleAddNew}
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              Add your first user
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(user => (
            <div 
              key={user.id} 
              className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900 truncate">
                        {user.full_name || "Unnamed User"}
                      </h4>
                      <RoleBadge role={user.role} />
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {user.email}
                      </span>
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {user.phone}
                        </span>
                      )}
                      {user.created_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(user.created_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    {user.assigned_vehicle_id && (
                      <p className="text-xs text-slate-400 mt-1">
                        Assigned Vehicle: {user.assigned_vehicle_id}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? "Edit User" : "Add New User"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                  disabled={!!editingUser}
                />
                {editingUser && (
                  <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              {/* Password field – only for new users */}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Minimum 6 characters</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {Object.entries(ROLE_CONFIG).map(([value, config]) => (
                    <option key={value} value={value}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+92 300 1234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Assigned Vehicle ID
                </label>
                <input
                  type="text"
                  value={formData.assigned_vehicle_id}
                  onChange={(e) => setFormData({ ...formData, assigned_vehicle_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Vehicle ID (for drivers)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingUser ? "Update User" : "Create User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}