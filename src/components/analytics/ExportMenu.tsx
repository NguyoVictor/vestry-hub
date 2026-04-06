import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";

interface ExportMenuProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  onExportExcel?: () => void;
}

export function ExportMenu({ onExportCSV, onExportPDF, onExportExcel }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportCSV} className="gap-2">
          <File className="h-4 w-4" />Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPDF} className="gap-2">
          <FileText className="h-4 w-4" />Export as PDF
        </DropdownMenuItem>
        {onExportExcel && (
          <DropdownMenuItem onClick={onExportExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />Export as Excel
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
