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
          className="bg-[#244D42] text-white hover:bg-[#1C3E35] rounded-lg px-4 py-2 text-xs sm:text-sm font-medium shadow-sm transition-colors"
          data-testid={`button-add-${testIdPrefix}`}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {addButtonText}
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
          {/* Mobile: card layout */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {rows.map((row, index) => (
              <div key={index} className="p-4 space-y-3 bg-white">
                {columns.map((col) => (
                  <div key={col.key} className="flex flex-col">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{col.label}</span>
                    <span className="text-sm font-medium text-slate-800 mt-0.5">
                      {col.format ? (typeof col.format === 'function' ? col.format(row) : col.format(row[col.key])) : row[col.key]}
                    </span>
                  </div>
                ))}
                <div className="flex gap-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900"
                    data-testid={`button-edit-mobile-${index}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700"
                    data-testid={`button-delete-mobile-${index}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-slate-50/60 border-b border-slate-100">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-700"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="w-32 py-3 px-4 text-xs font-semibold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="py-3 px-4 text-sm text-slate-800">
                        {col.format ? (typeof col.format === 'function' ? col.format(row) : col.format(row[col.key])) : row[col.key]}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(index)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950 transition-colors"
                          data-testid={`button-edit-${index}`}
                        >
                          <Pencil className="h-3.5 w-3.5 text-slate-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(index)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                          data-testid={`button-delete-${index}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent 
          className={dialogClassName || "max-w-[95vw] sm:max-w-2xl max-h-[90vh] bg-white overflow-y-auto"}
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
