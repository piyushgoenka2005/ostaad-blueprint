"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowRight, Bell, Boxes, Building2, Check, CheckCircle2, ChevronDown,
  ClipboardList, FileCheck2, FileText, FolderKanban, LayoutDashboard, LogOut, MapPin,
  Menu, PackageCheck, Phone, Plus, Search, Settings, ShoppingCart, Sparkles, Trash2,
  Truck, Upload, Users, XCircle,
} from "lucide-react";
import {
  addBOQItem, clearAuthSession, createMaterialRFQ, decomposeBOQ, deleteBOQItem,
  getAuthSession, getMaterialComparison, getPMNotifications, getProjectBOQItems,
  getVendors, importTakeoffAsProject, MaterialRequirement, submitBillProposalToFinance,
  submitMaterialBid, TakeoffResponse, updateBOQItem, uploadBlueprint, UserProfile,
  verifyAllBOQItems, Vendor, VendorBidComparison, BOQItem,
} from "@/lib/api";

type Quote = { value: string; bidId?: string };
const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function OperationsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("No project imported");
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [takeoff, setTakeoff] = useState<TakeoffResponse | null>(null);
  const [materials, setMaterials] = useState<MaterialRequirement[]>([]);
  const [rfqs, setRfqs] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<Record<string, Record<string, Quote>>>({});
  const [comparisons, setComparisons] = useState<Record<string, VendorBidComparison[]>>({});
  const [selectedBids, setSelectedBids] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [decomposing, setDecomposing] = useState(false);
  const [savingQuote, setSavingQuote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const loadProject = async (id: string) => {
    const [items, vendorList, alerts] = await Promise.all([getProjectBOQItems(id), getVendors(), getPMNotifications(id)]);
    setBoqItems(items); setVendors(vendorList); setNotifications(alerts);
  };

  useEffect(() => {
    const session = getAuthSession();
    if (!session.token || !session.user) { router.push("/login"); return; }
    setUser(session.user);
    const id = window.localStorage.getItem("buildbharat_operations_project_id");
    const name = window.localStorage.getItem("buildbharat_operations_project_name");
    setProjectId(id); setProjectName(name || "No project imported");
    if (id) loadProject(id).finally(() => setLoading(false)); else setLoading(false);
  }, [router]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setUploading(true); setNotice(null);
    try {
      const result = await uploadBlueprint(file);
      const imported = await importTakeoffAsProject({ project_name: file.name.replace(/\.[^/.]+$/, ""), lines: result.report.lines });
      setTakeoff(result); setProjectId(imported.project_id); setProjectName(imported.project_name);
      localStorage.setItem("buildbharat_operations_project_id", imported.project_id);
      localStorage.setItem("buildbharat_operations_project_name", imported.project_name);
      await loadProject(imported.project_id);
      setNotice("Blueprint uploaded and draft BOQ created.");
    } catch (error: any) { setNotice(error.message || "Blueprint processing failed."); }
    finally { setUploading(false); event.target.value = ""; }
  };

  const approveBOQ = async () => {
    if (!projectId) { setNotice("Upload a blueprint first."); return; }
    try {
      await verifyAllBOQItems(projectId, user?.id || "user-pm-01");
      const result = await decomposeBOQ(projectId);
      setMaterials(result.decomposed_materials || []);
      await loadProject(projectId); setNotice("BOQ finalised. Materials are ready for vendor quotations.");
    } catch (error: any) { setNotice(error.message || "BOQ approval failed."); }
  };

  const decompose = async () => {
    if (!projectId) return;
    setDecomposing(true);
    try { const result = await decomposeBOQ(projectId); setMaterials(result.decomposed_materials || []); setNotice("Material requirements refreshed."); }
    catch (error: any) { setNotice(error.message || "Material decomposition failed."); }
    finally { setDecomposing(false); }
  };

  const materialKey = (material: any) => material.id || material.material_name;
  const vendorMatches = (name: string) => {
    const value = name.toLowerCase();
    const categories = value.includes("brick") ? ["bricks"] : value.includes("steel") || value.includes("rebar") ? ["steel"] : value.includes("cement") ? ["cement"] : ["aggregates"];
    return vendors.filter((vendor) => categories.includes(vendor.category.toLowerCase()));
  };

  const recordQuote = async (material: any, vendor: Vendor) => {
    if (!projectId) return;
    const key = materialKey(material); const rate = Number(quotes[key]?.[vendor.id]?.value);
    if (!rate || rate <= 0) { setNotice("Enter a valid quoted price first."); return; }
    setSavingQuote(`${key}:${vendor.id}`);
    try {
      let rfqId = rfqs[key];
      if (!rfqId) { const rfq = await createMaterialRFQ({ project_id: projectId, material_name: material.material_name, required_quantity: Number(material.quantity), uom: material.uom || material.unit || "NOS" }); rfqId = rfq.rfq_id; setRfqs((current) => ({ ...current, [key]: rfqId as string })); }
      const bid = await submitMaterialBid({ rfq_id: rfqId, vendor_id: vendor.id, final_unit_rate: rate });
      const ranked = await getMaterialComparison(rfqId);
      setQuotes((current) => ({ ...current, [key]: { ...current[key], [vendor.id]: { value: String(rate), bidId: bid.bid_id } } }));
      setComparisons((current) => ({ ...current, [key]: ranked }));
    } catch (error: any) { setNotice(error.message || "Could not record quote."); }
    finally { setSavingQuote(null); }
  };

  const sendToFinance = async () => {
    if (!materials.length) return;
    const incomplete = materials.find((material: any) => !selectedBids[materialKey(material)]);
    if (incomplete) { setNotice(`Select one vendor for ${incomplete.material_name}.`); return; }
    setSending(true);
    try {
      for (const material of materials) { const key = materialKey(material); await submitBillProposalToFinance({ rfq_id: rfqs[key], selected_bid_id: selectedBids[key], manager_user_id: user?.id || "user-pm-01", manager_notes: "Vendor selection reviewed by Managing Authority." }); }
      setNotice("Vendor selections sent to Finance for approval.");
    } catch (error: any) { setNotice(error.message || "Could not send vendor selections."); }
    finally { setSending(false); }
  };

  const updateLine = async (item: BOQItem, field: keyof BOQItem, value: string | number) => {
    const next = { ...item, [field]: value } as BOQItem;
    next.total_amount = Math.round(next.quantity * next.unit_rate);
    setBoqItems((current) => current.map((line) => line.id === item.id ? next : line));
    try { await updateBOQItem(item.id, { [field]: value }); } catch (error: any) { setNotice(error.message || "Could not save BOQ line."); }
  };

  const addLine = async () => {
    if (!projectId) { setNotice("Upload a blueprint first."); return; }
    const description = window.prompt("Description", "Structural concrete work"); if (!description) return;
    await addBOQItem({ project_id: projectId, wbs_code: `GEN-${Math.floor(100 + Math.random() * 900)}`, description, unit: "CUM", quantity: 1, unit_rate: 0 });
    await loadProject(projectId);
  };

  const removeLine = async (id: string) => { if (!window.confirm("Delete this BOQ line?")) return; await deleteBOQItem(id); setBoqItems((current) => current.filter((item) => item.id !== id)); };
  const verified = boqItems.length > 0 && boqItems.every((item) => item.is_verified);
  const totalBOQ = boqItems.reduce((sum, item) => sum + item.total_amount, 0);
  const filteredItems = boqItems.filter((item) => `${item.description} ${item.wbs_code}`.toLowerCase().includes(search.toLowerCase()));
  const workflow = ["Project Created", "Blueprint Uploaded", "BOQ Generated", "BOQ Finalised", "Vendor Quotations", "Vendors Selected", "Finance Approval", "Purchase Orders", "Sent to Vendors"];
  const completed = projectId ? (verified ? 4 : takeoff ? 3 : 2) : 0;

  const logout = () => { clearAuthSession(); router.push("/login"); };

  return <div className="min-h-screen bg-[#f4f8fc] text-slate-700">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#10263d] text-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#12304c]"><Building2 className="h-6 w-6" /></div><div><div className="text-lg font-bold">Ostaad</div><div className="text-[10px] text-slate-300">Construction ERP</div></div></div>
      <nav className="space-y-1 px-3 py-5 text-xs"><SideLink icon={LayoutDashboard} label="Dashboard" active /><SideLink icon={FolderKanban} label="Projects" /><SideLink icon={Upload} label="Blueprint to BOQ" active={!projectId} onClick={() => document.getElementById("blueprint")?.scrollIntoView({ behavior: "smooth" })} badge="New" /><SideLink icon={ClipboardList} label="BOQ Management" onClick={() => document.getElementById("boq")?.scrollIntoView({ behavior: "smooth" })} /><SideLink icon={Users} label="Vendors" onClick={() => document.getElementById("vendors")?.scrollIntoView({ behavior: "smooth" })} /><SideLink icon={Phone} label="Vendor Quotations" onClick={() => document.getElementById("quotations")?.scrollIntoView({ behavior: "smooth" })} /><SideLink icon={ShoppingCart} label="Purchase Orders" /><SideLink icon={FileText} label="Reports" /><SideLink icon={Settings} label="Settings" /></nav>
      <div className="mt-auto border-t border-white/10 p-5 text-[11px] text-slate-300">Better planning.<br /><span className="text-slate-400">Smoother construction.</span></div>
    </aside>
    <div className="lg:ml-64">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur md:px-8"><div className="relative w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or BOQs..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-400" /></div><div className="flex items-center gap-4"><button className="relative text-slate-500"><Bell className="h-5 w-5" /><span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" /></button><div className="hidden text-right sm:block"><div className="text-xs font-semibold text-slate-800">{user?.full_name || "Project Manager"}</div><div className="text-[10px] text-slate-500">Managing Authority</div></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#12304c] text-xs font-bold text-white">{(user?.full_name || "PM").split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><button onClick={logout} className="text-slate-400 hover:text-rose-500" title="Sign out"><LogOut className="h-4 w-4" /></button></div></header>
      <main className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-1 text-xs text-slate-500">Operations <ChevronDown className="mx-1 inline h-3 w-3" /> Project Management</div><h1 className="text-2xl font-bold tracking-tight text-[#122b45]">Project Operations</h1><p className="mt-1 text-sm text-slate-500">Monitor project progress, material requirements, procurement, and approvals.</p></div><button onClick={() => setNotice("Create a project by uploading its blueprint.")} className="inline-flex items-center gap-2 rounded-lg bg-[#1368d8] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0f59bb]"><Plus className="h-4 w-4" />Create Project</button></div>
        {notice && <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"><span>{notice}</span><button onClick={() => setNotice(null)}><XCircle className="h-4 w-4" /></button></div>}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><Metric icon={FolderKanban} label="Total Projects" value={projectId ? 1 : 0} note="All projects" tone="blue" /><Metric icon={CheckCircle2} label="Projects In Progress" value={projectId && !verified ? 1 : 0} note="Active workflows" tone="sky" /><Metric icon={FileText} label="BOQs Awaiting Review" value={projectId && !verified ? 1 : 0} note="Need finalisation" tone="violet" /><Metric icon={Users} label="Pending Vendor Selection" value={materials.length && Object.keys(selectedBids).length < materials.length ? 1 : 0} note="Awaiting selection" tone="orange" /><Metric icon={PackageCheck} label="Pending Finance Approval" value="—" note="Live Finance queue" tone="amber" /><Metric icon={ShoppingCart} label="Purchase Orders Created" value="—" note="After approval" tone="emerald" /></section>
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-[#122b45]">All Projects</h2><p className="mt-1 text-xs text-slate-500">Track project status from blueprint upload through vendor dispatch.</p></div><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">All Projects <ChevronDown className="ml-1 inline h-3 w-3" /></button></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Project ID</th><th className="px-4 py-3">Project Name</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Project Manager</th><th className="px-4 py-3">Project Status</th><th className="px-4 py-3">BOQ Status</th><th className="px-4 py-3">Vendor Selection</th><th className="px-4 py-3">Finance Approval</th><th className="px-4 py-3">Purchase Orders</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{projectId ? <tr className="border-t border-slate-100"><td className="px-4 py-4 font-mono font-semibold text-blue-700">{projectId}</td><td className="px-4 py-4 font-semibold text-slate-800">{projectName}</td><td className="px-4 py-4 text-slate-500">Not available</td><td className="px-4 py-4 text-slate-500">Not available</td><td className="px-4 py-4 text-slate-600">{user?.full_name || "Project Manager"}</td><td className="px-4 py-4"><Status text={verified ? "In Progress" : "Planning"} tone={verified ? "blue" : "violet"} /></td><td className="px-4 py-4"><Status text={verified ? "Finalised" : takeoff ? "In Review" : "Not Started"} tone={verified ? "green" : "amber"} /></td><td className="px-4 py-4"><Status text={materials.length ? "Pending" : "Not Started"} tone="amber" /></td><td className="px-4 py-4"><Status text="Not Started" tone="slate" /></td><td className="px-4 py-4"><Status text="Not Created" tone="slate" /></td><td className="px-4 py-4"><button onClick={() => document.getElementById("boq")?.scrollIntoView({ behavior: "smooth" })} className="rounded-md border border-blue-200 px-3 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50">View Project</button></td></tr> : <tr><td colSpan={11} className="p-12 text-center text-sm text-slate-400">No projects yet. Upload a blueprint to create the first project.</td></tr>}</tbody></table></div></section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold text-[#122b45]">Project Workflow Tracker</h2><p className="mt-1 text-xs text-slate-500">Selected project: {projectName}</p></div><Status text={projectId ? (verified ? "BOQ finalised" : "In Progress") : "No project"} tone={verified ? "green" : "amber"} /></div><div className="grid grid-cols-3 gap-3 md:grid-cols-9">{workflow.map((step, index) => <div key={step} className="relative text-center"><div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index < completed ? "bg-emerald-500 text-white" : index === completed ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>{index < completed ? <Check className="h-4 w-4" /> : index + 1}</div><div className="mt-2 text-[10px] font-medium text-slate-600">{step}</div>{index < workflow.length - 1 && <div className={`absolute left-[58%] top-4 hidden h-px w-[84%] md:block ${index < completed - 1 ? "bg-emerald-400" : "bg-slate-200"}`} />}</div>)}</div></section>
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]"><div className="space-y-6">
          <div id="blueprint" className="scroll-mt-24 rounded-xl border border-blue-200 bg-blue-50 p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="flex items-start gap-3"><div className="rounded-lg bg-white p-3 text-blue-600 shadow-sm"><Upload className="h-5 w-5" /></div><div><h2 className="font-bold text-[#122b45]">Need to convert drawings to BOQ?</h2><p className="mt-1 text-xs text-slate-500">Use the Blueprint to BOQ engine to generate material quantities and cost estimates.</p></div></div><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#1368d8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0f59bb]">{uploading ? "Processing..." : "Go to Blueprint to BOQ"}<ArrowRight className="h-4 w-4" /><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleUpload} disabled={uploading} className="sr-only" /></label></div>{takeoff && <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3 text-xs text-slate-600">Generated {takeoff.report.lines.length} takeoff line(s) and created <strong>{projectName}</strong> as a draft project.</div>}</div>
          <div id="boq" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center"><div><h2 className="font-bold text-[#122b45]">BOQ Management</h2><p className="mt-1 text-xs text-slate-500">Review, edit, and finalise quantities before procurement.</p></div><div className="flex gap-2"><button onClick={addLine} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><Plus className="mr-1 inline h-3 w-3" />Add line</button><button onClick={approveBOQ} disabled={!projectId || verified} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{verified ? "BOQ Finalised" : "Finalise BOQ"}</button></div></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">BOQ / WBS</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th /></tr></thead><tbody>{filteredItems.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-mono font-semibold text-blue-700">{item.wbs_code}</td><td className="min-w-[220px] px-4 py-3"><input value={item.description} onChange={(event) => updateLine(item, "description", event.target.value)} className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400" /></td><td className="px-4 py-3"><input type="number" value={item.quantity} onChange={(event) => updateLine(item, "quantity", Number(event.target.value))} className="w-20 rounded border border-slate-200 px-2 py-1.5 text-right text-xs" /></td><td className="px-4 py-3 text-slate-500">{item.unit}</td><td className="px-4 py-3"><input type="number" value={item.unit_rate} onChange={(event) => updateLine(item, "unit_rate", Number(event.target.value))} className="w-24 rounded border border-slate-200 px-2 py-1.5 text-right text-xs" /></td><td className="px-4 py-3 font-semibold">{money(item.total_amount)}</td><td className="px-4 py-3"><Status text={item.is_verified ? "Finalised" : "In Review"} tone={item.is_verified ? "green" : "amber"} /></td><td className="px-4 py-3"><button onClick={() => removeLine(item.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table>{!boqItems.length && <div className="p-10 text-center text-sm text-slate-400">Upload a blueprint to generate the first BOQ.</div>}<div className="flex justify-end border-t border-slate-100 px-5 py-3 text-sm font-bold text-[#122b45]">Current BOQ estimate: {money(totalBOQ)}</div></div></div>
          <div id="quotations" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold text-[#122b45]">Vendor Quotations and Selection</h2><p className="mt-1 text-xs text-slate-500">Record vendor rates by material and choose one supplier for each requirement.</p></div><button onClick={decompose} disabled={!projectId || decomposing} className="rounded-lg bg-[#1368d8] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{decomposing ? "Refreshing..." : "Load materials"}</button></div>{!materials.length ? <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400">Finalise the BOQ to unlock material-wise vendor quotations.</div> : <div className="mt-5 space-y-4">{materials.map((material: any) => <MaterialCard key={materialKey(material)} material={material} vendors={vendorMatches(material.material_name)} quotes={quotes[materialKey(material)] || {}} comparisons={comparisons[materialKey(material)] || []} selectedBid={selectedBids[materialKey(material)]} onQuote={(vendor, value) => setQuotes((current) => ({ ...current, [materialKey(material)]: { ...current[materialKey(material)], [vendor.id]: { value, bidId: current[materialKey(material)]?.[vendor.id]?.bidId } } }))} onRecord={(vendor) => recordQuote(material, vendor)} onSelect={(bid) => setSelectedBids((current) => ({ ...current, [materialKey(material)]: bid }))} savingQuote={savingQuote} />)}<button onClick={sendToFinance} disabled={sending} className="w-full rounded-lg bg-[#12304c] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">{sending ? "Sending to Finance..." : "Finalise Vendor Selection and Send to Finance"}</button></div>}</div>
        </div><aside className="space-y-5"><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-[#122b45]">Project Preview</h2><Status text={projectId ? "In Progress" : "Not Started"} tone={projectId ? "blue" : "slate"} /></div><div className="mt-4 space-y-4 text-xs"><Info label="Project" value={projectName} /><Info label="Project ID" value={projectId || "Not available"} /><Info label="Client" value="Not available" /><Info label="Site location" value="Not available" /><div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4"><Stat label="BOQ items" value={boqItems.length} /><Stat label="Materials" value={materials.length || "—"} /><Stat label="Est. BOQ" value={money(totalBOQ)} /></div></div></div><div id="vendors" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-[#122b45]">Project Team and Vendors</h2><div className="mt-4 space-y-3 text-xs"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{(user?.full_name || "PM").slice(0, 2)}</div><div><div className="font-semibold">{user?.full_name || "Project Manager"}</div><div className="text-slate-500">Managing Authority</div></div></div><div className="border-t border-slate-100 pt-3 text-slate-500">{vendors.length} vendor records available from the database.</div></div></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-800">Pending Actions</h2><div className="mt-3 space-y-2 text-xs text-amber-900">{!projectId && <div><Upload className="mr-2 inline h-3 w-3" />Upload blueprint</div>}{projectId && !verified && <div><ClipboardList className="mr-2 inline h-3 w-3" />Finalise BOQ</div>}{verified && !materials.length && <div><Boxes className="mr-2 inline h-3 w-3" />Load material requirements</div>}{notifications.length === 0 && projectId && materials.length > 0 && <div><Truck className="mr-2 inline h-3 w-3" />Collect vendor quotations</div>}</div></div></aside></section>
      </main>
    </div>
  </div>;
}

function SideLink({ icon: Icon, label, active, badge, onClick }: { icon: React.ElementType; label: string; active?: boolean; badge?: string; onClick?: () => void }) { return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/10"}`}><Icon className="h-4 w-4" />{label}{badge && <span className="ml-auto rounded bg-emerald-400 px-1.5 py-0.5 text-[9px] font-bold text-emerald-950">{badge}</span>}</button>; }
function Metric({ icon: Icon, label, value, note, tone }: { icon: React.ElementType; label: string; value: string | number; note: string; tone: string }) { const colors: Record<string, string> = { blue: "bg-blue-50 text-blue-600 border-blue-100", sky: "bg-sky-50 text-sky-600 border-sky-100", violet: "bg-violet-50 text-violet-600 border-violet-100", orange: "bg-orange-50 text-orange-600 border-orange-100", amber: "bg-amber-50 text-amber-600 border-amber-100", emerald: "bg-emerald-50 text-emerald-600 border-emerald-100" }; return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-2"><div><div className="text-[11px] text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold text-[#122b45]">{value}</div><div className="mt-1 text-[10px] text-slate-400">{note}</div></div><div className={`rounded-lg border p-2 ${colors[tone]}`}><Icon className="h-4 w-4" /></div></div></div>; }
function Status({ text, tone }: { text: string; tone: string }) { const styles: Record<string, string> = { green: "bg-emerald-50 text-emerald-700 border-emerald-200", amber: "bg-amber-50 text-amber-700 border-amber-200", blue: "bg-blue-50 text-blue-700 border-blue-200", violet: "bg-violet-50 text-violet-700 border-violet-200", slate: "bg-slate-100 text-slate-500 border-slate-200" }; return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${styles[tone] || styles.slate}`}>{text}</span>; }
function Info({ label, value }: { label: string; value: string }) { return <div><div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 break-words text-xs font-semibold text-slate-700">{value}</div></div>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div><div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 text-sm font-bold text-[#122b45]">{value}</div></div>; }
function MaterialCard({ material, vendors, quotes, comparisons, selectedBid, onQuote, onRecord, onSelect, savingQuote }: { material: any; vendors: Vendor[]; quotes: Record<string, Quote>; comparisons: VendorBidComparison[]; selectedBid?: string; onQuote: (vendor: Vendor, value: string) => void; onRecord: (vendor: Vendor) => void; onSelect: (bid: string) => void; savingQuote: string | null }) { const key = material.id || material.material_name; return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 className="font-semibold text-[#122b45]">{material.material_name}</h3><div className="mt-1 text-xs text-slate-500">Required: {material.quantity} {material.uom || material.unit}</div></div><Status text={`${comparisons.length}/${vendors.length} quotes`} tone={comparisons.length === vendors.length && vendors.length ? "green" : "amber"} /></div>{!vendors.length ? <div className="mt-3 text-xs text-amber-700">No vendor records are available for this category.</div> : <div className="mt-3 grid gap-3 md:grid-cols-2">{vendors.map((vendor) => <div key={vendor.id} className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-xs font-semibold text-slate-800">{vendor.vendor_name}</div><a href={`tel:${vendor.phone}`} className="mt-1 block text-[11px] text-blue-700">+91 {vendor.phone}</a><div className="mt-2 flex gap-2"><input value={quotes[vendor.id]?.value || ""} onChange={(event) => onQuote(vendor, event.target.value)} disabled={Boolean(quotes[vendor.id]?.bidId)} placeholder="Final price" className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1.5 text-xs" /><button onClick={() => onRecord(vendor)} disabled={Boolean(quotes[vendor.id]?.bidId) || savingQuote === `${key}:${vendor.id}`} className="rounded bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50">{quotes[vendor.id]?.bidId ? "Saved" : "Record"}</button></div></div>)}</div>}{comparisons.length > 0 && <div className="mt-4 space-y-2 border-t border-slate-200 pt-3"><div className="text-[10px] font-semibold uppercase text-slate-400">Select one vendor</div>{comparisons.map((row) => <label key={row.bid_id} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white p-2.5 text-xs"><input type="radio" name={`material-${key}`} checked={selectedBid === row.bid_id} onChange={() => onSelect(row.bid_id)} /><span className="font-mono text-emerald-700">{row.rank}</span><span className="flex-1">{row.vendor_name}</span><span className="font-semibold">{money(row.landed_rate)}</span></label>)}</div>}</div>; }
