import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Save } from 'lucide-react';

interface FamilyNotesTabProps {
  family: any;
}

export default function FamilyNotesTab({ family }: FamilyNotesTabProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(family.notes || '');

  const saveMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const { error } = await supabase
        .from('families')
        .update({ notes: newNotes, updated_at: new Date().toISOString() } as any)
        .eq('id', family.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', family.id] });
      toast.success('Notes saved');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save notes');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(notes);
  };

  const lastUpdated = family.updated_at
    ? formatDistanceToNow(new Date(family.updated_at), { addSuffix: true })
    : 'Never';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1 font-jakarta">
          Pastoral Notes
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-jakarta">
          Private notes about this family for pastoral care purposes
        </p>
      </div>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about this family..."
        className="min-h-[300px] resize-none font-jakarta text-sm"
      />

      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-jakarta">
          Last updated {lastUpdated}
        </p>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Notes'}
        </Button>
      </div>
    </div>
  );
}
