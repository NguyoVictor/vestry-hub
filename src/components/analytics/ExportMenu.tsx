import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";

interface ExportMenuProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  onExportExcel?: () => void;
  readOnly?: boolean;
}

export function ExportMenu({ onExportCSV, onExportPDF, onExportExcel, readOnly = false }: ExportMenuProps) {
  const button = (
    <Button variant="outline" size="sm" className="gap-1.5" disabled={readOnly}>
      <Download className="h-4 w-4" />
      Export
    </Button>
  );

  if (readOnly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>You don't have permission to export data</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {button}
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
