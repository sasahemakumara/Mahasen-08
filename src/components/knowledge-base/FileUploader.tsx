import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const FileUploader = ({ onUploadSuccess }: { onUploadSuccess: () => void }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      // Read and validate file content
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            if (!e.target?.result) {
              reject(new Error('Failed to read file content'));
              return;
            }
            
            // Clean and validate the text content
            const content = String(e.target.result)
              .replace(/\0/g, '') // Remove null bytes
              .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Remove invalid Unicode
              .trim();
            
            if (!content) {
              reject(new Error('File content is empty after cleaning'));
              return;
            }

            // Truncate content if too long (optional, adjust limit as needed)
            const truncatedContent = content.slice(0, 10000);
            
            resolve(truncatedContent);
          } catch (error) {
            reject(new Error('Error processing file content'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(selectedFile);
      });

      console.log('Cleaned text length:', text.length);
      console.log('First 100 characters:', text.substring(0, 100));
      
      // Generate embedding
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
        'generate-embedding',
        {
          body: { text }
        }
      );

      if (embeddingError) {
        console.error('Embedding error:', embeddingError);
        throw embeddingError;
      }

      if (!embeddingData?.embedding) {
        throw new Error('No embedding data received');
      }

      // Upload file to storage
      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("knowledge_base")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save file metadata and embedding to database
      const { error: dbError } = await supabase.from("knowledge_base_files").insert({
        filename: selectedFile.name,
        file_path: filePath,
        content_type: selectedFile.type,
        size: selectedFile.size,
        user_id: user.id,
        content: text,
        embedding: embeddingData.embedding
      });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      setSelectedFile(null);
      onUploadSuccess();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-6 mb-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Upload New File</h2>
      <div className="flex gap-4">
        <Input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          className="flex-1"
        />
        <Button
          onClick={handleFileUpload}
          disabled={!selectedFile || isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
};