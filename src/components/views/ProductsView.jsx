"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Printer,
  Camera,
  ImagePlus,
  Pencil,
  Sparkles,
  ScanBarcode,
  Check,
  X,
  Package,
  History,
  Table,
  LayoutGrid,
  Eye,
  Boxes,
  IndianRupee,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  SlidersHorizontal,
  Minus,
  CheckSquare,
  Square,
  FileSpreadsheet,
} from "lucide-react";
import ProductPhoto from "@/components/ProductPhoto";
import BarcodeSVG from "@/components/BarcodeSVG";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import Modal from "@/components/Modal";
import PrintableModal from "@/components/PrintableModal";
import LabelSheet, { mrpOf } from "@/components/LabelSheet";
import ScanBar from "@/components/ScanBar";
import { useScanner, useScanHandler, beep } from "@/components/ScanProvider";
import { Btn, Field, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";
import { isLow } from "@/lib/selectors";
import { findProductByCode, normalizeCode } from "@/lib/barcode";
import { fileToDataUrl } from "@/lib/image";
import { GST_SLABS } from "@/lib/gst";
import { formatINR, fmtDate, fmtTime } from "@/lib/format";
import { useToast } from "@/lib/useToast";
import { downloadCSV } from "@/lib/csv";

const CATEGORIES = ["Saree", "Lehenga", "Kurti", "Dupatta", "Blouse", "Fabric Roll"];
const HSN_HINT = {
  Saree: "5007",
  Lehenga: "6204",
  Kurti: "6204",
  Dupatta: "6214",
  Blouse: "6206",
  "Fabric Roll": "5007",
};

const emptyForm = () => ({
  name: "",
  category: "Saree",
  hsn: "5007",
  gst: 5,
  price: "",
  cost: "",
  stock: "",
  reorder: 5,
  unit: "pcs",
  photo: null,
  barcodeMode: "auto",
  barcode: "",
});

export default function ProductsView() {
  const products = useStore((s) => s.products);
  const stockLog = useStore((s) => s.stockLog);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const adjustStock = useStore((s) => s.adjustStock);
  const business = useStore((s) => s.business);
  const { fire, node: toast } = useToast();
  const { openCamera } = useScanner();

  // Filter & Search states
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState("all"); // "all" | "in" | "low" | "out" | "alerts"
  const [viewMode, setViewMode] = useState("grid");

  // Sorting states
  const [sortField, setSortField] = useState("name"); // "name" | "sku" | "cost" | "price" | "stock" | "margin"
  const [sortDir, setSortDir] = useState("asc");

  // Multi-Select states
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal / Drawer states
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelItems, setLabelItems] = useState([]);
  const [labelQuery, setLabelQuery] = useState("");
  const [labelCat, setLabelCat] = useState("All");
  const [labelOpts, setLabelOpts] = useState({ cols: 3, price: true });
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  // Dedicated Stock Adjustment Modal state
  const [adjustModal, setAdjustModal] = useState({
    open: false,
    product: null,
    type: "in", // "in", "out", "audit"
    qty: "",
    reason: "",
  });

  const categoryCounts = useMemo(() => {
    const counts = { All: products.length };
    for (const c of CATEGORIES) {
      counts[c] = products.filter((p) => p.category === c).length;
    }
    return counts;
  }, [products]);

  const stockCounts = useMemo(() => {
    const all = products.length;
    const out = products.filter((p) => p.stock === 0).length;
    const low = products.filter((p) => isLow(p) && p.stock > 0).length;
    const inStock = products.filter((p) => p.stock > 0 && !isLow(p)).length;
    return { all, inStock, low, out, alerts: out + low };
  }, [products]);

  const metrics = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + p.stock, 0);
    const lowCount = products.filter((p) => isLow(p) || p.stock === 0).length;
    const valuation = products.reduce((s, p) => s + p.cost * p.stock, 0);
    const retailValuation = products.reduce((s, p) => s + p.price * p.stock, 0);
    return { totalUnits, lowCount, valuation, retailValuation };
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const q = query.toLowerCase().trim();
      const okQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      const okCat = category === "All" || p.category === category;

      let okStock = true;
      if (stockFilter === "low") {
        okStock = isLow(p) && p.stock > 0;
      } else if (stockFilter === "out") {
        okStock = p.stock === 0;
      } else if (stockFilter === "in") {
        okStock = p.stock > 0 && !isLow(p);
      } else if (stockFilter === "alerts") {
        okStock = isLow(p) || p.stock === 0;
      }

      return okQ && okCat && okStock;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "sku") {
        cmp = a.sku.localeCompare(b.sku);
      } else if (sortField === "cost") {
        cmp = (a.cost || 0) - (b.cost || 0);
      } else if (sortField === "price") {
        cmp = a.price - b.price;
      } else if (sortField === "stock") {
        cmp = a.stock - b.stock;
      } else if (sortField === "margin") {
        const mA = a.cost > 0 ? (a.price - a.cost) / a.cost : 0;
        const mB = b.cost > 0 ? (b.price - b.cost) / b.cost : 0;
        cmp = mA - mB;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [products, query, category, stockFilter, sortField, sortDir]);

  const detail = products.find((p) => p.id === detailId);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // Multi-select handlers
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.includes(p.id));

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.some((p) => p.id === id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filtered.map((p) => p.id)])));
    }
  }

  // Export CSV handler
  function handleExportCSV(itemsToExport = filtered) {
    const headers = [
      "SKU",
      "Product Name",
      "Category",
      "HSN Code",
      "GST Slab (%)",
      "Unit Cost (INR)",
      "Selling Price (INR)",
      "Margin (%)",
      "Stock Qty",
      "Unit",
      "Stock Status",
      "Reorder Level",
      "Barcode (EAN-13)",
    ];

    const rows = itemsToExport.map((p) => {
      const margin = p.cost > 0 ? Math.round(((p.price - p.cost) / p.cost) * 100) : 0;
      const status = p.stock === 0 ? "Out of Stock" : isLow(p) ? "Low Stock" : "In Stock";
      return [
        p.sku,
        p.name,
        p.category,
        p.hsn,
        p.gst,
        p.cost,
        p.price,
        `${margin}%`,
        p.stock,
        p.unit,
        status,
        p.reorder,
        p.barcode,
      ];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Textiles_Inventory_${dateStr}.csv`;
    downloadCSV(filename, [headers, ...rows]);
    fire("CSV Exported", `Downloaded ${itemsToExport.length} products to ${filename}`);
  }

  // Quick Inline Stock Adjust (+1 / -1)
  function quickAdjust(e, product, delta) {
    e.stopPropagation();
    if (delta < 0 && product.stock <= 0) return;
    const newStock = Math.max(0, product.stock + delta);
    const diff = newStock - product.stock;
    if (diff === 0) return;
    adjustStock({
      productId: product.id,
      delta: diff,
      type: diff > 0 ? "in" : "out",
      reason: diff > 0 ? "Quick increment (+1)" : "Quick decrement (-1)",
    });
    beep(true);
    fire(
      "Stock Updated",
      `${product.name}: ${newStock} ${product.unit} (${diff > 0 ? `+${diff}` : diff})`
    );
  }

  // Dedicated Stock Adjust Modal Handlers
  function openAdjustModal(p, defaultType = "in") {
    setAdjustModal({
      open: true,
      product: p,
      type: defaultType,
      qty: "",
      reason: "",
    });
  }

  function handleApplyAdjust(e) {
    e.preventDefault();
    const p = adjustModal.product;
    if (!p) return;
    const val = Number(adjustModal.qty);
    if (!(val > 0) && adjustModal.type !== "audit") {
      fire("Invalid Quantity", "Please enter a valid quantity greater than 0");
      return;
    }

    let delta = 0;
    let finalReason = adjustModal.reason.trim();

    if (adjustModal.type === "in") {
      delta = val;
      if (!finalReason) finalReason = "Stock received / Purchase";
    } else if (adjustModal.type === "out") {
      if (val > p.stock) {
        fire("Exceeds Stock", `Cannot deduct more than current stock (${p.stock})`);
        return;
      }
      delta = -val;
      if (!finalReason) finalReason = "Damaged / Stock deduction";
    } else if (adjustModal.type === "audit") {
      if (isNaN(val) || val < 0) {
        fire("Invalid Count", "Enter a valid physical stock count");
        return;
      }
      delta = val - p.stock;
      if (!finalReason) finalReason = "Physical stock audit correction";
    }

    if (delta === 0) {
      setAdjustModal({ open: false, product: null, type: "in", qty: "", reason: "" });
      return;
    }

    adjustStock({
      productId: p.id,
      delta,
      type: adjustModal.type === "audit" ? "audit" : delta > 0 ? "in" : "out",
      reason: finalReason,
    });

    beep(true);
    fire("Stock Adjusted", `${p.name} updated to ${p.stock + delta} ${p.unit}`);
    setAdjustModal({ open: false, product: null, type: "in", qty: "", reason: "" });
  }

  function onScan(code) {
    const p = findProductByCode(products, code);
    if (p) {
      beep(true, `Found: ${p.name}`);
      setDetailId(p.id);
    } else {
      beep(false, `Barcode not found: ${normalizeCode(code)}`);
      fire("Barcode not linked", `${normalizeCode(code)} is not linked to any product`);
    }
  }
  useScanHandler(
    formOpen
      ? (code) => setForm((f) => ({ ...f, barcodeMode: "custom", barcode: normalizeCode(code) }))
      : onScan
  );

  function openAdd() {
    setEditId(null);
    setForm(emptyForm());
    setCreated(null);
    setError("");
    setFormOpen(true);
  }

  function openEdit(p) {
    setEditId(p.id);
    setForm({
      ...emptyForm(),
      name: p.name,
      category: p.category,
      hsn: p.hsn,
      gst: p.gst,
      price: p.price,
      cost: p.cost,
      stock: "",
      reorder: p.reorder,
      unit: p.unit,
      photo: p.photo,
      barcode: p.barcode,
    });
    setCreated(null);
    setError("");
    setDetailId(null);
    setFormOpen(true);
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const photo = await fileToDataUrl(file);
      setForm((f) => ({ ...f, photo }));
    } catch {
      setError("Could not load the photo, try another");
    }
    e.target.value = "";
  }

  function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Enter the product name");
    if (!(Number(form.price) > 0)) return setError("Enter the price");
    if (editId) {
      updateProduct(editId, {
        name: form.name.trim(),
        category: form.category,
        hsn: form.hsn,
        gst: Number(form.gst),
        price: Number(form.price),
        cost: Number(form.cost) || 0,
        reorder: Number(form.reorder) || 0,
        unit: form.unit,
        photo: form.photo,
      });
      setFormOpen(false);
      fire("Product updated", form.name);
      return;
    }
    let barcode = "";
    if (form.barcodeMode === "custom") {
      barcode = normalizeCode(form.barcode);
      if (!barcode) return setError("Scan or type the barcode");
      if (products.some((p) => p.barcode === barcode))
        return setError("This barcode is already used by another product");
    }
    const p = addProduct({
      name: form.name.trim(),
      category: form.category,
      hsn: form.hsn,
      gst: Number(form.gst),
      price: Number(form.price),
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
      reorder: Number(form.reorder) || 0,
      unit: form.unit,
      photo: form.photo,
      barcode,
    });
    beep(true);
    setCreated(p);
  }

  function openLabels(preset) {
    setLabelItems(
      products.map((p) => ({
        product: p,
        copies: preset?.includes(p.id) ? Math.max(1, p.stock) : 0,
      }))
    );
    setPrinting(false);
    setLabelOpen(true);
  }
  const labelsToPrint = labelItems.filter((l) => l.copies > 0);
  const price = Number(form.price) || 0;

  return (
    <div className="flex flex-col gap-5">
      <ScanBar
        onScan={onScan}
        placeholder="Scan a product barcode or type to view inventory details…"
        cameraTitle="Scan Barcode"
      />

      {/* ============ INTERACTIVE KPI TILES ============ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total SKUs */}
        <div
          onClick={() => {
            setCategory("All");
            setStockFilter("all");
            setQuery("");
          }}
          className={`card card-lift flex cursor-pointer flex-col items-start gap-2 border p-3.5 transition-all sm:flex-row sm:items-center sm:gap-3 ${
            stockFilter === "all" && category === "All" && !query
              ? "border-accent ring-2 ring-accent/20 bg-accent/5"
              : "border-line"
          }`}
          title="Click to reset filters and view all SKUs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
            <Package size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-ink-soft">Total SKUs</div>
            <div className="font-mono text-base font-black text-ink tabular">{products.length} Items</div>
            <div className="text-[10px] text-ink-faint">Catalog active</div>
          </div>
        </div>

        {/* Stock on Hand */}
        <div
          onClick={() => setStockFilter(stockFilter === "in" ? "all" : "in")}
          className={`card card-lift flex cursor-pointer flex-col items-start gap-2 border p-3.5 transition-all sm:flex-row sm:items-center sm:gap-3 ${
            stockFilter === "in"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5"
              : "border-line"
          }`}
          title="Click to view healthy in-stock items"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Boxes size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-ink-soft">Stock on Hand</div>
            <div className="font-mono text-base font-black text-ink tabular">{metrics.totalUnits} Units</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {stockCounts.inStock} SKUs ready
            </div>
          </div>
        </div>

        {/* Low / Out of Stock Alerts */}
        <div
          onClick={() => setStockFilter(stockFilter === "alerts" ? "all" : "alerts")}
          className={`card card-lift flex cursor-pointer flex-col items-start gap-2 border p-3.5 transition-all sm:flex-row sm:items-center sm:gap-3 ${
            stockFilter === "alerts"
              ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5"
              : "border-line"
          }`}
          title="Click to filter low stock and out-of-stock items"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-ink-soft">Restock Alerts</div>
            <div className="font-mono text-base font-black text-ink tabular">{metrics.lowCount} Alerts</div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              {stockCounts.out} out · {stockCounts.low} low
            </div>
          </div>
        </div>

        {/* Inventory Cost Valuation */}
        <div className="card flex flex-col items-start gap-2 border border-line p-3.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <IndianRupee size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-ink-soft">Inventory Cost Value</div>
            <div className="font-mono text-base font-black text-ink tabular truncate">
              {formatINR(metrics.valuation)}
            </div>
            <div className="text-[10px] text-ink-faint truncate">
              Retail: {formatINR(metrics.retailValuation)}
            </div>
          </div>
        </div>
      </div>

      {/* ============ TOOLBAR: SEARCH, EXPORT, TABLE/GRID, ADD ============ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, SKU or barcode…"
            className="input pl-9! pr-8! text-xs font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Table / Grid Toggle */}
          <div className="flex items-center rounded-xl border border-line bg-surface p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("table")}
              title="Table View"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === "table"
                  ? "bg-accent-solid text-white shadow-xs"
                  : "text-ink-soft hover:text-ink hover:bg-surface-2"
              }`}
            >
              <Table size={14} />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-accent-solid text-white shadow-xs"
                  : "text-ink-soft hover:text-ink hover:bg-surface-2"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Grid</span>
            </button>
          </div>

          {/* Export Catalog to CSV */}
          <Btn
            variant="outline"
            onClick={() => handleExportCSV(filtered)}
            title="Download CSV for Excel / Tally"
            className="text-xs"
          >
            <Download size={14} /> <span className="hidden sm:inline">Export CSV</span>
          </Btn>

          {/* Print Labels */}
          <Btn variant="outline" onClick={() => openLabels([])} className="text-xs">
            <Printer size={14} /> <span className="hidden sm:inline">Print labels</span>
          </Btn>

          {/* Add Product */}
          <Btn onClick={openAdd} className="order-first w-full text-xs sm:order-none sm:w-auto">
            <Plus size={15} strokeWidth={2.5} /> Add product
          </Btn>
        </div>
      </div>

      {/* ============ FILTER CONTROLS: CATEGORIES + STOCK STATUS ============ */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Filter Chips with Item Counts */}
        <div className="scroll-thin -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                category === c
                  ? "border-accent-solid bg-accent-solid text-white shadow-2xs"
                  : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-surface-2"
              }`}
            >
              <span>{c}</span>
              <span
                className={`ml-1.5 font-mono text-[10px] ${
                  category === c ? "text-white/80" : "text-ink-faint"
                }`}
              >
                {categoryCounts[c] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Stock Status Filter Pills */}
        <div className="scroll-thin flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1 shadow-2xs sm:flex-wrap sm:self-auto">
          {[
            { id: "all", label: "All Stock", count: stockCounts.all },
            { id: "in", label: "In Stock", count: stockCounts.inStock, dot: "bg-emerald-500" },
            { id: "low", label: "Low Stock", count: stockCounts.low, dot: "bg-amber-500" },
            { id: "out", label: "Out of Stock", count: stockCounts.out, dot: "bg-rose-500" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStockFilter(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                stockFilter === tab.id
                  ? "bg-accent-solid text-white shadow-xs"
                  : "text-ink-soft hover:text-ink hover:bg-surface-2"
              }`}
            >
              {tab.dot && (
                <span
                  className={`h-2 w-2 rounded-full ${
                    stockFilter === tab.id ? "bg-white" : tab.dot
                  }`}
                />
              )}
              <span>{tab.label}</span>
              <span
                className={`font-mono text-[10px] ${
                  stockFilter === tab.id ? "text-white/80" : "text-ink-faint"
                }`}
              >
                ({tab.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Showing count indicator */}
      <div className="flex items-center justify-between text-xs text-ink-faint px-1">
        <div>
          Showing <span className="font-bold text-ink">{filtered.length}</span> of{" "}
          <span className="font-bold text-ink">{products.length}</span> products
          {query && (
            <span>
              {" "}
              matching &ldquo;<b className="text-accent">{query}</b>&rdquo;
            </span>
          )}
        </div>
        {(category !== "All" || stockFilter !== "all" || query) && (
          <button
            onClick={() => {
              setCategory("All");
              setStockFilter("all");
              setQuery("");
            }}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          text="Try adjusting your search query or reset category / stock status filters."
        />
      ) : viewMode === "table" ? (
        /* ============ ENTERPRISE TABLE VIEW ============ */
        <div className="card overflow-hidden border border-line shadow-xs">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="border-b border-line bg-surface-2/70 text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">
                <tr>
                  {/* Master Checkbox */}
                  <th className="px-3 py-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center text-ink-faint hover:text-ink transition-colors"
                      title={allFilteredSelected ? "Deselect all" : "Select all"}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare size={16} className="text-accent-solid" />
                      ) : (
                        <Square size={16} className="text-ink-faint" />
                      )}
                    </button>
                  </th>

                  <SortHeader
                    field="name"
                    label="Product Item"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    field="sku"
                    label="SKU & Barcode"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3.5">Category &amp; HSN</th>
                  <SortHeader
                    field="cost"
                    label="Unit Cost"
                    align="right"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    field="price"
                    label="Selling Price"
                    align="right"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    field="stock"
                    label="Stock Level & Quick Adjust"
                    align="center"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((p) => {
                  const marginPct =
                    p.cost > 0 ? Math.round(((p.price - p.cost) / p.cost) * 100) : null;
                  const isSelected = selectedIds.includes(p.id);

                  // Calculate stock health percentage for mini progress bar
                  const healthPct =
                    p.stock === 0
                      ? 0
                      : Math.min(100, Math.max(14, (p.stock / Math.max(p.reorder * 3, 20)) * 100));

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setDetailId(p.id)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected ? "bg-accent/5" : "hover:bg-surface-2/60"
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleSelect(p.id)}
                          className="flex items-center justify-center mx-auto text-ink-faint hover:text-ink transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-accent-solid" />
                          ) : (
                            <Square size={16} className="text-ink-faint hover:text-ink-soft" />
                          )}
                        </button>
                      </td>

                      {/* Product Item */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductPhoto
                            product={p}
                            size={42}
                            rounded="rounded-xl"
                            className="border border-line shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-bold text-ink text-xs group-hover:text-accent transition-colors">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-ink-faint">{p.unit}</div>
                          </div>
                        </div>
                      </td>

                      {/* SKU & Barcode */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-accent">{p.sku}</div>
                        <BarcodeSVG value={p.barcode} height={34} barWidth={2} fontSize={11} maxWidth={170} className="mt-1.5 border border-line" />
                      </td>

                      {/* Category & HSN */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{p.category}</div>
                        <div className="font-mono text-[10px] text-ink-faint">
                          HSN {p.hsn} · GST {p.gst}%
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="px-4 py-3 text-right font-mono text-xs text-ink-soft tabular">
                        {formatINR(p.cost)}
                      </td>

                      {/* Selling Price & Margin */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono text-xs font-extrabold text-ink tabular">
                          {formatINR(p.price)}
                        </div>
                        {marginPct !== null && (
                          <span
                            className={`text-[10px] font-bold ${
                              marginPct >= 30
                                ? "text-emerald-600 dark:text-emerald-400"
                                : marginPct > 10
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            +{marginPct}% margin
                          </span>
                        )}
                      </td>

                      {/* Stock Level with Tactile Stepper & Health Bar */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center gap-1.5">
                            {/* Decrement (-1) Button */}
                            <button
                              type="button"
                              onClick={(e) => quickAdjust(e, p, -1)}
                              disabled={p.stock <= 0}
                              title="Quick stock decrement (-1)"
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus size={11} strokeWidth={2.5} />
                            </button>

                            {/* Stock Badge */}
                            <Badge
                              variant={p.stock === 0 ? "bad" : isLow(p) ? "warn" : "good"}
                              className="font-mono text-[11px] px-2.5 py-0.5 cursor-pointer hover:brightness-95"
                              onClick={() => openAdjustModal(p, "in")}
                              title="Click to adjust stock"
                            >
                              {p.stock === 0
                                ? "Out of Stock"
                                : isLow(p)
                                ? `Low: ${p.stock} ${p.unit}`
                                : `${p.stock} ${p.unit}`}
                            </Badge>

                            {/* Increment (+1) Button */}
                            <button
                              type="button"
                              onClick={(e) => quickAdjust(e, p, 1)}
                              title="Quick stock increment (+1)"
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                            >
                              <Plus size={11} strokeWidth={2.5} />
                            </button>
                          </div>

                          {/* Visual Health Capacity Progress Bar */}
                          <div className="w-24 mt-1.5 h-1.5 rounded-full bg-surface-2 overflow-hidden border border-line/60">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                p.stock === 0
                                  ? "w-0 bg-rose-500"
                                  : isLow(p)
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${healthPct}%` }}
                            />
                          </div>

                          {isLow(p) && p.stock > 0 && (
                            <div className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                              Reorder at: {p.reorder}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openAdjustModal(p, "in")}
                            title="Adjust Stock Quantity & Log Reason"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-accent-light hover:text-accent transition-colors"
                          >
                            <SlidersHorizontal size={13} />
                          </button>
                          <button
                            onClick={() => openLabels([p.id])}
                            title="Print Barcode Label"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors"
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            title="Edit Product"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDetailId(p.id)}
                            title="View Full Details & History"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ============ POLISHED GRID VIEW ============ */
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          <AnimatePresence initial={false}>
            {filtered.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              const marginPct =
                p.cost > 0 ? Math.round(((p.price - p.cost) / p.cost) * 100) : null;
              const healthPct =
                p.stock === 0
                  ? 0
                  : Math.min(100, Math.max(14, (p.stock / Math.max(p.reorder * 3, 20)) * 100));

              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className={`card card-lift group flex cursor-pointer flex-col overflow-hidden border transition-all ${
                    isSelected ? "border-accent ring-2 ring-accent/20 bg-accent/5" : "border-line"
                  }`}
                  onClick={() => setDetailId(p.id)}
                >
                  <div className="relative bg-surface-2">
                    <ProductPhoto
                      product={p}
                      size={400}
                      rounded="rounded-none"
                      className="h-36! w-full! object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Checkbox Overlay */}
                    <div
                      className="absolute left-3 top-3 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(p.id);
                      }}
                    >
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-ink shadow-sm backdrop-blur-md"
                      >
                        {isSelected ? (
                          <CheckSquare size={15} className="text-accent-solid" />
                        ) : (
                          <Square size={15} className="text-ink-faint" />
                        )}
                      </button>
                    </div>

                    {/* High Contrast Solid Stock Badge */}
                    <div className="absolute left-11 top-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold shadow-sm border backdrop-blur-md ${
                          p.stock === 0
                            ? "bg-rose-500 text-white border-rose-600"
                            : isLow(p)
                            ? "bg-amber-400 text-amber-950 border-amber-300"
                            : "bg-surface/95 text-emerald-700 dark:text-emerald-300 border-line"
                        }`}
                      >
                        {p.stock === 0
                          ? "Out of Stock"
                          : isLow(p)
                          ? `Low • ${p.stock} ${p.unit}`
                          : `${p.stock} ${p.unit}`}
                      </span>
                    </div>

                    {/* Category Tag */}
                    <span className="absolute right-3 top-3 rounded-full bg-slate-950/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                      {p.category}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="truncate text-sm font-bold text-ink group-hover:text-accent transition-colors">
                        {p.name}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[11px] text-ink-faint">
                        <span>
                          HSN {p.hsn} · GST {p.gst}%
                        </span>
                        {marginPct !== null && (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{marginPct}% margin
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock Stepper in Grid */}
                    <div
                      className="mt-3 flex items-center justify-between rounded-xl bg-surface-2/60 p-2 border border-line"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-ink-soft">Inventory</span>
                        <div className="w-20 mt-1 h-1.5 rounded-full bg-surface overflow-hidden border border-line/60">
                          <div
                            className={`h-full rounded-full ${
                              p.stock === 0
                                ? "w-0 bg-rose-500"
                                : isLow(p)
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${healthPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => quickAdjust(e, p, -1)}
                          disabled={p.stock <= 0}
                          className="flex h-6 w-6 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus size={11} strokeWidth={2.5} />
                        </button>
                        <span className="font-mono text-xs font-bold text-ink px-1 tabular">
                          {p.stock}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => quickAdjust(e, p, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft hover:bg-emerald-500/10 hover:text-emerald-600"
                        >
                          <Plus size={11} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openAdjustModal(p, "in")}
                          title="Adjust stock"
                          className="flex h-6 w-6 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft hover:text-accent hover:border-accent ml-1"
                        >
                          <SlidersHorizontal size={11} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between border-t border-line/60 pt-2.5">
                      <div>
                        <div className="font-mono text-base font-extrabold tabular text-ink">
                          {formatINR(p.price)}
                        </div>
                        <div className="text-[10px] text-ink-faint">
                          MRP {formatINR(mrpOf(p))} incl. GST
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-accent">{p.sku}</span>
                    </div>

                    <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white p-1">
                      <BarcodeSVG
                        value={p.barcode}
                        height={38}
                        barWidth={2}
                        fontSize={12}
                        maxWidth={260}
                        className="mx-auto"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ============ FLOATING BULK ACTIONS BAR ============ */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5 shadow-2xl sm:gap-3 sm:px-4 md:bottom-6 md:w-auto md:justify-start"
          >
            <div className="flex shrink-0 items-center gap-2 border-r border-line pr-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-solid text-[11px] font-black text-white">
                {selectedIds.length}
              </span>
              <span className="text-xs font-bold text-ink">Selected</span>
            </div>

            <button
              onClick={() => openLabels(selectedIds)}
              className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-accent-solid px-3 py-2 text-xs font-bold text-white shadow-xs hover:brightness-110 active:scale-95 transition-all md:flex-none"
            >
              <Printer size={13} />
              <span className="sm:hidden">Print ({selectedIds.length})</span>
              <span className="hidden sm:inline">Print Labels ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => {
                const selectedProducts = products.filter((p) => selectedIds.includes(p.id));
                handleExportCSV(selectedProducts);
              }}
              aria-label="Export CSV"
              className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-ink hover:bg-surface-2 active:scale-95 transition-all"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink-faint hover:bg-surface-2 hover:text-ink transition-colors"
              title="Deselect all" aria-label="Deselect all"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ PRODUCT DETAIL MODAL ============ */}
      <Modal
        open={!!detail}
        onClose={() => setDetailId(null)}
        title={detail?.name ?? ""}
        subtitle={detail ? `${detail.category} · ${detail.sku}` : ""}
        width="max-w-3xl"
      >
        {detail && (
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <ProductPhoto product={detail} size={500} rounded="rounded-xl" className="h-64! w-full!" />
              <BarcodeSVG
                value={detail.barcode}
                height={72}
                barWidth={3}
                fontSize={16}
                maxWidth={380}
                caption
              />
              <div className="grid grid-cols-3 gap-2">
                <Btn
                  variant="outline"
                  className="flex-col gap-1 whitespace-nowrap px-1! py-2.5! text-xs sm:flex-row sm:gap-1.5"
                  onClick={() => {
                    setDetailId(null);
                    openLabels([detail.id]);
                  }}
                >
                  <Printer size={16} /> Print label
                </Btn>
                <Btn
                  variant="outline"
                  className="flex-col gap-1 whitespace-nowrap px-1! py-2.5! text-xs sm:flex-row sm:gap-1.5"
                  onClick={() => openAdjustModal(detail, "in")}
                >
                  <SlidersHorizontal size={16} /> Adjust stock
                </Btn>
                <Btn variant="outline" className="flex-col gap-1 whitespace-nowrap px-1! py-2.5! text-xs sm:flex-row sm:gap-1.5" onClick={() => openEdit(detail)}>
                  <Pencil size={16} /> Edit
                </Btn>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Stock"
                  value={`${detail.stock} ${detail.unit}`}
                  tone={detail.stock === 0 ? "bad" : isLow(detail) ? "warn" : "good"}
                />
                <Stat label="Reorder at" value={`${detail.reorder} ${detail.unit}`} />
                <Stat label="Sale price" value={formatINR(detail.price)} />
                <Stat label="Cost price" value={formatINR(detail.cost)} />
                <Stat label="MRP (incl. GST)" value={formatINR(mrpOf(detail))} />
                <Stat label="HSN / GST" value={`${detail.hsn} · ${detail.gst}%`} />
                <Stat
                  label="Margin"
                  value={
                    detail.cost
                      ? `${Math.round(((detail.price - detail.cost) / detail.price) * 100)}%`
                      : "—"
                  }
                />
                <Stat label="Valuation" value={formatINR(detail.cost * detail.stock)} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-soft">
                  <span className="flex items-center gap-1.5">
                    <History size={13} /> Stock Movement History
                  </span>
                  <button
                    onClick={() => openAdjustModal(detail, "in")}
                    className="text-[11px] font-bold text-accent hover:underline"
                  >
                    + Add entry
                  </button>
                </div>
                <div className="scroll-thin flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                  {stockLog
                    .filter((l) => l.productId === detail.id)
                    .slice(0, 15)
                    .map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">{l.reason}</div>
                          <div className="text-[10px] text-ink-faint">
                            {fmtDate(l.ts)} · {fmtTime(l.ts)} {l.ref && `· ${l.ref}`}
                          </div>
                        </div>
                        <span
                          className={`font-mono font-bold tabular ${
                            l.delta > 0
                              ? "text-good"
                              : l.delta < 0
                              ? "text-bad"
                              : "text-ink-faint"
                          }`}
                        >
                          {l.delta > 0 ? "+" : ""}
                          {l.delta}
                        </span>
                      </div>
                    ))}
                  {stockLog.filter((l) => l.productId === detail.id).length === 0 && (
                    <div className="py-4 text-center text-xs text-ink-faint">
                      No stock adjustments logged yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ============ ADD / EDIT DRAWER ============ */}
      <Drawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? "Edit product" : "New product"}
        subtitle={
          editId
            ? "Barcode and SKU stay the same"
            : "Barcode and SKU are created automatically when you save"
        }
      >
        {created ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-2 rounded-xl border border-good/30 bg-good-light px-4 py-3 text-sm font-semibold text-good">
              <Check size={16} /> Product added: barcode is ready
            </div>
            <div className="card flex flex-col items-center gap-3 p-5">
              <ProductPhoto product={created} size={160} rounded="rounded-xl" />
              <div className="text-center">
                <div className="text-sm font-bold text-ink">{created.name}</div>
                <div className="font-mono text-xs font-semibold text-accent">{created.sku}</div>
              </div>
              <BarcodeSVG
                value={created.barcode}
                height={72}
                barWidth={3}
                fontSize={16}
                maxWidth={340}
                caption
              />
              <div className="text-[11px] text-ink-faint">
                EAN-13 · scannable with any laser scanner or phone camera
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Btn
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  openLabels([created.id]);
                }}
              >
                <Printer size={15} /> Print label
              </Btn>
              <Btn
                variant="outline"
                onClick={() => {
                  setForm(emptyForm());
                  setCreated(null);
                }}
              >
                <Plus size={15} /> Add another
              </Btn>
            </div>
            <Btn onClick={() => setFormOpen(false)}>Done</Btn>
          </motion.div>
        ) : (
          (() => {
            const gstN = Number(form.gst) || 0;
            const priceN = Number(form.price) || 0;
            const costN = Number(form.cost) || 0;
            const mrp = Math.round(priceN * (1 + gstN / 100));
            const margin = priceN > 0 && costN > 0 ? Math.round(((priceN - costN) / priceN) * 100) : null;
            const step = "mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-faint";
            const num = "flex h-5 w-5 items-center justify-center rounded-md bg-accent-light text-[10px] font-black text-accent-dark";
            const chip = (on) => `rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${on ? "border-accent-solid bg-accent-solid text-white shadow-sm" : "border-line bg-surface text-ink-soft hover:border-accent hover:text-ink"}`;
            return (
              <form onSubmit={submit} className="flex flex-col gap-5">
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />

                {/* 1. photo */}
                <section>
                  <div className={step}><span className={num}>1</span> Photo</div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface-2 p-3 text-left transition-colors hover:border-accent"
                  >
                    <span className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface ring-1 ring-line">
                      {form.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.photo} alt="Product" className="h-full w-full object-cover" />
                      ) : (
                        <ImagePlus size={28} className="text-ink-faint transition-transform group-hover:scale-110" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-accent-dark"><Camera size={15} /> {form.photo ? "Change photo" : "Take or upload photo"}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink-soft">Shows on bills, invoices and in the catalogue.</span>
                    </span>
                    {form.photo && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setForm({ ...form, photo: null }); }}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                        aria-label="Remove photo"
                      >
                        <X size={14} />
                      </span>
                    )}
                  </button>
                </section>

                {/* 2. details */}
                <section>
                  <div className={step}><span className={num}>2</span> Product details</div>
                  <div className="flex flex-col gap-3.5">
                    <Field label="Product name">
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chanderi Silk Saree" className="input h-12 text-base font-semibold" />
                    </Field>
                    <div>
                      <div className="mb-1.5 text-xs font-medium text-ink-soft">Category</div>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setForm({ ...form, category: c, hsn: HSN_HINT[c] ?? form.hsn, unit: c === "Fabric Roll" ? "mtr" : "pcs" })}
                            className={chip(form.category === c)}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Field label="HSN code" hint="Filled automatically for the category. Change it if your accountant uses another code.">
                      <input value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} className="input font-mono" />
                    </Field>
                  </div>
                </section>

                {/* 3. price and GST */}
                <section>
                  <div className={step}><span className={num}>3</span> Price and GST</div>
                  <div className="flex flex-col gap-3.5">
                    <div>
                      <div className="mb-1.5 text-xs font-medium text-ink-soft">GST rate</div>
                      <div className="flex flex-wrap gap-1.5">
                        {GST_SLABS.map((g) => (
                          <button key={g} type="button" onClick={() => setForm({ ...form, gst: g })} className={chip(Number(form.gst) === g)}>{g}%</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Selling price (excl. GST)">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-ink-faint">₹</span>
                          <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="1500" className="input pl-7! font-mono font-bold" />
                        </div>
                      </Field>
                      <Field label="Cost price">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-ink-faint">₹</span>
                          <input type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="1000" className="input pl-7! font-mono font-bold" />
                        </div>
                      </Field>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl border border-accent/25 bg-accent-light">
                      {[["MRP (incl. GST)", priceN > 0 ? formatINR(mrp) : "-"], ["GST amount", priceN > 0 ? formatINR((priceN * gstN) / 100) : "-"], ["Margin", margin !== null ? `${margin}%` : "-"]].map(([k, v]) => (
                        <div key={k} className="px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-wide text-accent-dark/70">{k}</div>
                          <div className="mt-0.5 whitespace-nowrap font-mono text-sm font-black text-accent-dark">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* 4. stock */}
                <section>
                  <div className={step}><span className={num}>4</span> Stock</div>
                  <div className="flex flex-col gap-3.5">
                    <div className={`grid gap-3 ${editId ? "grid-cols-1" : "grid-cols-2"}`}>
                      {!editId && (
                        <Field label="Opening stock">
                          <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="20" className="input font-mono font-bold" />
                        </Field>
                      )}
                      <Field label="Reorder level" hint="You get an alert at or below this.">
                        <input type="number" min="0" value={form.reorder} onChange={(e) => setForm({ ...form, reorder: e.target.value })} className="input font-mono font-bold" />
                      </Field>
                    </div>
                    <div>
                      <div className="mb-1.5 text-xs font-medium text-ink-soft">Sold in</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {["pcs", "mtr", "set", "kg"].map((u) => (
                          <button key={u} type="button" onClick={() => setForm({ ...form, unit: u })} className={`${chip(form.unit === u)} text-center`}>{u}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 5. barcode */}
                {!editId && (
                  <section>
                    <div className={step}><span className={num}>5</span> Barcode</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        ["auto", "Create one for me", "Real EAN-13 and SKU, made when you save", Sparkles],
                        ["custom", "Use existing barcode", "Scan or type the one on the item", ScanBarcode],
                      ].map(([m, label, hint, Icon]) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setForm({ ...form, barcodeMode: m })}
                          className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-all ${form.barcodeMode === m ? "border-accent-solid bg-accent-light ring-2 ring-accent/20" : "border-line bg-surface hover:border-accent"}`}
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${form.barcodeMode === m ? "bg-accent-solid text-white" : "bg-surface-2 text-ink-faint"}`}><Icon size={16} /></span>
                          <span>
                            <span className="block text-sm font-bold text-ink">{label}</span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">{hint}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    {form.barcodeMode === "custom" && (
                      <div className="mt-3 flex gap-2">
                        <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan with scanner or type" className="input h-12 font-mono" />
                        <Btn type="button" variant="soft" className="h-12 shrink-0 px-4!" onClick={() => openCamera({ title: "Scan the product barcode" })} aria-label="Scan with camera">
                          <Camera size={17} />
                        </Btn>
                      </div>
                    )}
                  </section>
                )}

                {error && <div className="rounded-xl border border-bad/30 bg-bad-light px-3.5 py-2.5 text-sm font-semibold text-bad">{error}</div>}

                <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:-mb-5 sm:px-6 sm:py-4">
                  <Btn type="submit" size="lg" className="w-full">
                    {editId ? "Save changes" : "Save and generate barcode"}
                  </Btn>
                </div>
              </form>
            );
          })()
        )}
      </Drawer>

      {/* ============ DEDICATED STOCK ADJUSTMENT MODAL ============ */}
      <Modal
        open={adjustModal.open}
        onClose={() =>
          setAdjustModal({ open: false, product: null, type: "in", qty: "", reason: "" })
        }
        title="Adjust Inventory Stock"
        subtitle={
          adjustModal.product
            ? `${adjustModal.product.name} · SKU: ${adjustModal.product.sku}`
            : ""
        }
        width="max-w-md"
      >
        {adjustModal.product && (() => {
          const adj = adjustModal;
          const prod = adj.product;
          const val = Number(adj.qty) || 0;
          const next = adj.type === "in" ? prod.stock + val : adj.type === "out" ? prod.stock - val : val;
          const delta = next - prod.stock;
          const modes = [
            { id: "in", label: "Stock In", hint: "Purchase or return", icon: Plus, color: "text-emerald-600" },
            { id: "out", label: "Stock Out", hint: "Damage or loss", icon: Minus, color: "text-rose-600" },
            { id: "audit", label: "Set Exact", hint: "Physical count", icon: SlidersHorizontal, color: "text-blue-600" },
          ];
          const close = () => setAdjustModal({ open: false, product: null, type: "in", qty: "", reason: "" });
          const setQty = (n) => setAdjustModal((m) => ({ ...m, qty: String(Math.max(0, n)) }));
          const pct = Math.min(100, Math.round((prod.stock / Math.max(1, prod.reorder * 3)) * 100));
          return (
            <form onSubmit={handleApplyAdjust} className="flex min-h-full flex-col">
              <div className="flex flex-1 flex-col gap-5 p-4 sm:p-5">
                <div className="rounded-2xl border border-line bg-surface-2 p-4">
                  <div className="flex items-center gap-3">
                    <ProductPhoto product={prod} size={56} rounded="rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-ink">{prod.name}</div>
                      <div className="text-[11px] text-ink-faint">Reorder at {prod.reorder} {prod.unit}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">In stock</div>
                      <div className="font-mono text-2xl font-black leading-none text-ink">{prod.stock}</div>
                      <div className="text-[10px] text-ink-faint">{prod.unit}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                    <div className={`h-full rounded-full ${prod.stock <= prod.reorder ? "bg-amber-500" : "bg-accent-solid"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-2 p-1.5">
                  {modes.map((m) => {
                    const on = adj.type === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setAdjustModal((x) => ({ ...x, type: m.id, qty: m.id === "audit" ? String(prod.stock) : x.type === "audit" ? "" : x.qty }))}
                        className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-center transition-all ${on ? "bg-surface shadow-sm ring-1 ring-line" : "text-ink-soft"}`}
                      >
                        <m.icon size={17} className={on ? m.color : "text-ink-faint"} />
                        <span className={`text-xs font-bold ${on ? "text-ink" : ""}`}>{m.label}</span>
                        <span className="text-[10px] font-medium text-ink-faint">{m.hint}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <div className="mb-1.5 text-xs font-bold text-ink-soft">
                    {adj.type === "audit" ? `Counted on shelf (${prod.unit})` : adj.type === "in" ? `Quantity to add (${prod.unit})` : `Quantity to remove (${prod.unit})`}
                  </div>
                  <div className="flex items-stretch gap-2">
                    <button type="button" onClick={() => setQty(val - 1)} className="flex w-12 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft active:scale-95" aria-label="Decrease"><Minus size={18} /></button>
                    <input type="number" min="0" autoFocus value={adj.qty} onChange={(e) => setAdjustModal((m) => ({ ...m, qty: e.target.value }))} placeholder={adj.type === "audit" ? String(prod.stock) : "0"} className="input h-12 flex-1 text-center font-mono text-xl font-black" />
                    <button type="button" onClick={() => setQty(val + 1)} className="flex w-12 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft active:scale-95" aria-label="Increase"><Plus size={18} /></button>
                  </div>
                  {adj.type !== "audit" && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[1, 5, 10, 25].map((n) => (
                        <button key={n} type="button" onClick={() => setQty(val + n)} className="rounded-lg border border-line bg-surface px-3 py-1 font-mono text-xs font-bold text-ink-soft hover:border-accent hover:text-accent">+{n}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${next < 0 ? "border-rose-500/40 bg-rose-500/10" : "border-accent/30 bg-accent-light"}`}>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">New stock will be</div>
                    <div className={`font-mono text-xl font-black ${next < 0 ? "text-rose-600" : "text-ink"}`}>{next} {prod.unit}</div>
                  </div>
                  {val > 0 && delta !== 0 && (
                    <span className={`rounded-full px-3 py-1 font-mono text-sm font-extrabold ${delta > 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300"}`}>{delta > 0 ? "+" : ""}{delta}</span>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 text-xs font-bold text-ink-soft">Reason (optional)</div>
                  <input
                    type="text"
                    value={adj.reason}
                    onChange={(e) => setAdjustModal((m) => ({ ...m, reason: e.target.value }))}
                    placeholder={adj.type === "in" ? "Supplier delivery, returned piece" : adj.type === "out" ? "Damaged fabric, sample piece" : "Annual physical count"}
                    className="input text-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(adj.type === "in" ? ["Supplier shipment", "Stock transfer", "Customer return", "Sample return"] : adj.type === "out" ? ["Damaged goods", "Sample given", "Internal store use", "Defective fabric"] : ["Quarterly audit", "Physical count correction", "Shelf restack check"]).map((r) => (
                      <button key={r} type="button" onClick={() => setAdjustModal((m) => ({ ...m, reason: r }))} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${adj.reason === r ? "border-accent bg-accent-light text-accent-dark" : "border-line bg-surface-2 text-ink-soft hover:border-accent hover:text-ink"}`}>{r}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 flex gap-2 border-t border-line bg-surface p-3 sm:p-4">
                <Btn type="button" variant="outline" size="lg" className="flex-1" onClick={close}>Cancel</Btn>
                <Btn type="submit" size="lg" className="flex-[2]">Confirm adjustment</Btn>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* ============ LABEL PRINTING MODAL ============ */}
      <Modal
        open={labelOpen && !printing}
        onClose={() => setLabelOpen(false)}
        title="Print barcode labels"
        subtitle="Pick products and how many tags, then preview"
        width="max-w-2xl"
      >
        {(() => {
          const q = labelQuery.trim().toLowerCase();
          const visible = labelItems.filter(({ product: p }) => (labelCat === "All" || p.category === labelCat) && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q)));
          const total = labelsToPrint.reduce((sum, l) => sum + l.copies, 0);
          const setCopies = (id, n) => setLabelItems((arr) => arr.map((x) => (x.product.id === id ? { ...x, copies: Math.max(0, Math.min(200, n)) } : x)));
          const preset = (fn) => setLabelItems((arr) => arr.map((x) => ({ ...x, copies: fn(x.product, x.copies) })));
          const seg = (on) => `flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${on ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-soft"}`;
          return (
            <div className="flex min-h-full flex-col">
              <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5">
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input value={labelQuery} onChange={(e) => setLabelQuery(e.target.value)} placeholder="Search product, SKU or barcode" className="input pl-9!" />
                </div>
                <div className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {["All", ...CATEGORIES].map((c) => (
                    <button key={c} type="button" onClick={() => setLabelCat(c)} className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${labelCat === c ? "border-accent-solid bg-accent-solid text-white" : "border-line bg-surface text-ink-soft"}`}>{c}</button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Btn size="sm" variant="outline" onClick={() => preset((p) => (p.stock > 0 ? 1 : 0))}>1 label each</Btn>
                  <Btn size="sm" variant="outline" onClick={() => preset((p) => Math.min(200, p.stock))}>1 per piece in stock</Btn>
                  <Btn size="sm" variant="outline" onClick={() => preset((p) => (isLow(p) ? Math.max(1, p.stock) : 0))}>Low stock</Btn>
                  <Btn size="sm" variant="outline" onClick={() => preset(() => 0)}>Clear</Btn>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                {visible.length === 0 && <div className="py-10 text-center text-sm text-ink-soft">No products match your search.</div>}
                {visible.map((l) => {
                  const on = l.copies > 0;
                  return (
                    <div key={l.product.id} className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-colors ${on ? "border-accent/50 bg-accent-light/60" : "border-line bg-surface"}`}>
                      <button type="button" onClick={() => setCopies(l.product.id, on ? 0 : 1)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={on ? "Remove from print list" : "Add to print list"}>
                        <ProductPhoto product={l.product} size={48} rounded="rounded-xl" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-ink">{l.product.name}</span>
                          <span className="block font-mono text-[11px] text-ink-faint">{l.product.sku} · stock {l.product.stock} · {formatINR(mrpOf(l.product))}</span>
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => setCopies(l.product.id, l.copies - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft active:scale-95" aria-label="Fewer labels"><Minus size={15} /></button>
                        <input type="number" min="0" max="200" value={l.copies} onChange={(e) => setCopies(l.product.id, Number(e.target.value) || 0)} className="input h-9 w-12! px-1! text-center font-mono font-bold" />
                        <button type="button" onClick={() => setCopies(l.product.id, l.copies + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft active:scale-95" aria-label="More labels"><Plus size={15} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="sticky bottom-0 flex flex-col gap-3 border-t border-line bg-surface p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Tags per row</div>
                    <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
                      {[2, 3, 4].map((n) => (
                        <button key={n} type="button" onClick={() => setLabelOpts((o) => ({ ...o, cols: n }))} className={seg(labelOpts.cols === n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Show price</div>
                    <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
                      {[[true, "Yes"], [false, "No"]].map(([v, label]) => (
                        <button key={label} type="button" onClick={() => setLabelOpts((o) => ({ ...o, price: v }))} className={seg(labelOpts.price === v)}>{label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <Btn size="lg" className="w-full" disabled={!total} onClick={() => setPrinting(true)}>
                  <Printer size={16} /> Preview {total} {total === 1 ? "label" : "labels"}{labelsToPrint.length ? ` · ${labelsToPrint.length} ${labelsToPrint.length === 1 ? "product" : "products"}` : ""}
                </Btn>
              </div>
            </div>
          );
        })()}
      </Modal>

      <PrintableModal
        open={labelOpen && printing}
        onClose={() => {
          setPrinting(false);
          setLabelOpen(false);
        }}
        title="Label preview"
        subtitle="Print it, or save it as a PDF"
        width="max-w-3xl"
      >
        <LabelSheet items={labelsToPrint} businessName={business.name} cols={labelOpts.cols} showPrice={labelOpts.price} />
      </PrintableModal>

      {toast}
    </div>
  );
}

function SortHeader({ field, label, align = "left", sortField, sortDir, onSort, className = "" }) {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3.5 cursor-pointer select-none transition-colors hover:text-ink ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } ${active ? "text-accent font-black" : "text-ink-faint"} ${className}`}
    >
      <div
        className={`inline-flex items-center gap-1.5 ${
          align === "right"
            ? "justify-end"
            : align === "center"
            ? "justify-center"
            : "justify-start"
        }`}
      >
        <span>{label}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp size={12} className="text-accent" />
          ) : (
            <ArrowDown size={12} className="text-accent" />
          )
        ) : (
          <ArrowUpDown size={11} className="opacity-40" />
        )}
      </div>
    </th>
  );
}

function Stat({ label, value, tone }) {
  const color =
    tone === "bad"
      ? "text-bad"
      : tone === "warn"
      ? "text-amber"
      : tone === "good"
      ? "text-good"
      : "text-ink";
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold tabular ${color}`}>{value}</div>
    </div>
  );
}
