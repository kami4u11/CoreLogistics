import React, { memo } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

function MobileHeader({ title, backTo, onAdd, rightAction }) {
  return (
    <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {backTo && (
            <Link 
              to={createPageUrl(backTo)} 
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 transition-colors active:bg-slate-200"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Link>
          )}
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {rightAction}
          {onAdd && (
            <Button 
              onClick={onAdd} 
              size="sm" 
              className="rounded-xl bg-slate-900 hover:bg-slate-800 shadow-sm active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent updates
export default memo(MobileHeader);