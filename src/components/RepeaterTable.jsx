"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Pencil, Plus } from "lucide-react";

export function RepeaterTable({
  data = [],
  columns,
  onAdd,
  onEdit,
  onDelete,
  DialogComponent,
  addButtonText = "Add Entry",
  emptyMessage = "No entries added",
  testIdPrefix = "entry",
  dialogTitle,
  dialogSubtitle,
  dialogClassName,
  dialogProps = {},
}) {
  const rows = data || [];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAdd = () => {
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const handleSubmit = (data) => {
    if (editingIndex !== null) {
      onEdit(editingIndex, data);
    } else {
      onAdd(data);
    }
    setIsDialogOpen(false);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingIndex(null);
  };

  const handleDelete = (index) => {
    onDelete(index);
  };

  const handleOpenChange = (open) => {
    if (!open) {
      // Check if a Select dropdown is currently open
      const selectContent = document.querySelector('[data-radix-select-content][data-state="open"]');
      if (selectContent) {
        // Don't close if Select is open
        return;
      }
      setIsDialogOpen(false);
      setEditingIndex(null);
    } else {
      setIsDialogOpen(open);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleAdd}
          className="bg-primary text-primary-foreground"
          data-testid={`button-add-${testIdPrefix}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          {addButtonText}
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          {emptyMessage}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left py-3 px-4 text-sm font-medium"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-24 py-3 px-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-t border-border hover:bg-muted/30"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-4 text-sm">
                      {col.format ? (typeof col.format === 'function' ? col.format(row) : col.format(row[col.key])) : row[col.key]}
                    </td>
                  ))}
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(index)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`button-edit-${index}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                        data-testid={`button-delete-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent 
          className={dialogClassName || "max-w-2xl max-h-[90vh] bg-white overflow-y-auto"}
          onInteractOutside={(e) => {
            // Prevent closing when clicking on Select dropdowns
            const target = e.target;
            if (target?.closest('[role="listbox"]') || 
                target?.closest('[data-radix-select-content]') ||
                target?.closest('[data-radix-select-viewport]') ||
                target?.closest('[data-radix-select-item]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {dialogTitle || (editingIndex !== null ? "Edit Entry" : "Add Entry")}
            </DialogTitle>
            {dialogSubtitle && (
              <p className="text-sm text-muted-foreground mt-2">
                {dialogSubtitle}
              </p>
            )}
          </DialogHeader>
          <div className="overflow-visible">
            {DialogComponent && (
              <DialogComponent
                editingRow={editingIndex !== null ? rows[editingIndex] : null}
                onSave={handleSubmit}
                onCancel={handleCancel}
                {...dialogProps}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
