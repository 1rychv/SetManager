"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import {
  Upload,
  Search,
  FileText,
  Image as ImageIcon,
  Music,
  FolderOpen,
  Download,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { createFileRecord, deleteFile } from "./actions";
import type { FileWithUploader, FileType } from "@/types";

function fileTypeIcon(type: FileType) {
  switch (type) {
    case "document":
      return <FileText className="w-5 h-5" />;
    case "image":
      return <ImageIcon className="w-5 h-5" />;
    case "audio":
      return <Music className="w-5 h-5" />;
  }
}

function fileTypeBg(type: FileType) {
  switch (type) {
    case "document":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "image":
      return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "audio":
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
  }
}

function detectFileType(filename: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext))
    return "image";
  if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext))
    return "audio";
  return "document";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const { user, profile } = useUser();
  const isOrganiser = profile?.role === "organiser";

  const [files, setFiles] = useState<FileWithUploader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | FileType>("all");

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<FileType>("document");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FileWithUploader | null>(
    null
  );

  async function fetchFiles() {
    const supabase = createClient();
    const { data } = await supabase
      .from("files")
      .select("*, profiles!files_uploader_id_fkey(name)")
      .order("created_at", { ascending: false });

    setFiles((data as FileWithUploader[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("files")
        .select("*, profiles!files_uploader_id_fkey(name)")
        .order("created_at", { ascending: false });

      if (!ignore) {
        setFiles((data as FileWithUploader[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesType = filterType === "all" || f.type === filterType;
    return matchesSearch && matchesType;
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name.replace(/\.[^/.]+$/, "")); // name without extension
    setFileType(detectFileType(file.name));
  }

  async function handleUpload() {
    if (!selectedFile || !user) return;

    setUploading(true);
    setUploadProgress(0);

    // Animate progress to 90%
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    const supabase = createClient();
    const timestamp = Date.now();
    const storagePath = `${user.id}/${timestamp}-${selectedFile.name}`;

    const { error: storageError } = await supabase.storage
      .from("files")
      .upload(storagePath, selectedFile);

    clearInterval(interval);

    if (storageError) {
      setUploadProgress(0);
      setUploading(false);
      toast.error(`Upload failed: ${storageError.message}`);
      return;
    }

    setUploadProgress(100);

    // Create DB record
    const displayName = fileName.trim() || selectedFile.name;
    const result = await createFileRecord({
      name: displayName,
      type: fileType,
      size: formatFileSize(selectedFile.size),
      storage_path: storagePath,
    });

    if (result.error) {
      // Clean up orphaned storage file
      await supabase.storage.from("files").remove([storagePath]);
      toast.error(result.error);
    } else {
      toast.success("File uploaded!");
      fetchFiles();
    }

    setUploading(false);
    setUploadProgress(0);
    setUploadOpen(false);
    setSelectedFile(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDownload(file: FileWithUploader) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("files")
      .createSignedUrl(file.storage_path, 60);

    if (error || !data?.signedUrl) {
      toast.error("Failed to generate download link.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const result = await deleteFile(deleteTarget.id, deleteTarget.storage_path);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("File deleted.");
      fetchFiles();
    }

    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 text-center text-muted-foreground">
        Loading files...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1>Files</h1>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "document", "image", "audio"] as const).map((type) => (
            <Button
              key={type}
              size="sm"
              variant={filterType === type ? "default" : "outline"}
              onClick={() => setFilterType(type)}
            >
              {type === "all"
                ? "All"
                : type.charAt(0).toUpperCase() + type.slice(1) + "s"}
            </Button>
          ))}
        </div>
      </div>

      {/* File List */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>
            {files.length === 0
              ? "No files uploaded yet"
              : "No files match your search"}
          </p>
          {files.length === 0 && (
            <p className="text-sm mt-1">Upload files to share with your team</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${fileTypeBg(file.type)}`}
              >
                {fileTypeIcon(file.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate" style={{ fontWeight: 500 }}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {file.size} &middot; {file.profiles?.name} &middot;{" "}
                  {format(new Date(file.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                {(isOrganiser || file.uploader_id === user?.id) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(file)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!uploading) {
            setUploadOpen(open);
            if (!open) {
              setSelectedFile(null);
              setFileName("");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Share a document, image, or audio file with your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </div>
            {selectedFile && (
              <>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="File name"
                    disabled={uploading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={fileType}
                    onValueChange={(v) => setFileType(v as FileType)}
                    disabled={uploading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-center text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
