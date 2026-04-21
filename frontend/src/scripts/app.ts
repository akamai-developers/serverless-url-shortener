// ============================================================
//  Types
// ============================================================
export interface Link {
  short: string;
  url: string;
  hits: number;
}

// ============================================================
//  API helpers
// ============================================================
const API = "/_api/links";

export async function fetchLinks(): Promise<Link[]> {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text || text.trim() === "") return [];
  return JSON.parse(text);
}

export async function checkAvailability(short: string): Promise<boolean> {
  const res = await fetch(`${API}/${encodeURIComponent(short)}/available`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.available as boolean;
}

export async function createLink(short: string, url: string): Promise<void> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ short, url }),
  });
  if (res.status === 400) {
    const text = await res.text().catch(() => "Duplicate short code");
    throw new Error("Duplicate key: " + text);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function updateLink(short: string, url: string): Promise<void> {
  const res = await fetch(`${API}/${encodeURIComponent(short)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function deleteLink(short: string): Promise<void> {
  const res = await fetch(`${API}/${encodeURIComponent(short)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ============================================================
//  Utilities
// ============================================================
export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function show(el: HTMLElement) { el.hidden = false; }
export function hide(el: HTMLElement) { el.hidden = true; }

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// ============================================================
//  Toast
// ============================================================
export function showToast(
  msg: string,
  type: "success" | "error" | "info" = "info"
) {
  const container = document.getElementById("toast-container") as HTMLElement;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-dot"></span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("removing");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, 3000);
}

// ============================================================
//  Render helpers
// ============================================================
export function setTableState(
  state: "loading" | "empty" | "data" | "error"
) {
  const loadingState = document.getElementById("loading-state") as HTMLElement;
  const emptyState   = document.getElementById("empty-state")   as HTMLElement;
  const tableWrapper = document.getElementById("table-wrapper") as HTMLElement;
  const errorState   = document.getElementById("error-state")   as HTMLElement;
  hide(loadingState); hide(emptyState); hide(tableWrapper); hide(errorState);
  if (state === "loading") show(loadingState);
  else if (state === "empty") show(emptyState);
  else if (state === "data")  show(tableWrapper);
  else if (state === "error") show(errorState);
}

export function buildRow(link: Link): string {
  const s = escHtml(link.short);
  const u = escHtml(link.url);
  return `
    <tr data-short="${s}">
      <td><a class="short-link" href="/${s}" target="_blank" rel="noopener">/${s}</a></td>
      <td><a class="dest-url" href="${u}" target="_blank" rel="noopener" title="${u}">${u}</a></td>
      <td class="td-hits"><span class="hits-badge">${link.hits}</span></td>
      <td class="td-actions">
        <div class="action-btns" id="actions-${s}">
          <button class="btn btn-sm btn-edit edit-btn"     data-short="${s}" aria-label="Edit ${s}">Edit</button>
          <button class="btn btn-sm btn-danger delete-btn" data-short="${s}" aria-label="Delete ${s}">Delete</button>
        </div>
      </td>
    </tr>`;
}

export function renderLinks(links: Link[]) {
  const linkCount   = document.getElementById("link-count")   as HTMLElement;
  const linksTbody  = document.getElementById("links-tbody")  as HTMLTableSectionElement;
  linkCount.textContent = `${links.length} link${links.length !== 1 ? "s" : ""}`;
  if (links.length === 0) { setTableState("empty"); return; }
  setTableState("data");
  linksTbody.innerHTML = links.map(buildRow).join("");
  attachRowListeners();
}

// ============================================================
//  Row listeners
// ============================================================
function attachRowListeners() {
  document.querySelectorAll<HTMLButtonElement>(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => openEditModal(btn.dataset.short!));
  });
  document.querySelectorAll<HTMLButtonElement>(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => showDeleteConfirm(btn.dataset.short!));
  });
}

// ============================================================
//  Load links
// ============================================================
export async function loadLinks() {
  const errorMessage = document.getElementById("error-message") as HTMLElement;
  setTableState("loading");
  const linkCount = document.getElementById("link-count") as HTMLElement;
  linkCount.textContent = "";
  try {
    const links = await fetchLinks();
    renderLinks(links);
  } catch (err: any) {
    setTableState("error");
    errorMessage.textContent = err.message ?? "Unknown error";
  }
}

// ============================================================
//  Delete (inline confirm)
// ============================================================
function showDeleteConfirm(short: string) {
  const container = document.getElementById(`actions-${short}`);
  if (!container) return;
  const s = escHtml(short);
  container.innerHTML = `
    <div class="confirm-inline">
      <span class="confirm-label">Sure?</span>
      <button class="btn btn-sm btn-confirm confirm-yes" data-short="${s}">Yes, delete</button>
      <button class="btn btn-sm btn-ghost confirm-no"    data-short="${s}">Cancel</button>
    </div>`;

  container.querySelector<HTMLButtonElement>(".confirm-yes")!
    .addEventListener("click", async () => {
      try {
        await deleteLink(short);
        showToast(`Deleted /${short}`, "success");
        await loadLinks();
      } catch (err: any) {
        showToast(`Error: ${err.message}`, "error");
      }
    });

  container.querySelector<HTMLButtonElement>(".confirm-no")!
    .addEventListener("click", () => {
      container.innerHTML = `
        <button class="btn btn-sm btn-edit   edit-btn"   data-short="${s}" aria-label="Edit ${s}">Edit</button>
        <button class="btn btn-sm btn-danger delete-btn" data-short="${s}" aria-label="Delete ${s}">Delete</button>`;
      container.querySelector<HTMLButtonElement>(".edit-btn")!
        .addEventListener("click", () => openEditModal(short));
      container.querySelector<HTMLButtonElement>(".delete-btn")!
        .addEventListener("click", () => showDeleteConfirm(short));
    });
}

// ============================================================
//  Edit modal
// ============================================================
let editingShort: string | null = null;

export function openEditModal(short: string) {
  const editModal   = document.getElementById("edit-modal")          as HTMLElement;
  const modalShort  = document.getElementById("modal-short-display") as HTMLElement;
  const modalUrl    = document.getElementById("modal-url")           as HTMLInputElement;
  editingShort = short;
  modalShort.textContent = short;
  const row   = document.querySelector<HTMLTableRowElement>(`tr[data-short="${escHtml(short)}"]`);
  const urlEl = row?.querySelector<HTMLAnchorElement>(".dest-url");
  modalUrl.value = urlEl?.href ?? "";
  show(editModal);
  modalUrl.focus();
}

export function closeEditModal() {
  const editModal = document.getElementById("edit-modal") as HTMLElement;
  const modalUrl  = document.getElementById("modal-url")  as HTMLInputElement;
  hide(editModal);
  editingShort = null;
  modalUrl.value = "";
}

// ============================================================
//  Bootstrap
// ============================================================
export function initApp() {
  const addForm       = document.getElementById("add-form")       as HTMLFormElement;
  const inputShort    = document.getElementById("input-short")    as HTMLInputElement;
  const inputUrl      = document.getElementById("input-url")      as HTMLInputElement;
  const addBtn        = document.getElementById("add-btn")        as HTMLButtonElement;
  const shortStatus   = document.getElementById("short-status")   as HTMLElement;
  const shortFeedback = document.getElementById("short-feedback") as HTMLElement;
  const urlFeedback   = document.getElementById("url-feedback")   as HTMLElement;
  const retryBtn      = document.getElementById("retry-btn")      as HTMLButtonElement;
  const editModal     = document.getElementById("edit-modal")     as HTMLElement;
  const modalUrl      = document.getElementById("modal-url")      as HTMLInputElement;
  const modalSave     = document.getElementById("modal-save")     as HTMLButtonElement;
  const modalCancel   = document.getElementById("modal-cancel")   as HTMLButtonElement;

  // Track availability so submit can be blocked
  let shortAvailable: boolean | null = null;
  let checkingShort = false;

  function setShortState(
    state: "idle" | "checking" | "available" | "taken" | "invalid"
  ) {
    inputShort.classList.remove("valid", "invalid");
    shortStatus.textContent = "";
    shortFeedback.textContent = "";
    shortFeedback.className = "field-feedback";

    if (state === "checking") {
      checkingShort = true;
      shortStatus.textContent = "⏳";
      shortFeedback.textContent = "Checking availability…";
      shortFeedback.classList.add("checking");
    } else if (state === "available") {
      checkingShort = false;
      shortAvailable = true;
      inputShort.classList.add("valid");
      shortStatus.textContent = "✓";
      shortFeedback.textContent = "Short code is available!";
      shortFeedback.classList.add("success");
    } else if (state === "taken") {
      checkingShort = false;
      shortAvailable = false;
      inputShort.classList.add("invalid");
      shortStatus.textContent = "✗";
      shortFeedback.textContent = "This short code is already taken. Please choose another.";
      shortFeedback.classList.add("error");
    } else if (state === "invalid") {
      checkingShort = false;
      shortAvailable = null;
      inputShort.classList.add("invalid");
      shortFeedback.textContent = "Only letters, numbers, hyphens and underscores allowed.";
      shortFeedback.classList.add("error");
    } else {
      // idle
      checkingShort = false;
      shortAvailable = null;
    }
  }

  const doAvailabilityCheck = debounce(async (value: string) => {
    if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
      setShortState(value ? "invalid" : "idle");
      return;
    }
    setShortState("checking");
    try {
      const available = await checkAvailability(value);
      // Only apply if the input hasn't changed while we were waiting
      if (inputShort.value.trim() === value) {
        setShortState(available ? "available" : "taken");
      }
    } catch {
      // Silently ignore network errors during the live check
      setShortState("idle");
    }
  }, 400);

  inputShort.addEventListener("input", () => {
    shortAvailable = null;
    const value = inputShort.value.trim();
    doAvailabilityCheck(value);
  });

  inputUrl.addEventListener("input", () => {
    inputUrl.classList.remove("invalid");
    urlFeedback.textContent = "";
    urlFeedback.className = "field-feedback";
  });

  // ---- Retry ----
  retryBtn.addEventListener("click", loadLinks);

  // ---- Add form submit ----
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const short = inputShort.value.trim();
    const url   = inputUrl.value.trim();
    let valid = true;

    // Validate short code format
    if (!short || !/^[A-Za-z0-9_-]+$/.test(short)) {
      setShortState("invalid");
      valid = false;
    } else if (shortAvailable === false) {
      // Already marked taken — keep state, just block
      valid = false;
    } else if (shortAvailable === null && !checkingShort) {
      // User never waited for the check — run it now synchronously
      setShortState("checking");
      try {
        const available = await checkAvailability(short);
        shortAvailable = available;
        setShortState(available ? "available" : "taken");
        if (!available) valid = false;
      } catch {
        // Cannot verify — let the server decide; proceed optimistically
      }
    } else if (checkingShort) {
      // Still in-flight — just bail; the debounce will update the UI
      return;
    }

    // Validate URL
    if (!url) {
      inputUrl.classList.add("invalid");
      urlFeedback.textContent = "Please enter a destination URL.";
      urlFeedback.className = "field-feedback error";
      valid = false;
    }

    if (!valid) return;

    addBtn.disabled = true;
    addBtn.textContent = "Adding…";
    try {
      await createLink(short, url);
      showToast("Link created!", "success");
      addForm.reset();
      setShortState("idle");
      urlFeedback.textContent = "";
      await loadLinks();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, "error");
    } finally {
      addBtn.disabled = false;
      addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Link`;
    }
  });

  // ---- Modal ----
  modalCancel.addEventListener("click", closeEditModal);
  editModal.addEventListener("click", (e) => { if (e.target === editModal) closeEditModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEditModal(); });

  modalSave.addEventListener("click", async () => {
    const url = modalUrl.value.trim();
    if (!url || !editingShort) { modalUrl.classList.add("invalid"); return; }
    modalUrl.classList.remove("invalid");
    modalSave.disabled = true;
    modalSave.textContent = "Saving…";
    try {
      await updateLink(editingShort, url);
      showToast(`Link /${editingShort} updated!`, "success");
      closeEditModal();
      await loadLinks();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, "error");
    } finally {
      modalSave.disabled = false;
      modalSave.textContent = "Save";
    }
  });

  modalUrl.addEventListener("keydown", (e) => { if (e.key === "Enter") modalSave.click(); });

  // ---- Initial load ----
  loadLinks();
}
