import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Upload, Trash2, Eye, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

const LABEL_OPTIONS = ["Flight Ticket", "Hotel Voucher", "Tour Ticket", "Travel Insurance", "Visa", "Car Rental", "Other"];

const LABEL_COLORS = {
  "Flight Ticket": "bg-blue-50 text-blue-700",
  "Hotel Voucher": "bg-emerald-50 text-emerald-700",
  "Tour Ticket": "bg-purple-50 text-purple-700",
  "Travel Insurance": "bg-red-50 text-red-600",
  "Visa": "bg-amber-50 text-amber-700",
  "Car Rental": "bg-cyan-50 text-cyan-700",
  "Other": "bg-slate-100 text-slate-600",
};

export default function TripDocumentFolder({ trip, onTripUpdate }) {
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingLabel, setPendingLabel] = useState("Flight Ticket");
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileInputRef = useRef(null);
  const documents = trip?.documents || [];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!pendingFile || !trip?.id) return;
    setUploading(true);

    // Optimistic: add a placeholder doc immediately so UI feels instant
    const tempId = Date.now().toString();
    const tempDoc = {
      id: tempId,
      label: pendingLabel,
      filename: pendingFile.name,
      file_url: null,
      uploadedAt: new Date().toISOString(),
      uploading: true,
    };
    const optimistic = [...documents, tempDoc];
    onTripUpdate?.({ ...trip, documents: optimistic });
    setPendingFile(null);
    setUploading(false);

    // Upload in background
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pendingFile });
    const finalDoc = { ...tempDoc, file_url, uploading: false };
    const finalDocs = [...documents, finalDoc];
    await base44.entities.Trip.update(trip.id, { documents: finalDocs });
    onTripUpdate?.({ ...trip, documents: finalDocs });
  };

  const handleDelete = async (docId) => {
    const updated = documents.filter(d => d.id !== docId);
    await base44.entities.Trip.update(trip.id, { documents: updated });
    onTripUpdate?.({ ...trip, documents: updated });
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="w-5 h-5 text-primary" />
        <h4 className="font-inter font-semibold">My Documents</h4>
        {documents.length > 0 && (
          <Badge variant="secondary" className="rounded-lg text-xs">{documents.length}</Badge>
        )}
      </div>

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors mb-4"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground font-inter">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground font-inter mt-1">PDF, JPG, PNG accepted</p>
      </div>
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />

      {/* Pending file — label picker */}
      {pendingFile && (
        <div className="bg-secondary/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-inter font-medium truncate mr-2">{pendingFile.name}</p>
            <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {LABEL_OPTIONS.map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setPendingLabel(l)}
                className={`px-3 py-1 rounded-lg text-xs font-inter border transition-all ${pendingLabel === l ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={handleUpload} disabled={uploading} className="rounded-xl">
            {uploading ? "Uploading..." : "Save Document"}
          </Button>
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground font-inter text-center py-4">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 bg-card border rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <Badge className={`text-xs rounded-lg border-0 mb-1 ${LABEL_COLORS[doc.label] || LABEL_COLORS['Other']}`}>{doc.label}</Badge>
                <p className="text-sm font-inter font-medium truncate">{doc.filename}</p>
                <p className="text-xs text-muted-foreground font-inter">
                  {doc.uploadedAt ? format(new Date(doc.uploadedAt), 'MMM d, yyyy') : ''}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {doc.uploading ? (
                  <div className="h-8 w-8 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                ) : (
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => window.open(doc.file_url || doc.data, '_blank')}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                )}
                {!doc.uploading && deleteConfirm === doc.id ? (
                  <div className="flex gap-1 items-center">
                    <Button size="sm" variant="destructive" className="h-8 text-xs rounded-lg" onClick={() => handleDelete(doc.id)}>Delete</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                  </div>
                ) : !doc.uploading ? (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(doc.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}