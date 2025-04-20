
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FileUpload } from "@/components/upload/FileUpload";
import { ProcessingOptions } from "@/components/upload/ProcessingOptions";

const UploadPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Upload & Process Data</h1>
          <p className="text-muted-foreground">
            Upload product data and configure AI processing options
          </p>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <FileUpload />
          <ProcessingOptions />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UploadPage;
