"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Users,
  Plus,
  Mail,
  Phone,
  Shield,
  Calendar,
  Layers,
  IndianRupee,
  Edit2,
  ExternalLink,
  CheckCircle2,
  X,
  Compass,
} from "lucide-react";
import {
  ProjectMaster,
  ProjectStaffMember,
  StaffRole,
  DEFAULT_PROJECT_MASTER,
  DEFAULT_PROJECT_STAFF,
} from "@/lib/project-lifecycle";

interface ProjectSetupMemberAssignmentProps {
  className?: string;
}

export default function ProjectSetupMemberAssignment({
  className = "",
}: ProjectSetupMemberAssignmentProps) {
  const [project, setProject] = useState<ProjectMaster>(DEFAULT_PROJECT_MASTER);
  const [staff, setStaff] = useState<ProjectStaffMember[]>(DEFAULT_PROJECT_STAFF);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load persisted project master on mount
  useEffect(() => {
    try {
      const savedMaster = localStorage.getItem("ostaad_project_master");
      if (savedMaster) {
        setProject(JSON.parse(savedMaster));
      } else {
        const savedName = localStorage.getItem("ostaad_operations_project_name");
        if (savedName) {
          setProject((prev) => ({ ...prev, name: savedName }));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Form state for editing project master
  const [editForm, setEditForm] = useState<ProjectMaster>(DEFAULT_PROJECT_MASTER);

  const handleOpenEditModal = () => {
    setEditForm(project);
    setIsEditModalOpen(true);
  };

  const handleSaveProjectMaster = (e: React.FormEvent) => {
    e.preventDefault();
    setProject(editForm);
    try {
      localStorage.setItem("ostaad_project_master", JSON.stringify(editForm));
      localStorage.setItem("ostaad_operations_project_name", editForm.name);
      localStorage.setItem("ostaad_operations_project_id", editForm.id);
    } catch {
      // ignore
    }
    setIsEditModalOpen(false);
  };

  // Form state for assigning new member
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("SITE_ENGINEER");
  const [department, setDepartment] = useState("Civil Execution");
  const [accessLevel, setAccessLevel] = useState<"ADMIN" | "WRITE" | "READ">("WRITE");

  const handleAssignMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const initials = name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const newMember: ProjectStaffMember = {
      id: `stf-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || "+91 90000 00000",
      role,
      department,
      assignedDate: new Date().toISOString().slice(0, 10),
      accessLevel,
      avatarInitials: initials,
    };

    setStaff((prev) => [...prev, newMember]);
    setIsAssignModalOpen(false);
    setName("");
    setEmail("");
    setPhone("");
  };

  const roleDisplayNames: Record<StaffRole, string> = {
    PROJECT_MANAGER: "Project Manager (PM)",
    LEAD_RESIDENT_ENGINEER: "Lead Resident Engineer",
    SITE_ENGINEER: "Site Field Engineer",
    QUALITY_CONTROL_LEAD: "QC & Materials Lead",
    SAFETY_OFFICER: "EHS Safety Officer",
    FINANCE_APPROVER: "Commercial Finance Approver",
    STORE_MANAGER: "Site Store & GRN Head",
  };

  const roleColors: Record<StaffRole, string> = {
    PROJECT_MANAGER: "bg-indigo-50 text-indigo-700 border-indigo-200",
    LEAD_RESIDENT_ENGINEER: "bg-blue-50 text-blue-700 border-blue-200",
    SITE_ENGINEER: "bg-emerald-50 text-emerald-700 border-emerald-200",
    QUALITY_CONTROL_LEAD: "bg-purple-50 text-purple-700 border-purple-200",
    SAFETY_OFFICER: "bg-amber-50 text-amber-700 border-amber-200",
    FINANCE_APPROVER: "bg-rose-50 text-rose-700 border-rose-200",
    STORE_MANAGER: "bg-teal-50 text-teal-700 border-teal-200",
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Project Master Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#122b45] text-white shadow-md shadow-slate-900/10">
              <Building2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-lg">{project.name}</h3>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700">
                  {project.projectCode}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  {project.stage.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Client: <strong className="text-slate-700">{project.clientName}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenEditModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shadow-xs"
            >
              <Edit2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Edit / Configure Project</span>
            </button>
            <a
              href={`https://maps.google.com/?q=${project.latitude},${project.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              <span>Google Maps Pin</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Project Parameters Grid */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Site Geolocation
            </div>
            <div className="text-sm font-bold text-[#122b45] mt-1 flex items-center gap-1">
              <Compass className="h-3.5 w-3.5 text-blue-600" />
              <span>
                {project.latitude}° N, {project.longitude}° E
              </span>
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {project.city}, {project.state}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Built-Up Area & Floors
            </div>
            <div className="text-sm font-bold text-[#122b45] mt-1">
              {project.totalBUASqFt.toLocaleString()} sq.ft
            </div>
            <div className="text-[11px] text-slate-500">
              {project.numberOfFloors} Floors (2B + G + 10)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Approved Turnkey Capex
            </div>
            <div className="text-sm font-bold text-indigo-700 mt-1">
              ₹{(project.approvedCapexINR / 10000000).toFixed(2)} Crores
            </div>
            <div className="text-[11px] text-slate-500">
              ₹{Math.round(project.approvedCapexINR / project.totalBUASqFt)}/sq.ft BUA
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Execution Timeline
            </div>
            <div className="text-sm font-bold text-slate-800 mt-1">
              {project.commencementDate}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">
              Handover: {project.targetCompletionDate}
            </div>
          </div>
        </div>
      </div>

      {/* Staff Assignment & Team Management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-[#122b45] text-sm">
                Project Staffing Directory & Role Authorization
              </h4>
              <p className="text-xs text-slate-500">
                Assigned project directors, resident site engineers, and commercial approvers
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#122b45] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-400" />
            <span>Assign Staff Member</span>
          </button>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                <th className="py-2.5 px-4">Member Name</th>
                <th className="py-2.5 px-3">Role Designation</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3 text-center">Access Level</th>
                <th className="py-2.5 px-3">Assigned Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#122b45] text-white font-bold text-xs">
                        {m.avatarInitials}
                      </div>
                      <div>
                        <div className="font-bold text-[#122b45]">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                        roleColors[m.role]
                      }`}
                    >
                      {roleDisplayNames[m.role]}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-600 font-medium">{m.department}</td>

                  <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{m.phone}</td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        m.accessLevel === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : m.accessLevel === "WRITE"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {m.accessLevel}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-500">{m.assignedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSIGN STAFF MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-[#122b45] text-base">Assign Team Member to Project</h4>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignMember} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  placeholder="e.g. Anand K. Patil"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  placeholder="anand.patil@ostaad-erp.com"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Project Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  >
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="LEAD_RESIDENT_ENGINEER">Lead Resident Engineer</option>
                    <option value="SITE_ENGINEER">Site Field Engineer</option>
                    <option value="QUALITY_CONTROL_LEAD">QC Lead</option>
                    <option value="SAFETY_OFFICER">Safety Officer</option>
                    <option value="FINANCE_APPROVER">Finance Approver</option>
                    <option value="STORE_MANAGER">Store Manager</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Access Level</label>
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value as "ADMIN" | "WRITE" | "READ")}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  >
                    <option value="WRITE">WRITE (Site Logs & Approvals)</option>
                    <option value="ADMIN">ADMIN (Full Project Rights)</option>
                    <option value="READ">READ (Viewer Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#122b45] px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm"
                >
                  Assign to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Project Master Details Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h4 className="font-bold text-[#122b45] text-base">Configure Project Master Info</h4>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectMaster} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g. Prestige Heights Phase 1"
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Project Code *</label>
                  <input
                    type="text"
                    required
                    value={editForm.projectCode}
                    onChange={(e) => setEditForm({ ...editForm, projectCode: e.target.value })}
                    placeholder="e.g. PRJ-BLR-2026-PH1"
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Client / Developer *</label>
                  <input
                    type="text"
                    required
                    value={editForm.clientName}
                    onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                    placeholder="e.g. Godrej Urban Properties"
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="COMMERCIAL">Commercial Office / IT Park</option>
                    <option value="RESIDENTIAL">Residential High-Rise</option>
                    <option value="INDUSTRIAL">Industrial Warehousing</option>
                    <option value="INFRASTRUCTURE">Infrastructure & Highways</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Project Stage</label>
                  <select
                    value={editForm.stage}
                    onChange={(e) => setEditForm({ ...editForm, stage: e.target.value as any })}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="PLANNING">Planning & Pre-Construction</option>
                    <option value="MOBILIZING">Site Mobilization</option>
                    <option value="ACTIVE_EXECUTION">Active Execution</option>
                    <option value="COMMISSIONING">Testing & Commissioning</option>
                    <option value="HANDED_OVER">Completed & Handed Over</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600">Site Address</label>
                  <input
                    type="text"
                    value={editForm.siteAddress}
                    onChange={(e) => setEditForm({ ...editForm, siteAddress: e.target.value })}
                    placeholder="e.g. Plot No 42, Outer Ring Road"
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    placeholder="e.g. Karnataka"
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Built-Up Area (Sq.Ft)</label>
                  <input
                    type="number"
                    value={editForm.totalBUASqFt}
                    onChange={(e) => setEditForm({ ...editForm, totalBUASqFt: Number(e.target.value) || 0 })}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Number of Floors</label>
                  <input
                    type="number"
                    value={editForm.numberOfFloors}
                    onChange={(e) => setEditForm({ ...editForm, numberOfFloors: Number(e.target.value) || 0 })}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Approved Turnkey Capex (INR)</label>
                  <input
                    type="number"
                    value={editForm.approvedCapexINR}
                    onChange={(e) => setEditForm({ ...editForm, approvedCapexINR: Number(e.target.value) || 0 })}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Commencement Date</label>
                  <input
                    type="date"
                    value={editForm.commencementDate}
                    onChange={(e) => setEditForm({ ...editForm, commencementDate: e.target.value })}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#122b45] px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm"
                >
                  Save Project Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

