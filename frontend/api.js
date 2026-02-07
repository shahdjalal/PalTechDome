import { API_BASE } from "../config"; 

export async function encryptFile(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/encrypt`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return await res.blob();
}

export async function decryptFile(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/decrypt`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return await res.blob();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
