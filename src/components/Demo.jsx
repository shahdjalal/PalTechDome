import { useMemo, useRef, useState } from "react";
import "./Demo.css";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { GrCheckboxSelected } from "react-icons/gr";
import { FaUpload } from "react-icons/fa";
import { FcSearch } from "react-icons/fc";
import { API_BASE } from "../config";

const PREVIEW_LIMIT = 6;


export default function Demo() {
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState("encrypt");

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");

  const [columns, setColumns] = useState([]);
  const [tableRows, setTableRows] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptSuccess, setEncryptSuccess] = useState(false);

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptSuccess, setDecryptSuccess] = useState(false);

  const openFilePicker = () => fileInputRef.current?.click();

  const resetAll = () => {
    setSelectedFile(null);
    setSelectedFileName("");
    setColumns([]);
    setTableRows([]);
    setSearchText("");
    setErrorMessage("");
    setIsEncrypting(false);
    setEncryptSuccess(false);
    setIsDecrypting(false);
    setDecryptSuccess(false);
    setMode("encrypt");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const parseCsvFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data || [];
        if (!data.length) {
          setErrorMessage("The file is empty or contains no valid rows.");
          return;
        }

        const headers = Object.keys(data[0]).filter((h) => h && h.trim() !== "");
        const normalized = data.map((row) => {
          const obj = {};
          headers.forEach((h) => (obj[h] = row[h]));
          return obj;
        });

        setColumns(headers);
        setTableRows(normalized);
        setErrorMessage("");
      },
      error: () => setErrorMessage("Failed to parse the CSV file."),
    });
  };

  const parseExcelFile = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!json.length) {
        setErrorMessage("The Excel sheet is empty or contains no valid rows.");
        return;
      }

      const headers = Object.keys(json[0]);
      setColumns(headers);
      setTableRows(json);
      setErrorMessage("");
    } catch {
      setErrorMessage("Failed to parse the Excel file.");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset preview (but keep file selection)
    setColumns([]);
    setTableRows([]);
    setSearchText("");
    setErrorMessage("");
    setEncryptSuccess(false);
    setDecryptSuccess(false);

    setSelectedFile(file);
    setSelectedFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();

    // preview only for CSV/Excel
    if (ext === "csv") return parseCsvFile(file);
    if (ext === "xlsx" || ext === "xls") return parseExcelFile(file);

    // not CSV/Excel → no preview, but allow encrypt/decrypt
    setErrorMessage("");
  };

  const filteredRows = useMemo(() => {
    if (!searchText.trim()) return tableRows;
    const q = searchText.toLowerCase();
    return tableRows.filter((row) =>
      columns.some((col) => String(row[col] ?? "").toLowerCase().includes(q))
    );
  }, [tableRows, columns, searchText]);

  const handleEncrypt = async () => {
    if (!selectedFile) return;

    setIsEncrypting(true);
    setErrorMessage("");
    setEncryptSuccess(false);
    setDecryptSuccess(false);

    try {
      const fd = new FormData();
      fd.append("file", selectedFile);

      const res = await fetch(`${API_BASE}/encrypt`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Encryption failed");
      }

      const blob = await res.blob();
      downloadBlob(blob, `${selectedFile.name}.enc`);
      setEncryptSuccess(true);
    } catch (e) {
      setErrorMessage(e.message || "Encryption failed");
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    if (!selectedFile) return;

    setIsDecrypting(true);
    setErrorMessage("");
    setDecryptSuccess(false);
    setEncryptSuccess(false);

    try {
      const fd = new FormData();
      fd.append("file", selectedFile);

      const res = await fetch(`${API_BASE}/decrypt`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Decryption failed");
      }

      const blob = await res.blob();

      let outName = selectedFile.name;
      if (outName.endsWith(".enc")) outName = outName.slice(0, -4);
      else outName = "decrypted_" + outName;

      downloadBlob(blob, outName);
      setDecryptSuccess(true);
    } catch (e) {
      setErrorMessage(e.message || "Decryption failed");
    } finally {
      setIsDecrypting(false);
    }
  };

  const isBusy = isEncrypting || isDecrypting;

  return (
    <div className="demoCard">
      <div className="demoHeader">
        <div>
          <h3 className="demoTitle">Live Demo</h3>
          <p className="demoSub">
            Upload a file, preview CSV/Excel locally, then encrypt/decrypt via backend.
          </p>
        </div>
      </div>

      {/* Upload */}
      <div className="uploadCard">
        <div className="uploadTop">
          <div className="uploadLabel">Upload File</div>
          {selectedFileName && (
            <button className="linkBtn" onClick={resetAll}>
              Remove
            </button>
          )}
        </div>

        <div className="dropAreaLight">
          <div className="dropIconLight"><FaUpload />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <button className="btnP" onClick={openFilePicker} disabled={isBusy}>
            Choose File
          </button>
          <div className="hint">
            {selectedFileName ? (
              <div className="fileSelected">
                <GrCheckboxSelected color="green" size={18} />
                <span>
                  Selected: <b>{selectedFileName}</b>
                </span>
              </div>
            ) : (
              "Select any file. CSV/Excel will show preview."
            )}
          </div>


          {errorMessage && <div className="err">{errorMessage}</div>}
        </div>
      </div>

      {/* Preview + Search (CSV/Excel jusst) */}
      <div className="previewBlock">
        <div className="previewHead">
          <h4 className="previewTitle">Data Preview (CSV/Excel)</h4>

          <div className="searchPillLight">
            <span><FcSearch /></span>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search..."
              disabled={!tableRows.length}
            />
          </div>
        </div>

        {!tableRows.length ? (
          <div className="emptyBox">
            No preview available. (Upload CSV/Excel to see table preview.)
          </div>
        ) : (
          <div className="tableWrap">
            <table className="table  demoTable">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, PREVIEW_LIMIT).map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((col) => (
                      <td key={col}>{String(row[col] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRows.length > PREVIEW_LIMIT && (
              <div className="note">Showing first {PREVIEW_LIMIT} rows only.</div>
            )}
          </div>
        )}

        {/* Mode Switch */}
        <div className="modeSwitch">
          <button
            className={mode === "encrypt" ? "modeBtn active" : "modeBtn"}
            onClick={() => {
              setMode("encrypt");
              setEncryptSuccess(false);
              setDecryptSuccess(false);
              setErrorMessage("");
            }}
            disabled={isBusy}
            type="button"
          >
            Encrypt
          </button>

          <button
            className={mode === "decrypt" ? "modeBtn active" : "modeBtn"}
            onClick={() => {
              setMode("decrypt");
              setEncryptSuccess(false);
              setDecryptSuccess(false);
              setErrorMessage("");
            }}
            disabled={isBusy}
            type="button"
          >
            Decrypt
          </button>
        </div>

        {/* Action */}
        <div className="encryptRow">
          <button
            className="btnP big"
            disabled={!selectedFile || isBusy}
            onClick={mode === "encrypt" ? handleEncrypt : handleDecrypt}
          >
            {mode === "encrypt"
              ? isEncrypting
                ? "Encrypting..."
                : "Encrypt & Download"
              : isDecrypting
                ? "Decrypting..."
                : "Decrypt & Download"}
          </button>

          {encryptSuccess && mode === "encrypt" && (
            <div className="securityBox">
              <h4>Security Upgrade Summary</h4>

              <p>
                <b>Traditional Encryption (RSA only):</b> vulnerable to future quantum attacks
                (Shor’s algorithm).
              </p>

              <p>
                <b>Our Hybrid PQC Encryption:</b> RSA-3072 + ML-KEM-1024 (Kyber)
              </p>

              <p>
                <b>File Protection:</b> AES-256-GCM for fast and secure bulk encryption.
              </p>

              <p className="highlight">
                <GrCheckboxSelected color="green" size={18} /> Quantum-Resistant Key Establishment (NIST Category 5)
              </p>

              <small>
                Designed to protect against “harvest now, decrypt later” threats.
              </small>
            </div>
          )}


          {mode === "decrypt" && decryptSuccess && (
            <div className="successBox">
              <GrCheckboxSelected color="green" size={18} /> File Decrypted Successfully
              <div className="miniNote">Original file downloaded</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
