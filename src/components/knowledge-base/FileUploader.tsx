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
            const result = e.target?.result;
            if (typeof result !== 'string') {
              reject(new Error('Failed to read file as text'));
              return;
            }

            // Ensure we have non-empty content
            const content = result.trim();
            console.log('Raw content length:', content.length);

            if (content.length === 0) {
              reject(new Error('File is empty'));
              return;
            }

            // Clean and validate the content
            const cleanedContent = String(content)
              .replace(/\0/g, '')
              .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
              .trim();

            if (cleanedContent.length === 0) {
              reject(new Error('File contains no valid text content'));
              return;
            }

            // Truncate content if too long
            const truncatedContent = cleanedContent.slice(0, 10000);
            console.log('Processed content length:', truncatedContent.length);
            console.log('Content sample:', truncatedContent.substring(0, 100));

            resolve(truncatedContent);
          } catch (error) {
            console.error('Error processing file:', error);
            reject(new Error('Failed to process file content'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(selectedFile);
      });

      // Generate embedding
      console.log('Requesting embedding generation...');
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